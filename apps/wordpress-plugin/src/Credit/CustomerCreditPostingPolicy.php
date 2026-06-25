<?php
/**
 * Customer credit ledger posting policy.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Credit;

final class CustomerCreditPostingPolicy {
	public function preview(
		string $entry_type,
		string $amount,
		string $balance_before,
		bool $manager_approved = false
	): CustomerCreditPostingDecision {
		if ( ! CustomerCreditEntryType::is_valid( $entry_type ) ) {
			return CustomerCreditPostingDecision::rejected(
				'invalid_entry_type',
				'Customer credit entry type is invalid.',
				$entry_type
			);
		}

		$amount_units = $this->parse_units( $amount );
		$before_units = $this->parse_units( $balance_before );

		if ( null === $amount_units || 0 === $amount_units ) {
			return CustomerCreditPostingDecision::rejected(
				'invalid_amount',
				'Customer credit amount must be a non-zero decimal value.',
				$entry_type
			);
		}

		if ( null === $before_units || $before_units < 0 ) {
			return CustomerCreditPostingDecision::rejected(
				'invalid_balance',
				'Customer credit balance must be zero or greater.',
				$entry_type
			);
		}

		$manager_required = CustomerCreditEntryType::requires_manager_approval( $entry_type );

		if ( $manager_required && ! $manager_approved ) {
			return CustomerCreditPostingDecision::rejected(
				'manager_approval_required',
				'Customer credit entry requires manager approval.',
				$entry_type
			);
		}

		$signed_amount_units = $this->signed_amount_units( $entry_type, $amount_units );
		$after_units         = $before_units + $signed_amount_units;

		if ( $after_units < 0 ) {
			return CustomerCreditPostingDecision::rejected(
				'insufficient_credit',
				'Customer credit balance cannot go negative.',
				$entry_type
			);
		}

		return CustomerCreditPostingDecision::accepted(
			$entry_type,
			$this->format_units( $signed_amount_units ),
			$this->format_units( $before_units ),
			$this->format_units( $after_units ),
			$manager_required
		);
	}

	private function signed_amount_units( string $entry_type, int $amount_units ): int {
		$absolute_units = abs( $amount_units );

		return match ( CustomerCreditEntryType::typical_sign( $entry_type ) ) {
			'positive' => $absolute_units,
			'negative' => -$absolute_units,
			default => $amount_units,
		};
	}

	private function parse_units( string $amount ): ?int {
		$amount = trim( $amount );

		if ( 1 !== preg_match( '/^-?\d+(?:\.\d{1,4})?$/', $amount ) ) {
			return null;
		}

		$negative = str_starts_with( $amount, '-' );
		$amount   = ltrim( $amount, '-' );
		$parts    = explode( '.', $amount, 2 );
		$whole    = (int) $parts[0];
		$fraction = str_pad( $parts[1] ?? '', 4, '0' );
		$units    = ( $whole * 10000 ) + (int) substr( $fraction, 0, 4 );

		return $negative ? -$units : $units;
	}

	private function format_units( int $units ): string {
		$negative = $units < 0;
		$units    = abs( $units );
		$whole    = intdiv( $units, 10000 );
		$fraction = $units % 10000;
		$prefix   = $negative ? '-' : '';

		return sprintf( '%s%d.%04d', $prefix, $whole, $fraction );
	}
}
