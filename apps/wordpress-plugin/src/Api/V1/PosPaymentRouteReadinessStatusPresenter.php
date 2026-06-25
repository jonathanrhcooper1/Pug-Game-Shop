<?php
/**
 * Presentation helpers for staged POS/payment route readiness.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Square\SquarePaymentDelegationPolicy;

final class PosPaymentRouteReadinessStatusPresenter {
	private PosPaymentRouteReadinessPlanner $planner;

	public function __construct( ?PosPaymentRouteReadinessPlanner $planner = null ) {
		$this->planner = $planner ?? new PosPaymentRouteReadinessPlanner();
	}

	/**
	 * @return array<string, mixed>
	 */
	public function health_payload( bool $pos_payments_feature_enabled ): array {
		return $this->planner->plan( $pos_payments_feature_enabled );
	}

	/**
	 * @return array{value:string,status:string}
	 */
	public function admin_summary( bool $pos_payments_feature_enabled ): array {
		$payload = $this->health_payload( $pos_payments_feature_enabled );
		$reasons = $this->list_values( $payload['route_readiness_block_reasons'] ?? array() );
		$details = array() === $reasons ? 'ready' : 'blocked: ' . implode( ', ', $reasons );

		return array(
			'value'  => sprintf(
				'%d / %d registerable; %s; handlers %s; permissions %s; transactions %s; webhooks %s; capture %s; inventory %s; gateway %s; Square payments %s; Square extension %s',
				(int) ( $payload['registerable_route_count'] ?? 0 ),
				(int) ( $payload['planned_route_count'] ?? 0 ),
				$details,
				( true === ( $payload['route_handlers_configured'] ?? false ) ) ? 'ready' : 'not ready',
				( true === ( $payload['permission_callbacks_configured'] ?? false ) ) ? 'ready' : 'not ready',
				( true === ( $payload['route_transaction_executor_configured'] ?? false ) ) ? 'ready' : 'deferred',
				( true === ( $payload['webhook_verifier_configured'] ?? false ) ) ? 'ready' : 'not ready',
				( true === ( $payload['provider_capture_deferred'] ?? false ) ) ? 'deferred' : 'enabled',
				( true === ( $payload['provider_inventory_write_deferred'] ?? false ) ) ? 'deferred' : 'enabled',
				( true === ( $payload['woocommerce_gateway_capture_deferred'] ?? false ) ) ? 'deferred' : 'enabled',
				SquarePaymentDelegationPolicy::status_label(),
				(string) ( $payload['official_woocommerce_square_extension_status'] ?? 'blocked' )
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
