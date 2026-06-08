<?php
/**
 * ScryDex sync dry-run planning.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexSyncDryRunPlanner {
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
		$provider_readiness = $this->provider_factory->readiness_summary();
		$game               = $this->resource_key( $request['game'] ?? 'pokemon', 'pokemon' );
		$page_size          = $this->page_size( $request['page_size'] ?? 100 );
		$checkpoint         = $this->checkpoint( $request['checkpoint'] ?? null, $game );
		$next_request       = $this->sync_planner->next_cards_request( $checkpoint, $page_size );
		$configured         = true === ( $provider_readiness['configured'] ?? false );

		return array(
			'status'                        => $configured ? 'ready' : 'blocked',
			'dry_run'                       => true,
			'provider_ready'                => $configured,
			'provider_status'               => $provider_readiness['status'] ?? 'blocked',
			'provider_class'                => $provider_readiness['provider_class'] ?? ScryDexHttpProvider::class,
			'provider_context_ready'        => true === ( $provider_readiness['provider_context_ready'] ?? false ),
			'credential_values_redacted'    => true,
			'provider_method'               => 'search_cards',
			'provider_endpoint'             => '/cards/search',
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

	private function checkpoint( mixed $value, string $game ): ScryDexSyncCheckpoint {
		if ( is_array( $value ) && 'cards' === (string) ( $value['resource_type'] ?? '' ) ) {
			return ScryDexSyncCheckpoint::from_row( $value );
		}

		return ScryDexSyncCheckpoint::initial( 0, 'cards', $game );
	}

	private function resource_key( mixed $value, string $fallback ): string {
		$value = strtolower( trim( (string) $value ) );

		return 1 === preg_match( '/^[a-z0-9_-]{2,64}$/', $value ) ? $value : $fallback;
	}

	private function page_size( mixed $value ): int {
		return max( 1, min( 250, (int) $value ) );
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
