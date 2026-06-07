<?php
/**
 * Presentation helpers for staged offline device pairing route readiness.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class OfflineDevicePairingRouteReadinessStatusPresenter {
	private OfflineDevicePairingRouteReadinessPlanner $planner;

	public function __construct( ?OfflineDevicePairingRouteReadinessPlanner $planner = null ) {
		$this->planner = $planner ?? new OfflineDevicePairingRouteReadinessPlanner();
	}

	/**
	 * @return array<string, mixed>
	 */
	public function health_payload( bool $offline_feature_enabled ): array {
		return $this->planner->plan( $offline_feature_enabled );
	}

	/**
	 * @return array{value:string,status:string}
	 */
	public function admin_summary( bool $offline_feature_enabled ): array {
		$payload = $this->health_payload( $offline_feature_enabled );
		$reasons = $this->list_values( $payload['registration_block_reasons'] ?? array() );
		$details = array() === $reasons ? 'ready' : 'blocked: ' . implode( ', ', $reasons );

		return array(
			'value'  => sprintf(
				'handler %s; permission %s; policy %s; %s',
				true === ( $payload['controller_callback_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['permission_callback_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['policy_configured'] ?? false ) ? 'ready' : 'not ready',
				$details
			),
			'status' => (string) ( $payload['status'] ?? 'blocked' ),
		);
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
