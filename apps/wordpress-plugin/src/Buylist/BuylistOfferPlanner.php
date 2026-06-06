<?php
/**
 * Plans buylist offers before live staff write APIs are enabled.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Buylist;

final class BuylistOfferPlanner {
	private const UNIT_SCALE = 10000;

	/**
	 * @param array<string, mixed>        $submission Buylist submission row.
	 * @param list<array<string, mixed>> $items Reviewed item rows.
	 * @param array<string, mixed>        $options Planning options.
	 */
	public function plan( array $submission, array $items, array $options = array() ): BuylistOfferPlan {
		$errors        = array();
		$submission_id = $this->positive_int( $submission['submission_id'] ?? null );
		$status        = $this->clean_string( $submission['status'] ?? '' );
		$currency      = $this->currency( $submission['currency'] ?? $options['currency'] ?? 'USD' );

		if ( null === $submission_id ) {
			$errors[] = 'submission_id_required';
		}

		if ( BuylistSubmissionStatus::UNDER_REVIEW !== $status ) {
			$errors[] = 'submission_not_ready_for_offer';
		}

		if ( array() === $items ) {
			$errors[] = 'items_required';
		}

		$item_offers        = array();
		$approval_requests  = array();
		$total_cash_units   = 0;
		$total_credit_units = 0;

		foreach ( $items as $index => $item ) {
			$item_offer = $this->item_offer_payload( $item, $index, $currency, $errors );

			if ( null === $item_offer ) {
				continue;
			}

			$item_offers[]       = $item_offer;
			$total_cash_units   += $this->decimal_units( $item_offer['cash_offer'] );
			$total_credit_units += $this->decimal_units( $item_offer['credit_offer'] );

			$approval_requests = array_merge(
				$approval_requests,
				$this->item_approval_requests( $item_offer, $options )
			);
		}

		if ( 0 === $total_cash_units && 0 === $total_credit_units && array() !== $items ) {
			$errors[] = 'offer_amount_required';
		}

		$approval_requests = array_merge(
			$approval_requests,
			$this->submission_approval_requests( $total_cash_units, $total_credit_units, $currency, $options )
		);

		if ( array() !== $errors ) {
			return BuylistOfferPlan::from_parts( array(), array(), array(), array_values( array_unique( $errors ) ) );
		}

		$target_status = array() === $approval_requests
			? BuylistSubmissionStatus::OFFERED
			: BuylistSubmissionStatus::OFFER_PENDING_APPROVAL;

		$offer_payload = array(
			'submission_id'              => $submission_id,
			'target_submission_status'   => $target_status,
			'total_cash_offer'           => $this->format_units( $total_cash_units ),
			'total_credit_offer'         => $this->format_units( $total_credit_units ),
			'currency'                   => $currency,
			'offer_version'              => max( 1, (int) ( $submission['offer_version'] ?? 1 ) ),
			'requires_manager_approval'  => array() !== $approval_requests,
			'expires_at'                 => $this->nullable_string( $options['expires_at'] ?? null ),
			'offer_fingerprint'          => $this->offer_fingerprint( $submission_id, $item_offers ),
		);

		return BuylistOfferPlan::from_parts( $offer_payload, $item_offers, $approval_requests, array() );
	}

	/**
	 * @param array<string, mixed> $item Reviewed item row.
	 * @param list<string>        $errors Validation errors.
	 * @return array<string, mixed>|null
	 */
	private function item_offer_payload( array $item, int $index, string $currency, array &$errors ): ?array {
		$item_id           = $this->positive_int( $item['buylist_item_id'] ?? null );
		$quantity          = $this->positive_int( $item['quantity'] ?? 1 );
		$accepted_quantity = $this->positive_int( $item['accepted_quantity'] ?? $quantity );
		$cash_units        = $this->money_units( $item['cash_offer'] ?? '0.0000', "items_{$index}_cash_offer", $errors );
		$credit_units      = $this->money_units(
			$item['credit_offer'] ?? '0.0000',
			"items_{$index}_credit_offer",
			$errors
		);

		if ( null === $item_id ) {
			$errors[] = "items_{$index}_buylist_item_id_required";
		}

		if ( null === $quantity ) {
			$errors[] = "items_{$index}_quantity_required";
		}

		if ( null === $accepted_quantity ) {
			$errors[] = "items_{$index}_accepted_quantity_required";
		}

		if ( null !== $quantity && null !== $accepted_quantity && $accepted_quantity > $quantity ) {
			$errors[] = "items_{$index}_accepted_quantity_exceeds_quantity";
		}

		if ( null === $item_id || null === $quantity || null === $accepted_quantity ) {
			return null;
		}

		return array(
			'buylist_item_id'   => $item_id,
			'quantity'          => $quantity,
			'accepted_quantity' => $accepted_quantity,
			'cash_offer'        => $this->format_units( $cash_units ),
			'credit_offer'      => $this->format_units( $credit_units ),
			'currency'          => $currency,
			'review_status'     => 'offered',
		);
	}

	/**
	 * @param array<string, mixed> $item_offer Planned item offer.
	 * @param array<string, mixed> $options Planning options.
	 * @return list<array<string, mixed>>
	 */
	private function item_approval_requests( array $item_offer, array $options ): array {
		$requests         = array();
		$cash_threshold   = $this->threshold_units( $options['item_cash_approval_threshold'] ?? null );
		$credit_threshold = $this->threshold_units( $options['item_credit_approval_threshold'] ?? null );
		$cash_units       = $this->decimal_units( $item_offer['cash_offer'] );
		$credit_units     = $this->decimal_units( $item_offer['credit_offer'] );

		if ( null !== $cash_threshold && $cash_units > $cash_threshold ) {
			$requests[] = $this->approval_request( 'item', 'item_cash_threshold', $item_offer, $cash_threshold );
		}

		if ( null !== $credit_threshold && $credit_units > $credit_threshold ) {
			$requests[] = $this->approval_request( 'item', 'item_credit_threshold', $item_offer, $credit_threshold );
		}

		return $requests;
	}

	/**
	 * @param array<string, mixed> $options Planning options.
	 * @return list<array<string, mixed>>
	 */
	private function submission_approval_requests(
		int $cash_units,
		int $credit_units,
		string $currency,
		array $options
	): array {
		$requests         = array();
		$cash_threshold   = $this->threshold_units( $options['cash_approval_threshold'] ?? null );
		$credit_threshold = $this->threshold_units( $options['credit_approval_threshold'] ?? null );

		if ( null !== $cash_threshold && $cash_units > $cash_threshold ) {
			$requests[] = array(
				'scope'           => 'submission',
				'reason'          => 'cash_total_threshold',
				'observed_value'  => $this->format_units( $cash_units ),
				'threshold_value' => $this->format_units( $cash_threshold ),
				'currency'        => $currency,
			);
		}

		if ( null !== $credit_threshold && $credit_units > $credit_threshold ) {
			$requests[] = array(
				'scope'           => 'submission',
				'reason'          => 'credit_total_threshold',
				'observed_value'  => $this->format_units( $credit_units ),
				'threshold_value' => $this->format_units( $credit_threshold ),
				'currency'        => $currency,
			);
		}

		return $requests;
	}

	/**
	 * @param array<string, mixed> $item_offer Planned item offer.
	 * @return array<string, mixed>
	 */
	private function approval_request(
		string $scope,
		string $reason,
		array $item_offer,
		int $threshold_units
	): array {
		$observed_value = 'item_cash_threshold' === $reason
			? $item_offer['cash_offer']
			: $item_offer['credit_offer'];

		return array(
			'scope'           => $scope,
			'reason'          => $reason,
			'buylist_item_id' => $item_offer['buylist_item_id'],
			'observed_value'  => $observed_value,
			'threshold_value' => $this->format_units( $threshold_units ),
			'currency'        => $item_offer['currency'],
		);
	}

	private function money_units( mixed $value, string $field, array &$errors ): int {
		$value = $this->clean_string( $value );

		if ( '' === $value ) {
			return 0;
		}

		if ( 1 !== preg_match( '/^\d+(?:\.\d{1,4})?$/', $value ) ) {
			$errors[] = $field . '_invalid';

			return 0;
		}

		return $this->decimal_units( $value );
	}

	private function decimal_units( mixed $value ): int {
		$value = $this->clean_string( $value );
		$parts = explode( '.', $value, 2 );
		$whole = (int) ( $parts[0] ?? '0' );
		$frac  = str_pad( substr( (string) ( $parts[1] ?? '' ), 0, 4 ), 4, '0' );

		return ( $whole * self::UNIT_SCALE ) + (int) $frac;
	}

	private function threshold_units( mixed $value ): ?int {
		if ( null === $value || '' === $value ) {
			return null;
		}

		$value = $this->clean_string( $value );

		return 1 === preg_match( '/^\d+(?:\.\d{1,4})?$/', $value ) ? $this->decimal_units( $value ) : null;
	}

	private function format_units( int $units ): string {
		$whole = intdiv( $units, self::UNIT_SCALE );
		$frac  = $units % self::UNIT_SCALE;

		return sprintf( '%d.%04d', $whole, $frac );
	}

	private function currency( mixed $value ): string {
		$value = strtoupper( $this->clean_string( $value ) );

		return 1 === preg_match( '/^[A-Z]{3}$/', $value ) ? $value : 'USD';
	}

	private function positive_int( mixed $value ): ?int {
		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		return null;
	}

	private function nullable_string( mixed $value ): ?string {
		$value = $this->clean_string( $value ?? '' );

		return '' === $value ? null : $value;
	}

	private function clean_string( mixed $value ): string {
		return trim( (string) $value );
	}

	/**
	 * @param list<array<string, mixed>> $item_offers Planned item offer payloads.
	 */
	private function offer_fingerprint( int $submission_id, array $item_offers ): string {
		if ( function_exists( 'wp_json_encode' ) ) {
			$encoded = wp_json_encode( $item_offers );
		} else {
			$encoded = json_encode( $item_offers );
		}

		return hash( 'sha256', (string) $submission_id . '|' . (string) $encoded );
	}
}
