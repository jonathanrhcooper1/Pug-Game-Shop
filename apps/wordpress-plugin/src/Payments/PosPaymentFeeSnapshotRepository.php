<?php
/**
 * POS/payment fee snapshot wpdb repository adapter.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Payments;

final class PosPaymentFeeSnapshotRepository {
	private \wpdb $database;
	private PosPaymentFeeSnapshotQueryBuilder $query_builder;

	public function __construct(
		\wpdb $database,
		?PosPaymentFeeSnapshotQueryBuilder $query_builder = null
	) {
		$this->database      = $database;
		$this->query_builder = $query_builder ?? new PosPaymentFeeSnapshotQueryBuilder();
	}

	public function fetch(
		PosPaymentFeeSnapshotQueryPlan $query_plan
	): PosPaymentFeeSnapshotRepositoryResult {
		$query_build_plan = $this->query_builder->build( $query_plan );

		if ( ! $query_build_plan->is_valid() ) {
			return PosPaymentFeeSnapshotRepositoryResult::rejected(
				$query_build_plan,
				$query_build_plan->errors()
			);
		}

		$table_errors = $this->validate_table_name( $query_build_plan );
		if ( array() !== $table_errors ) {
			return PosPaymentFeeSnapshotRepositoryResult::rejected(
				$query_build_plan,
				$table_errors
			);
		}

		$query        = $query_build_plan->query();
		$prepared_sql = $this->database->prepare(
			$query['sql_template'], // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$query['prepare_args']
		);
		$rows         = $this->database->get_results(
			$prepared_sql, // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$this->array_a_output_type()
		);

		if ( ! is_array( $rows ) ) {
			return PosPaymentFeeSnapshotRepositoryResult::rejected(
				$query_build_plan,
				array( 'fee_snapshot_query_failed' ),
				$this->fetch_audit( $query, 0 )
			);
		}

		$fee_snapshots = $this->fee_snapshots( $rows, $errors );
		if ( array() !== $errors ) {
			return PosPaymentFeeSnapshotRepositoryResult::rejected(
				$query_build_plan,
				$errors,
				$this->fetch_audit( $query, count( $fee_snapshots ) )
			);
		}

		return PosPaymentFeeSnapshotRepositoryResult::fetched(
			$query_build_plan,
			$fee_snapshots,
			$this->fetch_audit( $query, count( $fee_snapshots ) )
		);
	}

	/**
	 * @return list<string>
	 */
	private function validate_table_name( PosPaymentFeeSnapshotQueryBuildPlan $query_build_plan ): array {
		$prefix = (string) ( $this->database->prefix ?? '' );
		$query  = $query_build_plan->query();

		if (
			'' === $prefix
			|| 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $prefix )
			|| ( $query['table_name'] ?? '' ) !== $prefix . 'tcg_payment_fee_snapshots'
		) {
			return array( 'fee_snapshot_table_prefix_mismatch' );
		}

		return array();
	}

	/**
	 * @param list<array<string, mixed>> $rows Database rows.
	 * @param list<string>              $errors Row normalization errors.
	 * @return list<array<string, mixed>>
	 */
	private function fee_snapshots( array $rows, ?array &$errors ): array {
		$errors        = array();
		$fee_snapshots = array();

		foreach ( array_values( $rows ) as $index => $row ) {
			if ( ! is_array( $row ) ) {
				$errors[] = 'fee_snapshot_row_' . $index . '_invalid';
				continue;
			}

			$fee_snapshot = $this->fee_snapshot( $row, $index, $errors );
			if ( null !== $fee_snapshot ) {
				$fee_snapshots[] = $fee_snapshot;
			}
		}

		return $fee_snapshots;
	}

	/**
	 * @param array<string, mixed> $row Database row.
	 * @param list<string>         $errors Row normalization errors.
	 * @return array<string, mixed>|null
	 */
	private function fee_snapshot( array $row, int $index, array &$errors ): ?array {
		$row_errors                = array();
		$public_id                 = $this->public_id( $row['public_id'] ?? null );
		$provider                  = $this->slugish( $row['provider'] ?? null );
		$channel                   = $this->slugish( $row['channel'] ?? null );
		$currency                  = $this->currency( $row['currency'] ?? null );
		$percentage_basis_points   = $this->non_negative_int( $row['percentage_basis_points'] ?? null );
		$fixed_fee_minor_units     = $this->non_negative_int( $row['fixed_fee_minor_units'] ?? null );
		$platform_fee_minor_units  = $this->non_negative_int( $row['platform_fee_minor_units'] ?? null );
		$effective_from            = $this->date_value( $row['effective_from'] ?? null );
		$effective_to              = $this->nullable_date_value( $row['effective_to'] ?? null );
		$last_verified_at          = $this->utc_timestamp( $row['last_verified_at'] ?? null );
		$updated_at                = $this->utc_timestamp( $row['updated_at'] ?? null );
		$row_version               = $this->positive_int( $row['row_version'] ?? null );

		foreach (
			array(
				'public_id'                 => $public_id,
				'provider'                  => $provider,
				'channel'                   => $channel,
				'currency'                  => $currency,
				'percentage_basis_points'   => $percentage_basis_points,
				'fixed_fee_minor_units'     => $fixed_fee_minor_units,
				'platform_fee_minor_units'  => $platform_fee_minor_units,
				'effective_from'            => $effective_from,
				'last_verified_at'          => $last_verified_at,
				'updated_at'                => $updated_at,
				'row_version'               => $row_version,
			) as $field => $value
		) {
			if ( null === $value ) {
				$row_errors[] = 'fee_snapshot_row_' . $index . '_' . $field . '_invalid';
			}
		}

		if ( null === $effective_to && ! empty( $row['effective_to'] ) ) {
			$row_errors[] = 'fee_snapshot_row_' . $index . '_effective_to_invalid';
		}

		if ( array() !== $row_errors ) {
			$errors = array_merge( $errors, $row_errors );

			return null;
		}

		return array(
			'public_id'                => $public_id,
			'provider'                 => $provider,
			'channel'                  => $channel,
			'currency'                 => $currency,
			'percentage_basis_points'  => $percentage_basis_points,
			'fixed_fee_minor_units'    => $fixed_fee_minor_units,
			'platform_fee_minor_units' => $platform_fee_minor_units,
			'effective_from'           => $effective_from,
			'effective_to'             => $effective_to,
			'source_note'              => trim( (string) ( $row['source_note'] ?? '' ) ),
			'source_url'               => '' === trim( (string) ( $row['source_url'] ?? '' ) ) ? null : trim( (string) $row['source_url'] ),
			'last_verified_at_utc'     => $last_verified_at,
			'updated_at_utc'           => $updated_at,
			'row_version'              => $row_version,
		);
	}

	/**
	 * @param array<string, mixed> $query Prepared query.
	 * @return array<string, mixed>
	 */
	private function fetch_audit( array $query, int $row_count ): array {
		return array(
			'table_name'                       => (string) ( $query['table_name'] ?? '' ),
			'row_count'                        => $row_count,
			'prepare_arg_count'                => count( $query['prepare_args'] ?? array() ),
			'read_execution_deferred'          => false,
			'fee_snapshot_repository_deferred' => false,
			'route_registration_deferred'      => true,
			'route_connected_reads_deferred'   => true,
			'route_connected_writes_deferred'  => true,
		);
	}

	private function public_id( mixed $value ): ?string {
		$value = trim( (string) $value );

		return 1 === preg_match( '/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/', $value ) ? $value : null;
	}

	private function slugish( mixed $value ): ?string {
		$value = trim( (string) $value );

		return 1 === preg_match( '/^[a-z0-9_-]{1,64}$/', $value ) ? $value : null;
	}

	private function currency( mixed $value ): ?string {
		$value = strtoupper( trim( (string) $value ) );

		return 1 === preg_match( '/^[A-Z]{3}$/', $value ) ? $value : null;
	}

	private function positive_int( mixed $value ): ?int {
		$value = $this->int_value( $value );

		return null !== $value && 0 < $value ? $value : null;
	}

	private function non_negative_int( mixed $value ): ?int {
		$value = $this->int_value( $value );

		return null !== $value && 0 <= $value ? $value : null;
	}

	private function int_value( mixed $value ): ?int {
		if ( is_int( $value ) ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return (int) $value;
		}

		return null;
	}

	private function nullable_date_value( mixed $value ): ?string {
		if ( null === $value || '' === trim( (string) $value ) ) {
			return null;
		}

		return $this->date_value( $value );
	}

	private function date_value( mixed $value ): ?string {
		$value = trim( (string) $value );

		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2}$/', $value ) ? $value : null;
	}

	private function utc_timestamp( mixed $value ): ?string {
		$value = trim( (string) $value );

		if ( 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $value ) ) {
			return $value;
		}

		if ( 1 === preg_match( '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/', $value ) ) {
			return str_replace( ' ', 'T', $value ) . 'Z';
		}

		return null;
	}

	private function array_a_output_type(): string {
		if ( defined( 'ARRAY_A' ) ) {
			return ARRAY_A;
		}

		return 'ARRAY_A';
	}
}
