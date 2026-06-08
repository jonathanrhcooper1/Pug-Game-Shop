<?php
/**
 * ScryDex sync execution readiness gate.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexSyncExecutionGate {
	private const DEFAULT_GATES = array(
		'network_requests_enabled'          => false,
		'usage_budget_configured'           => false,
		'checkpoint_repository_configured'  => false,
		'persistence_repository_configured' => false,
		'database_writes_enabled'           => false,
		'scheduled_worker_configured'       => false,
	);

	private const GATE_BLOCK_REASONS = array(
		'network_requests_enabled'          => 'scrydex_network_requests_disabled',
		'usage_budget_configured'           => 'scrydex_usage_budget_not_configured',
		'checkpoint_repository_configured'  => 'scrydex_checkpoint_repository_not_configured',
		'persistence_repository_configured' => 'scrydex_persistence_repository_not_configured',
		'database_writes_enabled'           => 'scrydex_database_writes_disabled',
		'scheduled_worker_configured'       => 'scrydex_scheduled_worker_not_configured',
	);

	public function __construct(
		private ?ScryDexSyncDryRunPlanner $dry_run_planner = null
	) {
		$this->dry_run_planner = $this->dry_run_planner ?? new ScryDexSyncDryRunPlanner();
	}

	/**
	 * @param array<string, mixed> $request Dry-run request.
	 * @param array<string, mixed> $gate_overrides Gate overrides for controlled tests/staging.
	 * @return array<string, mixed>
	 */
	public function plan_cards_worker( array $request = array(), array $gate_overrides = array() ): array {
		$dry_run = $this->dry_run_planner->plan_cards_sync( $request );
		$gates   = $this->gates( $gate_overrides );
		$reasons = $this->block_reasons( $dry_run, $gates );
		$ready   = array() === $reasons;

		return array(
			'status'                            => $ready ? 'ready' : ( true === $dry_run['provider_ready'] ? 'gated' : 'blocked' ),
			'action'                            => 'scrydex_cards_sync_worker_execution_gate',
			'worker_resource'                   => 'cards',
			'provider_method'                   => $dry_run['provider_method'],
			'provider_endpoint'                 => $dry_run['provider_endpoint'],
			'request'                           => $dry_run['request'],
			'checkpoint_row'                    => $dry_run['checkpoint_row'],
			'dry_run_plan'                      => $dry_run,
			'provider_ready'                    => true === $dry_run['provider_ready'],
			'provider_status'                   => $dry_run['provider_status'],
			'credential_values_redacted'        => true,
			'page_processor_ready'              => method_exists( ScryDexSyncPageProcessor::class, 'process_cards_page' ),
			'persistence_planner_ready'         => method_exists( ScryDexPersistencePlanner::class, 'plan_page' ),
			'network_requests_enabled'          => $gates['network_requests_enabled'],
			'usage_budget_configured'           => $gates['usage_budget_configured'],
			'checkpoint_repository_configured'  => $gates['checkpoint_repository_configured'],
			'persistence_repository_configured' => $gates['persistence_repository_configured'],
			'database_writes_enabled'           => $gates['database_writes_enabled'],
			'scheduled_worker_configured'       => $gates['scheduled_worker_configured'],
			'worker_execution_deferred'         => ! $ready,
			'network_requests_deferred'         => ! $gates['network_requests_enabled'],
			'database_writes_deferred'          => ! $gates['database_writes_enabled'],
			'image_downloads_deferred'          => true,
			'webhook_registration_deferred'     => true,
			'configuration_issues'              => $this->configuration_issues( $dry_run, $reasons ),
			'block_reasons'                     => $reasons,
		);
	}

	/**
	 * @param array<string, mixed> $gate_overrides Gate overrides.
	 * @return array<string, bool>
	 */
	private function gates( array $gate_overrides ): array {
		$gates = self::DEFAULT_GATES;

		foreach ( $gate_overrides as $key => $value ) {
			if ( array_key_exists( $key, $gates ) ) {
				$gates[ $key ] = true === $value;
			}
		}

		return $gates;
	}

	/**
	 * @param array<string, mixed> $dry_run Dry-run plan.
	 * @param array<string, bool>  $gates Gate state.
	 * @return list<string>
	 */
	private function block_reasons( array $dry_run, array $gates ): array {
		$reasons = array();

		if ( true !== ( $dry_run['provider_ready'] ?? false ) ) {
			$reasons[] = 'scrydex_provider_not_configured';
		}

		foreach ( $gates as $gate => $enabled ) {
			if ( ! $enabled ) {
				$reasons[] = self::GATE_BLOCK_REASONS[ $gate ] ?? 'scrydex_' . $gate . '_blocked';
			}
		}

		return array_values( array_unique( $reasons ) );
	}

	/**
	 * @param array<string, mixed> $dry_run Dry-run plan.
	 * @param list<string>        $block_reasons Block reasons.
	 * @return list<string>
	 */
	private function configuration_issues( array $dry_run, array $block_reasons ): array {
		$issues = $dry_run['configuration_issues'] ?? array();

		if ( ! is_array( $issues ) ) {
			$issues = array();
		}

		return array_values(
			array_unique(
				array_filter(
					array_merge(
						array_map(
							static fn ( mixed $issue ): string => is_scalar( $issue ) ? trim( (string) $issue ) : '',
							$issues
						),
						$block_reasons
					),
					static fn ( string $issue ): bool => '' !== $issue
				)
			)
		);
	}
}
