<?php
/**
 * Offline route bootstrap status presentation.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class OfflineRouteBootstrapStatusPresenter {
	private OfflineRouteBootstrapPlanner $planner;

	public function __construct( ?OfflineRouteBootstrapPlanner $planner = null ) {
		$this->planner = $planner ?? new OfflineRouteBootstrapPlanner();
	}

	/**
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @return array<string, mixed>
	 */
	public function health_payload( bool $offline_feature_enabled, ?array $route_contracts = null ): array {
		return $this->payload_from_plan(
			$this->planner->plan( $offline_feature_enabled, $route_contracts )
		);
	}

	/**
	 * @param array<string, array<string, mixed>> $route_plans Planned route registrations.
	 * @return array<string, mixed>
	 */
	public function health_payload_from_registration_args( bool $offline_feature_enabled, array $route_plans ): array {
		return $this->payload_from_plan(
			$this->planner->plan_from_registration_args( $offline_feature_enabled, $route_plans )
		);
	}

	/**
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @return array{value:string,status:string}
	 */
	public function admin_summary( bool $offline_feature_enabled, ?array $route_contracts = null ): array {
		return $this->admin_summary_from_payload(
			$this->health_payload( $offline_feature_enabled, $route_contracts )
		);
	}

	/**
	 * @param array<string, mixed> $payload Health payload.
	 * @return array{value:string,status:string}
	 */
	private function admin_summary_from_payload( array $payload ): array {
		$reasons = $this->list_values( $payload['bootstrap_block_reasons'] ?? array() );
		$details = array() === $reasons ? 'ready' : 'blocked: ' . implode( ', ', $reasons );

		return array(
			'value'  => sprintf(
				'%d / %d registerable; %s',
				(int) $payload['registerable_route_count'],
				(int) $payload['planned_route_count'],
				$details
			),
			'status' => (string) $payload['status'],
		);
	}

	/**
	 * @param array<string, mixed> $plan Bootstrap plan.
	 * @return array<string, mixed>
	 */
	private function payload_from_plan( array $plan ): array {
		return array(
			'status'                     => $this->status_from_plan( $plan ),
			'feature_enabled'            => true === $plan['feature_enabled'],
			'planned_route_count'        => (int) $plan['planned_route_count'],
			'registerable_route_count'   => (int) $plan['registerable_route_count'],
			'should_register_routes'     => true === $plan['should_register_routes'],
			'registration_deferred'      => true !== $plan['should_register_routes'],
			'bootstrap_block_reasons'    => $this->list_values( $plan['bootstrap_block_reasons'] ?? array() ),
			'registerable_route_keys'    => $this->list_values( $plan['registerable_route_keys'] ?? array() ),
			'route_registration_summary' => is_array( $plan['route_registration_summary'] ?? null )
				? $plan['route_registration_summary']
				: array(),
		);
	}

	/**
	 * @param array<string, mixed> $plan Bootstrap plan.
	 */
	private function status_from_plan( array $plan ): string {
		if ( true === $plan['should_register_routes'] ) {
			return 'ready';
		}

		if ( true !== $plan['feature_enabled'] ) {
			return 'blocked';
		}

		return 'gated';
	}

	/**
	 * @return list<string>
	 */
	private function list_values( mixed $values ): array {
		if ( ! is_array( $values ) ) {
			return array();
		}

		return array_values(
			array_filter(
				array_map(
					static fn ( mixed $value ): string => ( is_array( $value ) || is_object( $value ) )
						? ''
						: trim( (string) $value ),
					$values
				),
				static fn ( string $value ): bool => '' !== $value
			)
		);
	}
}
