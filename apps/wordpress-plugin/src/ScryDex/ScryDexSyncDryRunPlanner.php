<?php
/**
 * ScryDex sync dry-run planning.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexSyncDryRunPlanner {
	private const MAX_PAGE_SIZE = 100;

	public function __construct(
		private ?ScryDexProviderFactory $provider_factory = null,
		private ?ScryDexSyncPlanner $sync_planner = null
	) {
		$this->provider_factory = $this->provider_factory ?? new ScryDexProviderFactory();
		$this->sync_planner     = $this->sync_planner ?? new ScryDexSyncPlanner();
	}

	/**
	 * @param array<string, mixed> $request Dry-run request settings.
	 * @return array<string, mixed>
	 */
	public function plan_cards_sync( array $request = array() ): array {
		$provider_readiness   = $this->provider_factory->readiness_summary();
		$game                 = $this->resource_key( $request['game'] ?? 'pokemon', 'pokemon' );
		$checkpoint_row       = is_array( $request['checkpoint'] ?? null ) ? $request['checkpoint'] : array();
		$expansion_id         = $this->expansion_id_from_request( $request, $checkpoint_row, $game );
		$checkpoint_key       = '' === $expansion_id ? $game : $game . ':' . $expansion_id;
		$page_size            = $this->page_size( $request['page_size'] ?? 100 );
		$checkpoint           = $this->checkpoint( $request['checkpoint'] ?? null, $checkpoint_key );
		$next_request         = $this->sync_planner->next_cards_request( $checkpoint, $page_size );
		$next_request['game'] = $game;
		if ( '' !== $expansion_id ) {
			$next_request['expansion_id'] = $expansion_id;
		}
		$configured = true === ( $provider_readiness['configured'] ?? false );

		return array(
			'status'                        => $configured ? 'ready' : 'blocked',
			'dry_run'                       => true,
			'provider_ready'                => $configured,
			'provider_status'               => $provider_readiness['status'] ?? 'blocked',
			'provider_class'                => $provider_readiness['provider_class'] ?? ScryDexHttpProvider::class,
			'provider_context_ready'        => true === ( $provider_readiness['provider_context_ready'] ?? false ),
			'credential_values_redacted'    => true,
			'provider_method'               => '' === $expansion_id ? 'search_cards' : 'search_expansion_cards',
			'provider_endpoint'             => '' === $expansion_id
				? '/' . $game . '/v1/cards'
				: '/' . $game . '/v1/expansions/' . $expansion_id . '/cards',
			'request'                       => $next_request,
			'checkpoint_row'                => $checkpoint->to_row(),
			'network_requests_deferred'     => true,
			'database_writes_deferred'      => true,
			'persistence_planning_deferred' => true,
			'scheduled_workers_deferred'    => true,
			'image_downloads_deferred'      => true,
			'webhook_registration_deferred' => true,
			'configuration_issues'          => $this->configuration_issues( $provider_readiness ),
		);
	}

	private function checkpoint( mixed $value, string $resource_key ): ScryDexSyncCheckpoint {
		if ( is_array( $value ) && 'cards' === (string) ( $value['resource_type'] ?? '' ) ) {
			return ScryDexSyncCheckpoint::from_row( $value );
		}

		return ScryDexSyncCheckpoint::initial( 0, 'cards', $resource_key );
	}

	private function resource_key( mixed $value, string $fallback ): string {
		$value = strtolower( trim( (string) $value ) );

		return 1 === preg_match( '/^[a-z0-9_-]{1,64}$/', $value ) ? $value : $fallback;
	}

	private function provider_resource_id( mixed $value ): string {
		$value = trim( (string) $value );
		$value = preg_replace( '/[^A-Za-z0-9_:-]+/', '-', $value ) ?? '';
		$value = trim( $value, '-' );

		return 1 === preg_match( '/^[A-Za-z0-9_:-]{1,191}$/', $value ) ? $value : '';
	}

	/**
	 * @param array<string, mixed> $request Request parameters.
	 * @param array<string, mixed> $checkpoint_row Checkpoint row parameters.
	 */
	private function expansion_id_from_request( array $request, array $checkpoint_row, string $game ): string {
		$expansion_id = $this->provider_resource_id( $request['expansion_id'] ?? '' );
		if ( '' !== $expansion_id ) {
			return $expansion_id;
		}

		$resource_key = trim( (string) ( $checkpoint_row['resource_key'] ?? '' ) );
		$prefix       = $game . ':';
		if ( str_starts_with( $resource_key, $prefix ) ) {
			return $this->provider_resource_id( substr( $resource_key, strlen( $prefix ) ) );
		}

		return '';
	}

	private function page_size( mixed $value ): int {
		return max( 1, min( self::MAX_PAGE_SIZE, (int) $value ) );
	}

	/**
	 * @param array<string, mixed> $provider_readiness Provider readiness.
	 * @return list<string>
	 */
	private function configuration_issues( array $provider_readiness ): array {
		$issues = $provider_readiness['configuration_issues'] ?? array();

		if ( ! is_array( $issues ) ) {
			return array();
		}

		return array_values(
			array_filter(
				array_map(
					static fn ( mixed $issue ): string => is_scalar( $issue ) ? trim( (string) $issue ) : '',
					$issues
				),
				static fn ( string $issue ): bool => '' !== $issue
			)
		);
	}
}
