<?php
/**
 * Offline push canonical mutation SQL template builder.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use DateTimeImmutable;
use DateTimeZone;
use Exception;

final class OfflinePushCanonicalMutationQueryBuilder {
	private const INVENTORY_TABLE     = 'tcg_inventory_items';
	private const EVENTS_TABLE        = 'tcg_events';
	private const REGISTRATIONS_TABLE = 'tcg_event_registrations';
	private const CUSTOMERS_TABLE     = 'tcg_customers';
	private const CREDIT_LEDGER_TABLE = 'tcg_customer_credit_ledger';
	private const MUTATION_TYPES      = array(
		'inventory_reservation',
		'event_registration',
		'customer_credit_redemption',
	);

	public function build(
		OfflinePushCanonicalMutationPlan $canonical_plan,
		string $table_prefix
	): OfflinePushCanonicalMutationQueryBuildPlan {
		$errors       = array();
		$table_prefix = trim( $table_prefix );

		if ( '' === $table_prefix || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix ) ) {
			$errors[] = 'table_prefix_invalid';
		}

		$table_names = $this->table_names( $table_prefix );
		$queries     = array();

		foreach ( $canonical_plan->mutation_rows() as $index => $row ) {
			$row_errors = $this->validate_row( $row, $index );

			if ( array() !== $row_errors ) {
				$errors = array_merge( $errors, $row_errors );
				continue;
			}

			$queries[] = $this->query_for_row( $row, $table_names );
		}

		if ( array() !== $errors ) {
			return OfflinePushCanonicalMutationQueryBuildPlan::rejected(
				$canonical_plan,
				$table_names,
				$errors
			);
		}

		return OfflinePushCanonicalMutationQueryBuildPlan::accepted(
			$canonical_plan,
			$table_names,
			$queries
		);
	}

	/**
	 * @return array<string, string>
	 */
	private function table_names( string $table_prefix ): array {
		return array(
			'inventory_items'        => $table_prefix . self::INVENTORY_TABLE,
			'events'                 => $table_prefix . self::EVENTS_TABLE,
			'event_registrations'    => $table_prefix . self::REGISTRATIONS_TABLE,
			'customers'              => $table_prefix . self::CUSTOMERS_TABLE,
			'customer_credit_ledger' => $table_prefix . self::CREDIT_LEDGER_TABLE,
		);
	}

	/**
	 * @param array<string, mixed> $row Canonical mutation row.
	 * @return list<string>
	 */
	private function validate_row( array $row, int $index ): array {
		$errors        = array();
		$mutation_type = (string) ( $row['mutation_type'] ?? '' );

		if ( ! in_array( $mutation_type, self::MUTATION_TYPES, true ) ) {
			$errors[] = 'mutation_row_' . $index . '_mutation_type_invalid';
		}

		foreach ( array( 'batch_id', 'device_id', 'client_operation_id' ) as $field ) {
			if ( ! $this->is_identifier( (string) ( $row[ $field ] ?? '' ), 8, 128 ) ) {
				$errors[] = 'mutation_row_' . $index . '_' . $field . '_invalid';
			}
		}

		foreach ( array( 'operation_type', 'entity_type', 'resolution_code' ) as $field ) {
			if ( ! $this->is_slug( (string) ( $row[ $field ] ?? '' ), 1, 100 ) ) {
				$errors[] = 'mutation_row_' . $index . '_' . $field . '_invalid';
			}
		}

		if ( ! $this->is_identifier( (string) ( $row['entity_id'] ?? '' ), 1, 191 ) ) {
			$errors[] = 'mutation_row_' . $index . '_entity_id_invalid';
		}

		if ( null === $this->non_negative_int( $row['expected_base_row_version'] ?? null ) ) {
			$errors[] = 'mutation_row_' . $index . '_expected_base_row_version_invalid';
		}

		if ( null === $this->positive_int( $row['target_row_version'] ?? null ) ) {
			$errors[] = 'mutation_row_' . $index . '_target_row_version_invalid';
		}

		if ( null === $this->mysql_datetime_utc( (string) ( $row['planned_at_utc'] ?? '' ) ) ) {
			$errors[] = 'mutation_row_' . $index . '_planned_at_invalid';
		}

		if ( true !== ( $row['canonical_mutation_deferred'] ?? null ) ) {
			$errors[] = 'mutation_row_' . $index . '_canonical_mutation_deferred_invalid';
		}

		if ( true !== ( $row['route_connected_write_deferred'] ?? null ) ) {
			$errors[] = 'mutation_row_' . $index . '_route_connected_write_deferred_invalid';
		}

		return array_merge( $errors, $this->validate_type_row( $row, $index, $mutation_type ) );
	}

	/**
	 * @param array<string, mixed> $row Canonical mutation row.
	 * @return list<string>
	 */
	private function validate_type_row( array $row, int $index, string $mutation_type ): array {
		return match ( $mutation_type ) {
			'inventory_reservation'       => $this->validate_inventory_row( $row, $index ),
			'event_registration'         => $this->validate_event_row( $row, $index ),
			'customer_credit_redemption' => $this->validate_credit_row( $row, $index ),
			default                      => array(),
		};
	}

	/**
	 * @param array<string, mixed> $row Canonical mutation row.
	 * @return list<string>
	 */
	private function validate_inventory_row( array $row, int $index ): array {
		$errors = array();

		if ( self::INVENTORY_TABLE !== ( $row['table_contract'] ?? '' ) ) {
			$errors[] = 'mutation_row_' . $index . '_table_contract_invalid';
		}

		if ( 'reserved' !== ( $row['target_status'] ?? '' ) ) {
			$errors[] = 'mutation_row_' . $index . '_target_status_invalid';
		}

		if ( true !== ( $row['prevent_double_sell_guard'] ?? null ) ) {
			$errors[] = 'mutation_row_' . $index . '_prevent_double_sell_guard_invalid';
		}

		return $errors;
	}

	/**
	 * @param array<string, mixed> $row Canonical mutation row.
	 * @return list<string>
	 */
	private function validate_event_row( array $row, int $index ): array {
		$errors = array();

		if ( self::REGISTRATIONS_TABLE !== ( $row['table_contract'] ?? '' ) ) {
			$errors[] = 'mutation_row_' . $index . '_table_contract_invalid';
		}

		if ( ! in_array( (string) ( $row['registration_status'] ?? '' ), array( 'reserved', 'waitlist' ), true ) ) {
			$errors[] = 'mutation_row_' . $index . '_registration_status_invalid';
		}

		return $errors;
	}

	/**
	 * @param array<string, mixed> $row Canonical mutation row.
	 * @return list<string>
	 */
	private function validate_credit_row( array $row, int $index ): array {
		$errors = array();

		if ( self::CREDIT_LEDGER_TABLE !== ( $row['table_contract'] ?? '' ) ) {
			$errors[] = 'mutation_row_' . $index . '_table_contract_invalid';
		}

		if ( null === $this->positive_int( $row['amount_minor_units'] ?? null ) ) {
			$errors[] = 'mutation_row_' . $index . '_amount_minor_units_invalid';
		}

		if ( null === $this->non_negative_int( $row['balance_after_minor_units'] ?? null ) ) {
			$errors[] = 'mutation_row_' . $index . '_balance_after_minor_units_invalid';
		}

		if ( true !== ( $row['ledger_write_deferred'] ?? null ) ) {
			$errors[] = 'mutation_row_' . $index . '_ledger_write_deferred_invalid';
		}

		if ( true !== ( $row['negative_balance_guard'] ?? null ) ) {
			$errors[] = 'mutation_row_' . $index . '_negative_balance_guard_invalid';
		}

		return $errors;
	}

	/**
	 * @param array<string, mixed> $row Canonical mutation row.
	 * @param array<string, string> $table_names Canonical table names.
	 * @return array<string, mixed>
	 */
	private function query_for_row( array $row, array $table_names ): array {
		return match ( $row['mutation_type'] ) {
			'inventory_reservation'       => $this->inventory_query( $row, $table_names ),
			'event_registration'         => $this->event_query( $row, $table_names ),
			'customer_credit_redemption' => $this->credit_query( $row, $table_names ),
		};
	}

	/**
	 * @param array<string, mixed> $row Canonical mutation row.
	 * @param array<string, string> $table_names Canonical table names.
	 * @return array<string, mixed>
	 */
	private function inventory_query( array $row, array $table_names ): array {
		$sql_template = sprintf(
			'UPDATE `%s` SET `status` = %%s, `updated_at` = %%s, `row_version` = %%d WHERE `public_id` = %%s AND `row_version` = %%d AND `status` = %%s LIMIT 1',
			$table_names['inventory_items']
		);

		return array(
			'client_operation_id'                => $row['client_operation_id'],
			'mutation_type'                      => $row['mutation_type'],
			'query_kind'                         => 'inventory_status_guarded_update',
			'table_name'                         => $table_names['inventory_items'],
			'sql_template'                       => $sql_template,
			'prepare_args'                       => array(
				(string) $row['target_status'],
				(string) $this->mysql_datetime_utc( (string) $row['planned_at_utc'] ),
				(int) $row['target_row_version'],
				(string) $row['entity_id'],
				(int) $row['expected_base_row_version'],
				'available',
			),
			'prevent_double_sell_guard'          => true,
			'inventory_write_execution_deferred' => true,
			'route_connected_writes_deferred'    => true,
		);
	}

	/**
	 * @param array<string, mixed> $row Canonical mutation row.
	 * @param array<string, string> $table_names Canonical table names.
	 * @return array<string, mixed>
	 */
	private function event_query( array $row, array $table_names ): array {
		$sql_template = sprintf(
			'SELECT `event_id`, `registered_count`, `player_cap`, `row_version` FROM `%s` WHERE `public_id` = %%s AND `row_version` = %%d LIMIT 1',
			$table_names['events']
		);

		return array(
			'client_operation_id'               => $row['client_operation_id'],
			'mutation_type'                     => $row['mutation_type'],
			'query_kind'                        => 'event_registration_guard_lookup',
			'table_name'                        => $table_names['events'],
			'registration_table_name'           => $table_names['event_registrations'],
			'sql_template'                      => $sql_template,
			'prepare_args'                      => array(
				(string) $row['entity_id'],
				(int) $row['expected_base_row_version'],
			),
			'registration_status'               => $row['registration_status'],
			'event_registration_write_deferred' => true,
			'route_connected_writes_deferred'   => true,
		);
	}

	/**
	 * @param array<string, mixed> $row Canonical mutation row.
	 * @param array<string, string> $table_names Canonical table names.
	 * @return array<string, mixed>
	 */
	private function credit_query( array $row, array $table_names ): array {
		$sql_template = sprintf(
			'SELECT `customer_id`, `credit_balance`, `credit_currency`, `row_version` FROM `%s` WHERE `public_id` = %%s AND `row_version` = %%d LIMIT 1',
			$table_names['customers']
		);

		return array(
			'client_operation_id'                   => $row['client_operation_id'],
			'mutation_type'                         => $row['mutation_type'],
			'query_kind'                            => 'customer_credit_guard_lookup',
			'table_name'                            => $table_names['customers'],
			'ledger_table_name'                     => $table_names['customer_credit_ledger'],
			'sql_template'                          => $sql_template,
			'prepare_args'                          => array(
				(string) $row['entity_id'],
				(int) $row['expected_base_row_version'],
			),
			'amount_minor_units'                    => (int) $row['amount_minor_units'],
			'balance_after_minor_units'             => (int) $row['balance_after_minor_units'],
			'customer_credit_ledger_write_deferred' => true,
			'negative_balance_guard'                => true,
			'route_connected_writes_deferred'       => true,
		);
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

	private function is_identifier( string $value, int $minimum, int $maximum ): bool {
		$value = trim( $value );

		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{' . $minimum . ',' . $maximum . '}$/', $value );
	}

	private function is_slug( string $value, int $minimum, int $maximum ): bool {
		$value = trim( $value );

		return 1 === preg_match( '/^[a-z0-9_]{' . $minimum . ',' . $maximum . '}$/', $value );
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
