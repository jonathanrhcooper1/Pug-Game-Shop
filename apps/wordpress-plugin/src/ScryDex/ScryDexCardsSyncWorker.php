<?php
/**
 * ScryDex cards sync worker execution shell.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexCardsSyncWorker {
	private const MAX_PAGES_LIMIT = 25;

	public function __construct(
		private string $table_prefix = '',
		private ?ScryDexProviderFactory $provider_factory = null,
		private ?ScryDexSyncExecutionGate $execution_gate = null,
		private ?ScryDexCardsSyncWorkerPlanner $page_planner = null
	) {
		$this->table_prefix     = trim( $this->table_prefix );
		$this->provider_factory = $this->provider_factory ?? new ScryDexProviderFactory();
		$this->execution_gate   = $this->execution_gate ?? new ScryDexSyncExecutionGate(
			new ScryDexSyncDryRunPlanner( $this->provider_factory )
		);
		$this->page_planner     = $this->page_planner ?? new ScryDexCardsSyncWorkerPlanner(
			$this->table_prefix,
			$this->execution_gate
		);
	}

	/**
	 * @param array<string, mixed>        $request Sync request settings.
	 * @param list<array<string, mixed>> $existing_reference_rows Current reference rows for change detection.
	 * @param array<string, mixed>        $gate_overrides Gate overrides for controlled tests/staging.
	 * @return array<string, mixed>
	 */
	public function run_cards_pages(
		array $request = array(),
		array $existing_reference_rows = array(),
		array $gate_overrides = array()
	): array {
		$max_pages              = $this->max_pages( $request['max_pages'] ?? 1 );
		$current_request        = $request;
		$execute_database_writes = true === ( $request['execute_database_writes'] ?? false );
		$pages                  = array();
		$provider               = null;
		$provider_request_count = 0;
		$status                 = 'completed';
		$continuation_available = false;
		$next_checkpoint_row    = null;
		$block_reasons          = array();
		$last_gate              = null;

		for ( $index = 0; $index < $max_pages; ++$index ) {
			$gate      = $this->execution_gate->plan_cards_worker( $current_request, $gate_overrides );
			$last_gate = $gate;

			if ( 'ready' !== ( $gate['status'] ?? '' ) ) {
				$status        = 'blocked';
				$block_reasons = $this->string_list( $gate['block_reasons'] ?? array() );
				break;
			}

			$provider_request = $this->provider_request( $gate['request'] ?? array() );
			$provider         = $provider ?? $this->provider_factory->provider();
			$provider_result  = $provider->search_cards(
				'',
				array(
					'game'      => $provider_request['resource_key'],
					'page_size' => (string) $provider_request['page_size'],
				),
				$provider_request['page'],
				$provider_request['cursor']
			);

			++$provider_request_count;

			$page_plan           = $this->page_planner->plan_cards_page(
				$current_request,
				$provider_result,
				$existing_reference_rows,
				$gate_overrides,
				$execute_database_writes
			);
			$next_checkpoint_row = $this->next_checkpoint_row( $page_plan );
			$pages[]             = $this->page_summary( $index + 1, $provider_request, $provider_result, $page_plan );

			if ( ! in_array( (string) ( $page_plan['status'] ?? '' ), array( 'planned', 'executed' ), true ) ) {
				$status        = (string) ( $page_plan['status'] ?? 'blocked' );
				$block_reasons = $this->string_list( $page_plan['block_reasons'] ?? array() );
				break;
			}

			$continuation_available = $this->should_continue(
				$provider_result->body(),
				$provider_request,
				$next_checkpoint_row
			);

			if ( ! $continuation_available ) {
				$status = 'completed';
				break;
			}

			$current_request = array_merge(
				$current_request,
				array(
					'game'       => $provider_request['resource_key'],
					'page_size'  => $provider_request['page_size'],
					'checkpoint' => $next_checkpoint_row,
				)
			);
			$status          = 'page_limit_reached';
		}

		if ( $continuation_available && count( $pages ) >= $max_pages && 'planned' !== $status ) {
			$status = 'page_limit_reached';
		}

		return array(
			'status'                              => $status,
			'action'                              => 'scrydex_cards_sync_worker_run',
			'worker_resource'                     => 'cards',
			'max_pages'                           => $max_pages,
			'page_count'                          => count( $pages ),
			'provider_request_count'              => $provider_request_count,
			'provider_fetch_deferred'             => 0 === $provider_request_count,
			'network_requests_deferred'           => 0 === $provider_request_count,
			'database_writes_deferred'            => $this->database_writes_deferred( $pages ),
			'reference_card_writes_deferred'      => $this->reference_card_writes_deferred( $pages ),
			'checkpoint_upsert_execution_deferred' => $this->checkpoint_writes_deferred( $pages ),
			'execute_database_writes_requested'   => $execute_database_writes,
			'provider_result_bodies_not_logged'   => true,
			'credential_values_redacted'          => true,
			'continuation_available'              => $continuation_available,
			'continuation_checkpoint_row'         => $continuation_available ? $next_checkpoint_row : null,
			'last_checkpoint_row'                 => $next_checkpoint_row,
			'execution_gate'                      => $last_gate,
			'pages'                               => $pages,
			'block_reasons'                       => array_values( array_unique( $block_reasons ) ),
			'configuration_issues'                => $this->configuration_issues( $last_gate, $block_reasons ),
		);
	}

	/**
	 * @param list<array<string, mixed>> $pages Worker page summaries.
	 */
	private function database_writes_deferred( array $pages ): bool {
		return $this->all_page_flag_deferred( $pages, 'database_writes_deferred' );
	}

	/**
	 * @param list<array<string, mixed>> $pages Worker page summaries.
	 */
	private function reference_card_writes_deferred( array $pages ): bool {
		return $this->all_page_flag_deferred( $pages, 'reference_card_writes_deferred' );
	}

	/**
	 * @param list<array<string, mixed>> $pages Worker page summaries.
	 */
	private function checkpoint_writes_deferred( array $pages ): bool {
		return $this->all_page_flag_deferred( $pages, 'checkpoint_upsert_execution_deferred' );
	}

	/**
	 * @param list<array<string, mixed>> $pages Worker page summaries.
	 */
	private function all_page_flag_deferred( array $pages, string $flag ): bool {
		if ( array() === $pages ) {
			return true;
		}

		foreach ( $pages as $page ) {
			if ( true !== ( $page['orchestration_plan'][ $flag ] ?? true ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * @param array<string, mixed> $request Planned request.
	 * @return array{resource_key:string,page:int,page_size:int,cursor:string}
	 */
	private function provider_request( mixed $request ): array {
		$request = is_array( $request ) ? $request : array();

		return array(
			'resource_key' => $this->resource_key( $request['resource_key'] ?? 'pokemon' ),
			'page'         => max( 1, (int) ( $request['page'] ?? 1 ) ),
			'page_size'    => max( 1, min( 250, (int) ( $request['page_size'] ?? 100 ) ) ),
			'cursor'       => trim( (string) ( $request['cursor'] ?? '' ) ),
		);
	}

	/**
	 * @param array<string, mixed> $page_plan Orchestration page plan.
	 * @return array<string, mixed>|null
	 */
	private function next_checkpoint_row( array $page_plan ): ?array {
		$row = $page_plan['page_plan']['next_checkpoint_row'] ?? null;

		return is_array( $row ) ? $row : null;
	}

	/**
	 * @param array{resource_key:string,page:int,page_size:int,cursor:string} $provider_request Provider request.
	 * @param array<string, mixed>                                           $page_plan Orchestration page plan.
	 * @return array<string, mixed>
	 */
	private function page_summary(
		int $index,
		array $provider_request,
		ScryDexResult $provider_result,
		array $page_plan
	): array {
		return array(
			'index'                         => $index,
			'provider_request'              => $provider_request,
			'provider_result_status'        => $provider_result->status(),
			'provider_result_http_status'   => $provider_result->http_status(),
			'provider_result_error_code'    => $provider_result->error_code(),
			'provider_result_body_received' => array() !== $provider_result->body(),
			'provider_result_body_logged'   => false,
			'orchestration_plan'            => $page_plan,
		);
	}

	/**
	 * @param array<string, mixed>                       $body Provider response body.
	 * @param array{resource_key:string,page:int,page_size:int,cursor:string} $provider_request Provider request.
	 * @param array<string, mixed>|null                  $next_checkpoint_row Next checkpoint row.
	 */
	private function should_continue( array $body, array $provider_request, ?array $next_checkpoint_row ): bool {
		if ( ! is_array( $next_checkpoint_row ) ) {
			return false;
		}

		$cursor = trim( (string) ( $next_checkpoint_row['cursor_value'] ?? '' ) );
		if ( '' !== $cursor ) {
			return true;
		}

		$has_more = $this->first_scalar_from_paths(
			$body,
			array(
				array( 'has_more' ),
				array( 'hasMore' ),
				array( 'pagination', 'has_more' ),
				array( 'pagination', 'hasMore' ),
				array( 'meta', 'has_more' ),
				array( 'meta', 'hasMore' ),
			)
		);

		if ( $this->truthy( $has_more ) ) {
			return true;
		}

		$total_pages = $this->positive_int(
			$this->first_scalar_from_paths(
				$body,
				array(
					array( 'total_pages' ),
					array( 'totalPages' ),
					array( 'pagination', 'total_pages' ),
					array( 'pagination', 'totalPages' ),
					array( 'meta', 'total_pages' ),
					array( 'meta', 'totalPages' ),
				)
			)
		);

		return null !== $total_pages && $provider_request['page'] < $total_pages;
	}

	private function max_pages( mixed $value ): int {
		return max( 1, min( self::MAX_PAGES_LIMIT, (int) $value ) );
	}

	private function resource_key( mixed $value ): string {
		$value = strtolower( trim( (string) $value ) );
		$value = preg_replace( '/[^a-z0-9_-]+/', '-', $value ) ?? $value;
		$value = trim( $value, '-' );

		return '' === $value ? 'pokemon' : $value;
	}

	private function truthy( mixed $value ): bool {
		if ( true === $value ) {
			return true;
		}

		if ( is_scalar( $value ) ) {
			return in_array( strtolower( trim( (string) $value ) ), array( '1', 'true', 'yes' ), true );
		}

		return false;
	}

	private function positive_int( mixed $value ): ?int {
		if ( is_int( $value ) && 0 < $value ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && 0 < (int) $value ) {
			return (int) $value;
		}

		return null;
	}

	/**
	 * @param array<string, mixed> $source Source array.
	 * @param list<list<string>>   $paths Candidate lookup paths.
	 */
	private function first_scalar_from_paths( array $source, array $paths ): mixed {
		foreach ( $paths as $path ) {
			$value = $source;

			foreach ( $path as $segment ) {
				if ( ! is_array( $value ) || ! array_key_exists( $segment, $value ) ) {
					continue 2;
				}

				$value = $value[ $segment ];
			}

			if ( is_scalar( $value ) && '' !== trim( (string) $value ) ) {
				return $value;
			}
		}

		return null;
	}

	/**
	 * @return list<string>
	 */
	private function configuration_issues( ?array $gate, array $block_reasons ): array {
		$issues = is_array( $gate['configuration_issues'] ?? null ) ? $gate['configuration_issues'] : array();

		return array_values(
			array_unique(
				array_merge(
					$this->string_list( $issues ),
					$this->string_list( $block_reasons )
				)
			)
		);
	}

	/**
	 * @return list<string>
	 */
	private function string_list( mixed $values ): array {
		if ( ! is_array( $values ) ) {
			return array();
		}

		return array_values(
			array_filter(
				array_map(
					static fn ( mixed $value ): string => is_scalar( $value ) ? trim( (string) $value ) : '',
					$values
				),
				static fn ( string $value ): bool => '' !== $value
			)
		);
	}
}
