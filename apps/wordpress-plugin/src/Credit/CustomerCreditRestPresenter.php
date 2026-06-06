<?php
/**
 * Customer credit REST response presenter.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Credit;

use TCGStorePlatform\Logging\Redactor;

final class CustomerCreditRestPresenter {
	/**
	 * @param array<string, mixed> $customer Customer row.
	 * @return array<string, mixed>
	 */
	public static function present_balance( array $customer ): array {
		return array(
			'data' => array(
				'customer_id'  => self::positive_int( $customer['customer_id'] ?? null ),
				'public_id'    => self::nullable_string( $customer['public_id'] ?? null ),
				'display_name' => self::clean_string( $customer['display_name'] ?? '' ),
				'status'       => self::clean_string( $customer['status'] ?? 'active' ),
				'credit'       => array(
					'balance'  => self::money( $customer['credit_balance'] ?? '0.0000' ),
					'currency' => self::currency( $customer['credit_currency'] ?? 'USD' ),
					'version'  => self::nonnegative_int( $customer['credit_version'] ?? 0 ),
				),
				'row_version'  => self::nonnegative_int( $customer['row_version'] ?? 0 ),
				'updated_at'   => self::nullable_string( $customer['updated_at'] ?? null ),
			),
			'meta' => array(
				'resource' => 'customer_credit_balance',
			),
		);
	}

	/**
	 * @param list<array<string, mixed>> $entries Ledger rows.
	 * @return array<string, mixed>
	 */
	public static function present_ledger(
		array $entries,
		int $page = 1,
		int $page_size = 50,
		?string $next_cursor = null
	): array {
		return array(
			'data'   => array_map(
				static fn ( array $entry ): array => self::present_ledger_entry( $entry ),
				$entries
			),
			'paging' => array(
				'page'        => max( 1, $page ),
				'page_size'   => max( 1, $page_size ),
				'count'       => count( $entries ),
				'next_cursor' => self::nullable_string( $next_cursor ),
			),
			'meta'   => array(
				'resource' => 'customer_credit_ledger',
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function present_posting_result(
		CustomerCreditPostingResult $result,
		int $customer_id,
		string $currency = 'USD'
	): array {
		return array(
			'data' => array(
				'accepted'        => $result->is_accepted(),
				'code'            => $result->code(),
				'message'         => $result->message(),
				'idempotent'      => $result->is_idempotent(),
				'customer_id'     => max( 0, $customer_id ),
				'ledger_entry_id' => $result->ledger_entry_id(),
				'balance_after'   => array(
					'amount'   => self::money( $result->balance_after() ),
					'currency' => self::currency( $currency ),
				),
			),
			'meta' => array(
				'resource' => 'customer_credit_posting',
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public static function present_validation_errors(
		CustomerCreditRestPostingValidationResult $validation
	): array {
		return array(
			'error' => array(
				'code'    => 'validation_failed',
				'message' => 'Customer credit request validation failed.',
				'details' => array(
					'errors' => $validation->errors(),
				),
			),
		);
	}

	/**
	 * @param array<string, mixed> $entry Ledger row.
	 * @return array<string, mixed>
	 */
	private static function present_ledger_entry( array $entry ): array {
		return array(
			'ledger_entry_id'       => self::positive_int( $entry['credit_ledger_id'] ?? null ),
			'public_id'             => self::nullable_string( $entry['public_id'] ?? null ),
			'customer_id'           => self::positive_int( $entry['customer_id'] ?? null ),
			'entry_type'            => self::clean_string( $entry['entry_type'] ?? '' ),
			'amount'                => self::money( $entry['amount'] ?? '0.0000' ),
			'currency'              => self::currency( $entry['currency'] ?? 'USD' ),
			'balance_before'        => self::money( $entry['balance_before'] ?? '0.0000' ),
			'balance_after'         => self::money( $entry['balance_after'] ?? '0.0000' ),
			'related_ledger_id'     => self::nullable_positive_int( $entry['related_ledger_id'] ?? null ),
			'idempotency_key'       => self::nullable_string( $entry['idempotency_key'] ?? null ),
			'actor_user_id'         => self::nullable_positive_int( $entry['actor_user_id'] ?? null ),
			'manager_user_id'       => self::nullable_positive_int( $entry['manager_user_id'] ?? null ),
			'order_id'              => self::nullable_positive_int( $entry['order_id'] ?? null ),
			'buylist_submission_id' => self::nullable_positive_int( $entry['buylist_submission_id'] ?? null ),
			'location_id'           => self::nullable_positive_int( $entry['location_id'] ?? null ),
			'offline_operation_id'  => self::nullable_string( $entry['offline_operation_id'] ?? null ),
			'reason'                => self::nullable_string( $entry['reason'] ?? null ),
			'metadata'              => Redactor::redact( self::metadata( $entry ) ),
			'created_at'            => self::nullable_string( $entry['created_at'] ?? null ),
		);
	}

	/**
	 * @param array<string, mixed> $entry Ledger row.
	 * @return array<string, mixed>
	 */
	private static function metadata( array $entry ): array {
		if ( isset( $entry['metadata'] ) && is_array( $entry['metadata'] ) ) {
			return $entry['metadata'];
		}

		$json = self::clean_string( $entry['metadata_json'] ?? '' );

		if ( '' === $json ) {
			return array();
		}

		$decoded = json_decode( $json, true );

		return is_array( $decoded ) ? $decoded : array();
	}

	private static function positive_int( mixed $value ): int {
		return max( 0, (int) $value );
	}

	private static function nullable_positive_int( mixed $value ): ?int {
		if ( null === $value || '' === $value ) {
			return null;
		}

		$value = (int) $value;

		return $value > 0 ? $value : null;
	}

	private static function nonnegative_int( mixed $value ): int {
		return max( 0, (int) $value );
	}

	private static function money( mixed $value ): string {
		$value = self::clean_string( $value );

		if ( 1 !== preg_match( '/^-?\d+(?:\.\d+)?$/', $value ) ) {
			return '0.0000';
		}

		return number_format( (float) $value, 4, '.', '' );
	}

	private static function currency( mixed $value ): string {
		$value = strtoupper( self::clean_string( $value ) );

		return 1 === preg_match( '/^[A-Z]{3}$/', $value ) ? $value : 'USD';
	}

	private static function clean_string( mixed $value ): string {
		return trim( (string) $value );
	}

	private static function nullable_string( mixed $value ): ?string {
		$value = self::clean_string( $value ?? '' );

		return '' === $value ? null : $value;
	}

	private function __construct() {
	}
}
