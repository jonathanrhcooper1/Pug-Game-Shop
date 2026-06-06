<?php
/**
 * Manager override persistence payload planner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Overrides;

final class ManagerOverridePersistencePlanner {
	/**
	 * @param array<string, mixed> $context Optional inventory/order/location context.
	 */
	public function plan(
		ManagerOverrideRequest $request,
		ManagerOverrideDecision $decision,
		array $context = array()
	): ManagerOverridePersistencePlan {
		if ( ! $decision->is_accepted() ) {
			return ManagerOverridePersistencePlan::skip( 'override_rejected' );
		}

		if ( ! $decision->requires_override_row() ) {
			return ManagerOverridePersistencePlan::skip( 'override_row_not_required' );
		}

		$row_data = array(
			'public_id'        => trim( (string) ( $context['public_id'] ?? '' ) ),
			'override_type'    => 'below_minimum_sale',
			'inventory_id'     => $this->optional_positive_int( $context['inventory_id'] ?? null ),
			'employee_user_id' => $request->employee_user_id(),
			'manager_user_id'  => $request->manager_user_id(),
			'original_price'   => $this->format_minor_units( $request->original_price_minor_units() ),
			'override_price'   => $this->format_minor_units( $request->override_price_minor_units() ),
			'currency'         => $request->currency(),
			'reason'           => $request->reason(),
			'cart_id'          => trim( (string) ( $context['cart_id'] ?? '' ) ),
			'order_id'         => $this->optional_positive_int( $context['order_id'] ?? null ),
			'location_id'      => $this->optional_positive_int( $context['location_id'] ?? null ),
			'expires_at'       => trim( (string) ( $context['expires_at'] ?? '' ) ),
			'used_at'          => null,
			'created_at'       => trim( (string) ( $context['created_at'] ?? '' ) ),
		);

		$audit_data = array(
			'action'              => 'manager_override.approved',
			'override_type'       => $row_data['override_type'],
			'inventory_id'        => $row_data['inventory_id'],
			'employee_user_id'    => $row_data['employee_user_id'],
			'manager_user_id'     => $row_data['manager_user_id'],
			'original_price'      => $row_data['original_price'],
			'override_price'      => $row_data['override_price'],
			'minimum_sale_price'  => $this->format_minor_units( $request->minimum_sale_price_minor_units() ),
			'currency'            => $row_data['currency'],
			'reason_hash'         => hash( 'sha256', $row_data['reason'] ),
			'decision_code'       => $decision->code(),
			'order_id'            => $row_data['order_id'],
			'location_id'         => $row_data['location_id'],
		);

		return ManagerOverridePersistencePlan::persist( $row_data, $audit_data );
	}

	private function optional_positive_int( mixed $value ): ?int {
		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		return null;
	}

	private function format_minor_units( int $amount ): string {
		$negative = $amount < 0;
		$amount   = abs( $amount );
		$whole    = intdiv( $amount, 100 );
		$fraction = $amount % 100;
		$prefix   = $negative ? '-' : '';

		return sprintf( '%s%d.%04d', $prefix, $whole, $fraction * 100 );
	}
}
