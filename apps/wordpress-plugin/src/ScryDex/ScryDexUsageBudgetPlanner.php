<?php
/**
 * ScryDex usage budget planning.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

use TCGStorePlatform\Settings\ScryDexUsageBudgetSettings;
use TCGStorePlatform\Settings\Settings;

final class ScryDexUsageBudgetPlanner {
	private const MAX_PAGE_SIZE = 100;

	/**
	 * @param array<string, mixed>|null $settings Full platform settings or budget settings.
	 */
	public function __construct(
		private ?array $settings = null
	) {
	}

	/**
	 * @param array<string, mixed>      $request Planned ScryDex request.
	 * @param array<string, mixed>|null $usage_snapshot Optional already-fetched usage data.
	 * @return array<string, mixed>
	 */
	public function plan_cards_page( array $request = array(), ?array $usage_snapshot = null ): array {
		return $this->plan_provider_request_batch( $request, $usage_snapshot, 1 );
	}

	/**
	 * @param array<string, mixed>      $request Planned ScryDex request.
	 * @param array<string, mixed>|null $usage_snapshot Optional already-fetched usage data.
	 * @return array<string, mixed>
	 */
	public function plan_provider_request_batch(
		array $request = array(),
		?array $usage_snapshot = null,
		int $planned_provider_request_count = 1
	): array {
		$status        = ScryDexUsageBudgetSettings::public_status( $this->settings() );
		$configured    = true === ( $status['configured'] ?? false );
		$request_count = $this->planned_request_count( $planned_provider_request_count );
		$cost_each     = (int) $status['per_cards_page_credit_estimate'];
		$cost          = $cost_each * $request_count;
		$snapshot      = null === $usage_snapshot || array() === $usage_snapshot ? null : $this->normalize_snapshot( $usage_snapshot );
		$block_reasons = $this->block_reasons( $status, $snapshot, $cost );
		$allowed       = $configured && array() === $block_reasons;

		return array(
			'status'                           => $allowed ? 'ready' : 'blocked',
			'action'                           => 'scrydex_cards_usage_budget_plan',
			'provider_method'                  => 'get_usage',
			'provider_endpoint'                => '/account/v1/usage',
			'request'                          => $this->request_summary( $request ),
			'budget_configured'                => $configured,
			'usage_snapshot_provided'          => null !== $snapshot,
			'usage_snapshot_required'          => true,
			'usage_snapshot_max_age_minutes'   => (int) $status['usage_snapshot_max_age_minutes'],
			'provider_usage_requests_deferred' => true,
			'network_requests_deferred'        => true,
			'estimated_credit_cost'            => $cost,
			'estimated_credit_cost_per_request' => $cost_each,
			'planned_provider_request_count'   => $request_count,
			'daily_credit_budget'              => (int) $status['daily_credit_budget'],
			'minimum_remaining_credits'        => (int) $status['minimum_remaining_credits'],
			'remaining_after_estimate'         => null === $snapshot
				? null
				: max( 0, $snapshot['remaining_credits'] - $cost ),
			'usage_snapshot'                   => $snapshot,
			'configuration_issues'             => $this->configuration_issues( $status ),
			'block_reasons'                    => $block_reasons,
		);
	}

	/**
	 * @param array<string, mixed>      $status Public budget status.
	 * @param array<string, mixed>|null $snapshot Usage snapshot.
	 * @return list<string>
	 */
	private function block_reasons( array $status, ?array $snapshot, int $cost ): array {
		$reasons = array();

		if ( true !== ( $status['configured'] ?? false ) ) {
			$reasons[] = 'scrydex_usage_budget_not_configured';
		}

		if ( null !== $snapshot ) {
			$daily   = (int) ( $status['daily_credit_budget'] ?? 0 );
			$minimum = (int) ( $status['minimum_remaining_credits'] ?? 0 );

			if ( $daily > 0 && ( $snapshot['used_today'] + $cost ) > $daily ) {
				$reasons[] = 'scrydex_daily_credit_budget_exceeded';
			}

			if ( ( $snapshot['remaining_credits'] - $cost ) < $minimum ) {
				$reasons[] = 'scrydex_remaining_credit_floor_reached';
			}
		}

		return array_values( array_unique( $reasons ) );
	}

	/**
	 * @param array<string, mixed> $snapshot Usage snapshot.
	 * @return array<string, mixed>
	 */
	private function normalize_snapshot( array $snapshot ): array {
		return array(
			'used_today'            => max(
				0,
				(int) ( $snapshot['used_today'] ?? ( $snapshot['used_credits'] ?? ( $snapshot['usedCredits'] ?? 0 ) ) )
			),
			'remaining_credits'     => max(
				0,
				(int) ( $snapshot['remaining_credits'] ?? ( $snapshot['remainingCredits'] ?? 0 ) )
			),
			'snapshot_recorded_at'  => $this->scalar_string( $snapshot['snapshot_recorded_at'] ?? '' ),
			'usage_window_start_at' => $this->scalar_string( $snapshot['usage_window_start_at'] ?? '' ),
		);
	}

	/**
	 * @param array<string, mixed> $request Planned ScryDex request.
	 * @return array<string, mixed>
	 */
	private function request_summary( array $request ): array {
		return array(
			'provider'                       => $this->scalar_string( $request['provider'] ?? ScryDexSyncCheckpoint::PROVIDER ),
			'resource_type'                  => $this->scalar_string( $request['resource_type'] ?? 'cards' ),
			'resource_key'                   => $this->scalar_string( $request['resource_key'] ?? 'pokemon' ),
			'page'                           => max( 1, (int) ( $request['page'] ?? 1 ) ),
			'page_size'                      => max( 1, min( self::MAX_PAGE_SIZE, (int) ( $request['page_size'] ?? 100 ) ) ),
			'planned_provider_request_count' => $this->planned_request_count( $request['planned_provider_request_count'] ?? 1 ),
		);
	}

	/**
	 * @param array<string, mixed> $status Budget status.
	 * @return list<string>
	 */
	private function configuration_issues( array $status ): array {
		$issues = $status['configuration_issues'] ?? array();

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

	private function scalar_string( mixed $value ): string {
		return is_scalar( $value ) ? trim( (string) $value ) : '';
	}

	private function planned_request_count( mixed $value ): int {
		return max( 1, min( 1000, (int) $value ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function settings(): array {
		return $this->settings ?? Settings::all();
	}
}
