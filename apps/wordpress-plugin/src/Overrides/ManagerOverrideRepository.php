<?php
/**
 * Manager override wpdb repository.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Overrides;

final class ManagerOverrideRepository {
	public function __construct(
		private \wpdb $database
	) {
	}

	public function persist( ManagerOverridePersistencePlan $plan ): ManagerOverrideRepositoryResult {
		if ( ! $plan->should_persist() ) {
			return ManagerOverrideRepositoryResult::skipped( $plan );
		}

		$prefix_errors = $this->validate_prefix();
		if ( array() !== $prefix_errors ) {
			return ManagerOverrideRepositoryResult::rejected( $plan, $prefix_errors );
		}

		$row_errors = $this->validate_row( $plan->row_data() );
		if ( array() !== $row_errors ) {
			return ManagerOverrideRepositoryResult::rejected( $plan, $row_errors );
		}

		$rows_affected = $this->database->insert(
			(string) ( $this->database->prefix ?? '' ) . 'tcg_manager_overrides',
			$plan->row_data(),
			$this->formats( $plan->row_data() )
		);

		if ( false === $rows_affected ) {
			return ManagerOverrideRepositoryResult::rejected(
				$plan,
				array( 'manager_override_insert_failed' )
			);
		}

		$rows_affected = (int) $rows_affected;

		if ( 1 === $rows_affected ) {
			return ManagerOverrideRepositoryResult::persisted(
				$plan,
				$rows_affected,
				$this->insert_id()
			);
		}

		return ManagerOverrideRepositoryResult::rejected(
			$plan,
			array(
				0 === $rows_affected
					? 'manager_override_insert_no_rows'
					: 'manager_override_insert_unexpected_rows',
			),
			$rows_affected
		);
	}

	/**
	 * @return list<string>
	 */
	private function validate_prefix(): array {
		$prefix = (string) ( $this->database->prefix ?? '' );

		if ( '' === $prefix || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $prefix ) ) {
			return array( 'manager_override_table_prefix_invalid' );
		}

		return array();
	}

	/**
	 * @param array<string, mixed> $row Row payload.
	 * @return list<string>
	 */
	private function validate_row( array $row ): array {
		$errors = array();

		if ( '' === trim( (string) ( $row['public_id'] ?? '' ) ) ) {
			$errors[] = 'manager_override_public_id_required';
		}

		if ( 'below_minimum_sale' !== (string) ( $row['override_type'] ?? '' ) ) {
			$errors[] = 'manager_override_type_invalid';
		}

		if ( null === $this->positive_int( $row['employee_user_id'] ?? null ) ) {
			$errors[] = 'manager_override_employee_required';
		}

		if ( null === $this->positive_int( $row['manager_user_id'] ?? null ) ) {
			$errors[] = 'manager_override_manager_required';
		}

		if ( '' === trim( (string) ( $row['reason'] ?? '' ) ) ) {
			$errors[] = 'manager_override_reason_required';
		}

		return array_values( array_unique( $errors ) );
	}

	/**
	 * @param array<string, mixed> $row Row payload.
	 * @return list<string>
	 */
	private function formats( array $row ): array {
		$formats = array();

		foreach ( $row as $column => $value ) {
			if (
				in_array(
					$column,
					array(
						'inventory_id',
						'employee_user_id',
						'manager_user_id',
						'order_id',
						'location_id',
					),
					true
				)
			) {
				$formats[] = '%d';
				continue;
			}

			$formats[] = '%s';
		}

		return $formats;
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

	private function insert_id(): ?int {
		$insert_id = $this->database->insert_id ?? null;

		if ( ! is_numeric( $insert_id ) ) {
			return null;
		}

		$insert_id = (int) $insert_id;

		return $insert_id > 0 ? $insert_id : null;
	}
}
