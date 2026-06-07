<?php
/**
 * Prepared SQL template plan for POS/payment fee snapshot reads.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Payments;

final class PosPaymentFeeSnapshotQueryBuildPlan {
	/**
	 * @param array<string, mixed> $query        Prepared read query.
	 * @param list<string>         $errors       Query build errors.
	 * @param array<string, mixed> $source_audit Source planner audit payload.
	 */
	private function __construct(
		private bool $is_valid,
		private string $table_name,
		private array $query,
		private array $errors,
		private array $source_audit
	) {
	}

	/**
	 * @param array<string, mixed> $query Prepared read query.
	 */
	public static function accepted( PosPaymentFeeSnapshotQueryPlan $query_plan, array $query ): self {
		return new self(
			true,
			$query_plan->table_name(),
			$query,
			array(),
			$query_plan->audit_payload()
		);
	}

	/**
	 * @param list<string> $errors Query build errors.
	 */
	public static function rejected( PosPaymentFeeSnapshotQueryPlan $query_plan, array $errors ): self {
		return new self(
			false,
			$query_plan->table_name(),
			array(),
			array_values( array_unique( $errors ) ),
			$query_plan->audit_payload()
		);
	}

	public function is_valid(): bool {
		return $this->is_valid;
	}

	public function table_name(): string {
		return $this->table_name;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function query(): array {
		return $this->query;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	public function prepare_arg_count(): int {
		return count( $this->query['prepare_args'] ?? array() );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'                          => 'pos_payment_fee_snapshot_query_sql_planned',
			'is_valid'                        => $this->is_valid,
			'table_name'                      => $this->table_name,
			'prepare_arg_count'               => $this->prepare_arg_count(),
			'source'                          => $this->source_audit,
			'sql_query_ready'                 => $this->is_valid,
			'read_execution_deferred'         => true,
			'fee_snapshot_repository_deferred' => true,
			'route_registration_deferred'     => true,
			'route_connected_writes_deferred' => true,
			'provider_capture_deferred'       => true,
			'woocommerce_gateway_capture_deferred' => true,
			'errors'                          => $this->errors,
		);
	}
}
