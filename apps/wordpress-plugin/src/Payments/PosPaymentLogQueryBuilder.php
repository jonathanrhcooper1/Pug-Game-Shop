<?php
/**
 * POS/payment log SQL template builder.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Payments;

use DateTimeImmutable;
use DateTimeZone;
use Exception;

final class PosPaymentLogQueryBuilder {
	private const POS_SYNC_TABLE              = 'tcg_pos_sync_log';
	private const PAYMENT_PROVIDER_TABLE      = 'tcg_payment_provider_log';
	private const POS_SYNC_COLUMNS            = array(
		'public_id',
		'provider',
		'provider_location_id',
		'external_transaction_id',
		'external_order_id',
		'external_line_item_id',
		'inventory_item_id',
		'barcode',
		'reconciliation_status',
		'result_code',
		'result_details_json',
		'idempotency_key',
		'occurred_at',
		'received_at',
		'reconciled_at',
		'created_at',
		'updated_at',
		'row_version',
	);
	private const PAYMENT_PROVIDER_COLUMNS    = array(
		'public_id',
		'provider',
		'channel',
		'operation',
		'woo_order_id',
		'external_transaction_id',
		'external_payment_id',
		'external_refund_id',
		'amount_minor_units',
		'currency',
		'status',
		'masked_request_json',
		'masked_response_json',
		'idempotency_key',
		'occurred_at',
		'received_at',
		'created_at',
		'updated_at',
		'row_version',
	);
	private const POS_RECONCILIATION_STATUSES = array( 'pending', 'reconciled', 'conflict', 'rejected', 'replayed' );
	private const PAYMENT_OPERATIONS          = array( 'authorize', 'capture', 'refund', 'void', 'webhook' );

	public function build( PosPaymentLogPlan $log_plan, string $table_prefix ): PosPaymentLogQueryBuildPlan {
		$errors       = array();
		$table_prefix = trim( $table_prefix );

		if ( '' === $table_prefix || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix ) ) {
			$errors[] = 'table_prefix_invalid';
		}

		if ( PosPaymentLogPlan::FAILED === $log_plan->status() ) {
			$errors[] = 'source_plan_failed';
		}

		$table_names = $this->table_names( $table_prefix );

		$pos_sync_queries = array();
		foreach ( $log_plan->pos_sync_rows() as $index => $row ) {
			$row_errors = $this->validate_pos_sync_row( $row, $index );

			if ( array() !== $row_errors ) {
				$errors = array_merge( $errors, $row_errors );
				continue;
			}

			$pos_sync_queries[] = $this->pos_sync_query_for_row( $table_names['pos_sync_log'], $row );
		}

		$payment_provider_queries = array();
		foreach ( $log_plan->payment_provider_rows() as $index => $row ) {
			$row_errors = $this->validate_payment_provider_row( $row, $index );

			if ( array() !== $row_errors ) {
				$errors = array_merge( $errors, $row_errors );
				continue;
			}

			$payment_provider_queries[] = $this->payment_provider_query_for_row( $table_names['payment_provider_log'], $row );
		}

		if ( array() !== $errors ) {
			return PosPaymentLogQueryBuildPlan::rejected( $log_plan, $table_names, $errors );
		}

		return PosPaymentLogQueryBuildPlan::accepted(
			$log_plan,
			$table_names,
			$pos_sync_queries,
			$payment_provider_queries
		);
	}

	/**
	 * @return array<string, string>
	 */
	private function table_names( string $table_prefix ): array {
		return array(
			'pos_sync_log'         => $table_prefix . self::POS_SYNC_TABLE,
			'payment_provider_log' => $table_prefix . self::PAYMENT_PROVIDER_TABLE,
		);
	}

	/**
	 * @param array<string, mixed> $row POS sync log row.
	 * @return list<string>
	 */
	private function validate_pos_sync_row( array $row, int $index ): array {
		$errors = array();

		if ( ! $this->is_uuid( (string) ( $row['public_id'] ?? '' ) ) ) {
			$errors[] = 'pos_sync_row_' . $index . '_public_id_invalid';
		}

		if ( ! $this->is_slugish( (string) ( $row['provider'] ?? '' ), 1, 64 ) ) {
			$errors[] = 'pos_sync_row_' . $index . '_provider_invalid';
		}

		foreach ( array( 'provider_location_id', 'external_transaction_id', 'external_order_id', 'external_line_item_id', 'barcode' ) as $field ) {
			if ( null !== ( $row[ $field ] ?? null ) && ! $this->is_identifier( (string) $row[ $field ], 1, 191 ) ) {
				$errors[] = 'pos_sync_row_' . $index . '_' . $field . '_invalid';
			}
		}

		if ( null !== ( $row['inventory_item_id'] ?? null ) && null === $this->positive_int( $row['inventory_item_id'] ) ) {
			$errors[] = 'pos_sync_row_' . $index . '_inventory_item_id_invalid';
		}

		if ( ! in_array( (string) ( $row['reconciliation_status'] ?? '' ), self::POS_RECONCILIATION_STATUSES, true ) ) {
			$errors[] = 'pos_sync_row_' . $index . '_reconciliation_status_invalid';
		}

		if ( null !== ( $row['result_code'] ?? null ) && ! $this->is_slug( (string) $row['result_code'], 1, 100 ) ) {
			$errors[] = 'pos_sync_row_' . $index . '_result_code_invalid';
		}

		if ( null !== ( $row['result_details_json'] ?? null ) && ! $this->is_json_string( $row['result_details_json'] ) ) {
			$errors[] = 'pos_sync_row_' . $index . '_result_details_json_invalid';
		}

		if ( ! $this->is_identifier( (string) ( $row['idempotency_key'] ?? '' ), 8, 191 ) ) {
			$errors[] = 'pos_sync_row_' . $index . '_idempotency_key_invalid';
		}

		foreach ( array( 'occurred_at', 'received_at', 'reconciled_at', 'created_at', 'updated_at' ) as $field ) {
			if ( null !== ( $row[ $field ] ?? null ) && null === $this->mysql_datetime_utc( (string) $row[ $field ] ) ) {
				$errors[] = 'pos_sync_row_' . $index . '_' . $field . '_invalid';
			}
		}

		foreach ( array( 'received_at', 'created_at', 'updated_at' ) as $field ) {
			if ( null === ( $row[ $field ] ?? null ) ) {
				$errors[] = 'pos_sync_row_' . $index . '_' . $field . '_invalid';
			}
		}

		if ( null === $this->positive_int( $row['row_version'] ?? null ) ) {
			$errors[] = 'pos_sync_row_' . $index . '_row_version_invalid';
		}

		return $errors;
	}

	/**
	 * @param array<string, mixed> $row Payment provider log row.
	 * @return list<string>
	 */
	private function validate_payment_provider_row( array $row, int $index ): array {
		$errors = array();

		if ( ! $this->is_uuid( (string) ( $row['public_id'] ?? '' ) ) ) {
			$errors[] = 'payment_provider_row_' . $index . '_public_id_invalid';
		}

		foreach ( array( 'provider', 'channel' ) as $field ) {
			if ( ! $this->is_slugish( (string) ( $row[ $field ] ?? '' ), 1, 64 ) ) {
				$errors[] = 'payment_provider_row_' . $index . '_' . $field . '_invalid';
			}
		}

		if ( ! in_array( (string) ( $row['operation'] ?? '' ), self::PAYMENT_OPERATIONS, true ) ) {
			$errors[] = 'payment_provider_row_' . $index . '_operation_invalid';
		}

		if ( null !== ( $row['woo_order_id'] ?? null ) && null === $this->positive_int( $row['woo_order_id'] ) ) {
			$errors[] = 'payment_provider_row_' . $index . '_woo_order_id_invalid';
		}

		foreach ( array( 'external_transaction_id', 'external_payment_id', 'external_refund_id' ) as $field ) {
			if ( null !== ( $row[ $field ] ?? null ) && ! $this->is_identifier( (string) $row[ $field ], 1, 191 ) ) {
				$errors[] = 'payment_provider_row_' . $index . '_' . $field . '_invalid';
			}
		}

		if ( null === $this->non_negative_int( $row['amount_minor_units'] ?? null ) ) {
			$errors[] = 'payment_provider_row_' . $index . '_amount_minor_units_invalid';
		}

		if ( ! $this->is_currency( (string) ( $row['currency'] ?? '' ) ) ) {
			$errors[] = 'payment_provider_row_' . $index . '_currency_invalid';
		}

		if ( ! $this->is_slugish( (string) ( $row['status'] ?? '' ), 1, 32 ) ) {
			$errors[] = 'payment_provider_row_' . $index . '_status_invalid';
		}

		foreach ( array( 'masked_request_json', 'masked_response_json' ) as $field ) {
			if ( ! $this->is_json_string( $row[ $field ] ?? null ) ) {
				$errors[] = 'payment_provider_row_' . $index . '_' . $field . '_invalid';
			}
		}

		if ( ! $this->is_identifier( (string) ( $row['idempotency_key'] ?? '' ), 8, 191 ) ) {
			$errors[] = 'payment_provider_row_' . $index . '_idempotency_key_invalid';
		}

		foreach ( array( 'occurred_at', 'received_at', 'created_at', 'updated_at' ) as $field ) {
			if ( null !== ( $row[ $field ] ?? null ) && null === $this->mysql_datetime_utc( (string) $row[ $field ] ) ) {
				$errors[] = 'payment_provider_row_' . $index . '_' . $field . '_invalid';
			}
		}

		foreach ( array( 'received_at', 'created_at', 'updated_at' ) as $field ) {
			if ( null === ( $row[ $field ] ?? null ) ) {
				$errors[] = 'payment_provider_row_' . $index . '_' . $field . '_invalid';
			}
		}

		if ( null === $this->positive_int( $row['row_version'] ?? null ) ) {
			$errors[] = 'payment_provider_row_' . $index . '_row_version_invalid';
		}

		return $errors;
	}

	/**
	 * @param array<string, mixed> $row POS sync log row.
	 * @return array<string, mixed>
	 */
	private function pos_sync_query_for_row( string $table_name, array $row ): array {
		$prepare_args = array();
		$placeholders = array(
			$this->value_placeholder( $row['public_id'], '%s', $prepare_args ),
			$this->value_placeholder( $row['provider'], '%s', $prepare_args ),
			$this->nullable_string_placeholder( $row['provider_location_id'] ?? null, $prepare_args ),
			$this->nullable_string_placeholder( $row['external_transaction_id'] ?? null, $prepare_args ),
			$this->nullable_string_placeholder( $row['external_order_id'] ?? null, $prepare_args ),
			$this->nullable_string_placeholder( $row['external_line_item_id'] ?? null, $prepare_args ),
			$this->nullable_int_placeholder( $row['inventory_item_id'] ?? null, $prepare_args ),
			$this->nullable_string_placeholder( $row['barcode'] ?? null, $prepare_args ),
			$this->value_placeholder( $row['reconciliation_status'], '%s', $prepare_args ),
			$this->nullable_string_placeholder( $row['result_code'] ?? null, $prepare_args ),
			$this->nullable_string_placeholder( $row['result_details_json'] ?? null, $prepare_args ),
			$this->value_placeholder( $row['idempotency_key'], '%s', $prepare_args ),
			$this->nullable_datetime_placeholder( $row['occurred_at'] ?? null, $prepare_args ),
			$this->value_placeholder( $this->mysql_datetime_utc( (string) $row['received_at'] ), '%s', $prepare_args ),
			$this->nullable_datetime_placeholder( $row['reconciled_at'] ?? null, $prepare_args ),
			$this->value_placeholder( $this->mysql_datetime_utc( (string) $row['created_at'] ), '%s', $prepare_args ),
			$this->value_placeholder( $this->mysql_datetime_utc( (string) $row['updated_at'] ), '%s', $prepare_args ),
			$this->value_placeholder( $row['row_version'], '%d', $prepare_args ),
		);
		$sql_template = sprintf(
			'INSERT INTO `%s` (%s) VALUES (%s)',
			$table_name,
			implode( ', ', array_map( array( $this, 'quote_identifier' ), self::POS_SYNC_COLUMNS ) ),
			implode( ', ', $placeholders )
		);

		return array(
			'idempotency_key'                   => (string) $row['idempotency_key'],
			'reconciliation_status'             => (string) $row['reconciliation_status'],
			'has_inventory_item'                => null !== ( $row['inventory_item_id'] ?? null ),
			'sql_template'                      => $sql_template,
			'prepare_args'                      => $prepare_args,
			'pos_sync_write_execution_deferred' => true,
		);
	}

	/**
	 * @param array<string, mixed> $row Payment provider log row.
	 * @return array<string, mixed>
	 */
	private function payment_provider_query_for_row( string $table_name, array $row ): array {
		$prepare_args = array();
		$placeholders = array(
			$this->value_placeholder( $row['public_id'], '%s', $prepare_args ),
			$this->value_placeholder( $row['provider'], '%s', $prepare_args ),
			$this->value_placeholder( $row['channel'], '%s', $prepare_args ),
			$this->value_placeholder( $row['operation'], '%s', $prepare_args ),
			$this->nullable_int_placeholder( $row['woo_order_id'] ?? null, $prepare_args ),
			$this->nullable_string_placeholder( $row['external_transaction_id'] ?? null, $prepare_args ),
			$this->nullable_string_placeholder( $row['external_payment_id'] ?? null, $prepare_args ),
			$this->nullable_string_placeholder( $row['external_refund_id'] ?? null, $prepare_args ),
			$this->value_placeholder( $row['amount_minor_units'], '%d', $prepare_args ),
			$this->value_placeholder( $row['currency'], '%s', $prepare_args ),
			$this->value_placeholder( $row['status'], '%s', $prepare_args ),
			$this->value_placeholder( $row['masked_request_json'], '%s', $prepare_args ),
			$this->value_placeholder( $row['masked_response_json'], '%s', $prepare_args ),
			$this->value_placeholder( $row['idempotency_key'], '%s', $prepare_args ),
			$this->nullable_datetime_placeholder( $row['occurred_at'] ?? null, $prepare_args ),
			$this->value_placeholder( $this->mysql_datetime_utc( (string) $row['received_at'] ), '%s', $prepare_args ),
			$this->value_placeholder( $this->mysql_datetime_utc( (string) $row['created_at'] ), '%s', $prepare_args ),
			$this->value_placeholder( $this->mysql_datetime_utc( (string) $row['updated_at'] ), '%s', $prepare_args ),
			$this->value_placeholder( $row['row_version'], '%d', $prepare_args ),
		);
		$sql_template = sprintf(
			'INSERT INTO `%s` (%s) VALUES (%s)',
			$table_name,
			implode( ', ', array_map( array( $this, 'quote_identifier' ), self::PAYMENT_PROVIDER_COLUMNS ) ),
			implode( ', ', $placeholders )
		);

		return array(
			'idempotency_key'                           => (string) $row['idempotency_key'],
			'operation'                                 => (string) $row['operation'],
			'status'                                    => (string) $row['status'],
			'sql_template'                              => $sql_template,
			'prepare_args'                              => $prepare_args,
			'payment_provider_write_execution_deferred' => true,
		);
	}

	/**
	 * @param list<mixed> $prepare_args Prepared SQL args.
	 */
	private function value_placeholder( mixed $value, string $placeholder, array &$prepare_args ): string {
		$prepare_args[] = '%d' === $placeholder ? (int) $value : (string) $value;

		return $placeholder;
	}

	/**
	 * @param list<mixed> $prepare_args Prepared SQL args.
	 */
	private function nullable_string_placeholder( mixed $value, array &$prepare_args ): string {
		if ( null === $value || '' === $value ) {
			return 'NULL';
		}

		$prepare_args[] = (string) $value;

		return '%s';
	}

	/**
	 * @param list<mixed> $prepare_args Prepared SQL args.
	 */
	private function nullable_int_placeholder( mixed $value, array &$prepare_args ): string {
		if ( null === $value || '' === $value ) {
			return 'NULL';
		}

		$prepare_args[] = (int) $value;

		return '%d';
	}

	/**
	 * @param list<mixed> $prepare_args Prepared SQL args.
	 */
	private function nullable_datetime_placeholder( mixed $value, array &$prepare_args ): string {
		if ( null === $value || '' === $value ) {
			return 'NULL';
		}

		$prepare_args[] = (string) $this->mysql_datetime_utc( (string) $value );

		return '%s';
	}

	private function positive_int( mixed $value ): ?int {
		if ( is_int( $value ) && 0 < $value ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && 0 < (int) $value ) {
			return (int) $value;
		}

		return null;
	}

	private function non_negative_int( mixed $value ): ?int {
		if ( is_int( $value ) && 0 <= $value ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return (int) $value;
		}

		return null;
	}

	private function is_uuid( string $value ): bool {
		return 1 === preg_match( '/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/', trim( $value ) );
	}

	private function is_identifier( string $value, int $minimum, int $maximum ): bool {
		$value = trim( $value );

		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{' . $minimum . ',' . $maximum . '}$/', $value );
	}

	private function is_slug( string $value, int $minimum, int $maximum ): bool {
		$value = trim( $value );

		return 1 === preg_match( '/^[a-z0-9_]{' . $minimum . ',' . $maximum . '}$/', $value );
	}

	private function is_slugish( string $value, int $minimum, int $maximum ): bool {
		$value = trim( $value );

		return 1 === preg_match( '/^[a-z0-9_-]{' . $minimum . ',' . $maximum . '}$/', $value );
	}

	private function is_currency( string $value ): bool {
		return 1 === preg_match( '/^[A-Z]{3}$/', trim( $value ) );
	}

	private function is_json_string( mixed $value ): bool {
		if ( ! is_string( $value ) || '' === trim( $value ) ) {
			return false;
		}

		json_decode( $value, true );

		return JSON_ERROR_NONE === json_last_error();
	}

	private function quote_identifier( string $identifier ): string {
		return '`' . $identifier . '`';
	}

	private function mysql_datetime_utc( string $value ): ?string {
		try {
			$date = new DateTimeImmutable( $value, new DateTimeZone( 'UTC' ) );
		} catch ( Exception ) {
			return null;
		}

		return $date->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s.u' );
	}
}
