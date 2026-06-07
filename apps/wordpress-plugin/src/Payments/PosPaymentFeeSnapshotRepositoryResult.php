<?php
/**
 * POS/payment fee snapshot repository result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Payments;

final class PosPaymentFeeSnapshotRepositoryResult {
	public const STATUS_FETCHED  = 'fetched';
	public const STATUS_REJECTED = 'rejected';

	/**
	 * @param list<array<string, mixed>> $fee_snapshots Fee snapshot rows.
	 * @param list<string>              $errors        Repository or row errors.
	 * @param array<string, mixed>      $query_audit   Query build audit payload.
	 * @param array<string, mixed>      $fetch_audit   Fetch audit payload.
	 */
	private function __construct(
		private string $status,
		private array $fee_snapshots,
		private array $errors,
		private array $query_audit,
		private array $fetch_audit
	) {
	}

	/**
	 * @param list<array<string, mixed>> $fee_snapshots Fee snapshot rows.
	 * @param array<string, mixed>      $fetch_audit   Fetch audit payload.
	 */
	public static function fetched(
		PosPaymentFeeSnapshotQueryBuildPlan $query_plan,
		array $fee_snapshots,
		array $fetch_audit
	): self {
		return new self(
			self::STATUS_FETCHED,
			array_values( $fee_snapshots ),
			array(),
			$query_plan->audit_payload(),
			$fetch_audit
		);
	}

	/**
	 * @param list<string>         $errors      Repository or row errors.
	 * @param array<string, mixed> $fetch_audit Fetch audit payload.
	 */
	public static function rejected(
		PosPaymentFeeSnapshotQueryBuildPlan $query_plan,
		array $errors,
		array $fetch_audit = array()
	): self {
		return new self(
			self::STATUS_REJECTED,
			array(),
			array_values( array_unique( $errors ) ),
			$query_plan->audit_payload(),
			$fetch_audit
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_fetched(): bool {
		return self::STATUS_FETCHED === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function fee_snapshots(): array {
		return $this->fee_snapshots;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'                               => 'pos_payment_fee_snapshot_repository_fetch',
			'status'                               => $this->status,
			'fetched'                              => $this->is_fetched(),
			'is_rejected'                          => $this->is_rejected(),
			'row_count'                            => count( $this->fee_snapshots ),
			'query'                                => $this->query_audit,
			'fetch'                                => $this->fetch_audit,
			'route_registration_deferred'          => true,
			'route_connected_reads_deferred'       => true,
			'route_connected_writes_deferred'      => true,
			'provider_capture_deferred'            => true,
			'woocommerce_gateway_capture_deferred' => true,
			'errors'                               => $this->errors,
		);
	}
}
