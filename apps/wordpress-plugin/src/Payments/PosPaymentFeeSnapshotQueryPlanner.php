<?php
/**
 * Plan-only POS/payment fee snapshot read queries.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Payments;

use DateTimeImmutable;
use Exception;

final class PosPaymentFeeSnapshotQueryPlanner {
	private const TABLE            = 'tcg_payment_fee_snapshots';
	private const DEFAULT_LIMIT    = 50;
	private const MAX_LIMIT        = 100;
	private const SELECTED_COLUMNS = array(
		'payment_fee_snapshot_id',
		'public_id',
		'provider',
		'channel',
		'currency',
		'percentage_basis_points',
		'fixed_fee_minor_units',
		'platform_fee_minor_units',
		'effective_from',
		'effective_to',
		'source_note',
		'source_url',
		'last_verified_at',
		'updated_at',
		'row_version',
	);
	private const ORDER_BY         = array(
		'effective_from'          => 'DESC',
		'payment_fee_snapshot_id' => 'DESC',
	);

	/**
	 * @param array<string, mixed> $params Query parameters.
	 */
	public function plan( array $params, string $table_prefix ): PosPaymentFeeSnapshotQueryPlan {
		$errors       = array();
		$table_prefix = trim( $table_prefix );

		if ( '' === $table_prefix || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix ) ) {
			$errors[] = 'table_prefix_invalid';
		}

		$provider     = $this->optional_slugish( $params['provider'] ?? '' );
		$channel      = $this->optional_slugish( $params['channel'] ?? '' );
		$currency     = $this->optional_currency( $params['currency'] ?? '' );
		$effective_on = $this->optional_date( $params['effective_on'] ?? ( $params['active_on'] ?? '' ) );
		$limit        = $this->bounded_limit( $params['page_size'] ?? ( $params['limit'] ?? self::DEFAULT_LIMIT ) );

		if ( null === $provider ) {
			$errors[] = 'provider_invalid';
			$provider = '';
		}

		if ( null === $channel ) {
			$errors[] = 'channel_invalid';
			$channel  = '';
		}

		if ( null === $currency ) {
			$errors[] = 'currency_invalid';
			$currency = '';
		}

		if ( null === $effective_on ) {
			$errors[]     = 'effective_on_invalid';
			$effective_on = '';
		}

		if ( null === $limit ) {
			$errors[] = 'limit_invalid';
			$limit    = self::DEFAULT_LIMIT;
		}

		$filters = array(
			'provider'     => $provider,
			'channel'      => $channel,
			'currency'     => $currency,
			'effective_on' => $effective_on,
		);

		if ( array() !== $errors ) {
			return PosPaymentFeeSnapshotQueryPlan::rejected( $filters, $errors );
		}

		return PosPaymentFeeSnapshotQueryPlan::accepted(
			$table_prefix,
			$table_prefix . self::TABLE,
			$filters,
			self::SELECTED_COLUMNS,
			self::ORDER_BY,
			$limit
		);
	}

	private function optional_slugish( mixed $value ): ?string {
		$value = $this->string_value( $value );

		if ( '' === $value ) {
			return '';
		}

		return 1 === preg_match( '/^[a-z0-9_-]{1,64}$/', $value ) ? $value : null;
	}

	private function optional_currency( mixed $value ): ?string {
		$value = strtoupper( $this->string_value( $value ) );

		if ( '' === $value ) {
			return '';
		}

		return 1 === preg_match( '/^[A-Z]{3}$/', $value ) ? $value : null;
	}

	private function optional_date( mixed $value ): ?string {
		$value = $this->string_value( $value );

		if ( '' === $value ) {
			return '';
		}

		if ( 1 !== preg_match( '/^\d{4}-\d{2}-\d{2}$/', $value ) ) {
			return null;
		}

		try {
			$date = new DateTimeImmutable( $value );
		} catch ( Exception ) {
			return null;
		}

		return $date->format( 'Y-m-d' ) === $value ? $value : null;
	}

	private function bounded_limit( mixed $value ): ?int {
		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			$value = (int) $value;
		}

		if ( ! is_int( $value ) || 0 >= $value ) {
			return null;
		}

		return min( self::MAX_LIMIT, $value );
	}

	private function string_value( mixed $value ): string {
		if ( is_array( $value ) || is_object( $value ) ) {
			return '';
		}

		return trim( (string) $value );
	}
}
