<?php
/**
 * POS/payment fee snapshot prepared SQL template builder.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Payments;

final class PosPaymentFeeSnapshotQueryBuilder {
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

	public function build( PosPaymentFeeSnapshotQueryPlan $query_plan ): PosPaymentFeeSnapshotQueryBuildPlan {
		$errors = array();

		if ( ! $query_plan->is_valid() ) {
			$errors[] = 'fee_snapshot_query_plan_invalid';
			$errors   = array_merge( $errors, $query_plan->errors() );
		}

		if ( ! $this->is_identifier( $query_plan->table_name() ) ) {
			$errors[] = 'table_name_invalid';
		}

		if ( 1 !== preg_match( '/^[A-Za-z0-9_]*tcg_payment_fee_snapshots$/', $query_plan->table_name() ) ) {
			$errors[] = 'table_unsupported';
		}

		if ( self::SELECTED_COLUMNS !== $query_plan->selected_columns() ) {
			$errors[] = 'selected_columns_unsupported';
		}

		if ( self::ORDER_BY !== $query_plan->order_by() ) {
			$errors[] = 'order_by_unsupported';
		}

		if ( $query_plan->limit() <= 0 || $query_plan->limit() > 100 ) {
			$errors[] = 'limit_unsupported';
		}

		$filters = $query_plan->filters();
		$this->validate_filters( $filters, $errors );

		if ( array() !== $errors ) {
			return PosPaymentFeeSnapshotQueryBuildPlan::rejected( $query_plan, $errors );
		}

		return PosPaymentFeeSnapshotQueryBuildPlan::accepted(
			$query_plan,
			$this->build_query( $query_plan )
		);
	}

	/**
	 * @param array<string, mixed> $filters Normalized filters.
	 * @param list<string>         $errors  Build errors.
	 */
	private function validate_filters( array $filters, array &$errors ): void {
		foreach ( array( 'provider', 'channel' ) as $field ) {
			$value = (string) ( $filters[ $field ] ?? '' );

			if ( '' !== $value && 1 !== preg_match( '/^[a-z0-9_-]{1,64}$/', $value ) ) {
				$errors[] = $field . '_invalid';
			}
		}

		$currency = (string) ( $filters['currency'] ?? '' );
		if ( '' !== $currency && 1 !== preg_match( '/^[A-Z]{3}$/', $currency ) ) {
			$errors[] = 'currency_invalid';
		}

		$effective_on = (string) ( $filters['effective_on'] ?? '' );
		if ( '' !== $effective_on && 1 !== preg_match( '/^\d{4}-\d{2}-\d{2}$/', $effective_on ) ) {
			$errors[] = 'effective_on_invalid';
		}
	}

	/**
	 * @return array<string, mixed>
	 */
	private function build_query( PosPaymentFeeSnapshotQueryPlan $query_plan ): array {
		$where_clauses = array();
		$prepare_args  = array();
		$filters       = $query_plan->filters();

		foreach ( array( 'provider', 'channel', 'currency' ) as $field ) {
			$value = (string) ( $filters[ $field ] ?? '' );

			if ( '' === $value ) {
				continue;
			}

			$where_clauses[] = sprintf( '%s = %%s', $this->quote_identifier( $field ) );
			$prepare_args[]  = $value;
		}

		$effective_on = (string) ( $filters['effective_on'] ?? '' );
		if ( '' !== $effective_on ) {
			$where_clauses[] = '`effective_from` <= %s';
			$where_clauses[] = '(`effective_to` IS NULL OR `effective_to` >= %s)';
			$prepare_args[]  = $effective_on;
			$prepare_args[]  = $effective_on;
		}

		$sql_template = sprintf(
			'SELECT %s FROM %s',
			implode( ', ', array_map( array( $this, 'quote_identifier' ), $query_plan->selected_columns() ) ),
			$this->quote_identifier( $query_plan->table_name() )
		);

		if ( array() !== $where_clauses ) {
			$sql_template .= ' WHERE ' . implode( ' AND ', $where_clauses );
		}

		$sql_template  .= ' ORDER BY `effective_from` DESC, `payment_fee_snapshot_id` DESC LIMIT %d';
		$prepare_args[] = $query_plan->limit();

		return array(
			'table_name'                       => $query_plan->table_name(),
			'filters'                          => $filters,
			'selected_columns'                 => $query_plan->selected_columns(),
			'order_by'                         => $query_plan->order_by(),
			'limit'                            => $query_plan->limit(),
			'sql_template'                     => $sql_template,
			'prepare_args'                     => $prepare_args,
			'read_execution_deferred'          => true,
			'fee_snapshot_repository_deferred' => true,
			'route_registration_deferred'      => true,
			'route_connected_writes_deferred'  => true,
		);
	}

	private function quote_identifier( string $identifier ): string {
		return '`' . $identifier . '`';
	}

	private function is_identifier( string $value ): bool {
		return '' !== $value && 1 === preg_match( '/^[A-Za-z0-9_]+$/', $value );
	}
}
