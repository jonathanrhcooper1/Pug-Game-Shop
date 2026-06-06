<?php
/**
 * Manager override authorization policy.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Overrides;

final class ManagerOverridePolicy {
	public function authorize_below_minimum_sale( ManagerOverrideRequest $request ): ManagerOverrideDecision {
		if (
			$request->original_price_minor_units() < 0
			|| $request->override_price_minor_units() < 0
			|| $request->minimum_sale_price_minor_units() < 0
		) {
			return ManagerOverrideDecision::rejected( 'invalid_amount', 'Override amounts must be non-negative.' );
		}

		if ( 3 !== strlen( $request->currency() ) ) {
			return ManagerOverrideDecision::rejected( 'invalid_currency', 'Override currency must be three letters.' );
		}

		if ( $request->override_price_minor_units() >= $request->minimum_sale_price_minor_units() ) {
			return ManagerOverrideDecision::accepted(
				'override_not_required',
				'Requested sale price meets the minimum sale price.',
				false
			);
		}

		if ( $request->employee_user_id() <= 0 ) {
			return ManagerOverrideDecision::rejected( 'invalid_employee', 'Employee user ID is required.' );
		}

		if ( $request->manager_user_id() <= 0 ) {
			return ManagerOverrideDecision::rejected(
				'missing_manager_approval',
				'Below-minimum sale requires manager approval.'
			);
		}

		if ( $request->manager_user_id() === $request->employee_user_id() ) {
			return ManagerOverrideDecision::rejected(
				'manager_must_be_distinct',
				'Manager approval must come from a different user.'
			);
		}

		if ( '' === $request->reason() ) {
			return ManagerOverrideDecision::rejected(
				'missing_reason',
				'Below-minimum manager override requires a reason.'
			);
		}

		return ManagerOverrideDecision::accepted(
			'manager_override_approved',
			'Below-minimum sale was approved by a manager.',
			true
		);
	}
}
