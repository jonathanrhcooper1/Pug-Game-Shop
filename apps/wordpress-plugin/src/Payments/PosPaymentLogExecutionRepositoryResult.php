<?php
/**
 * POS/payment log explicit execution repository result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Payments;

final class PosPaymentLogExecutionRepositoryResult {
	public const STATUS_PERSISTED = 'persisted';
	public const STATUS_REJECTED  = 'rejected';

	/**
	 * @param list<array<string, mixed>> $pos_sync_results POS sync execution results.
	 * @param list<array<string, mixed>> $payment_provider_results Payment provider execution results.
	 * @param list<string>              $errors Execution errors.
	 * @param array<string, mixed>      $query_audit SQL query audit.
	 * @param array<string, mixed>      $preflight_audit Transaction preflight audit.
	 */
	private function __construct(
		private string $status,
		private array $pos_sync_results,
		private array $payment_provider_results,
		private int $pos_sync_rows_affected,
		private int $payment_provider_rows_affected,
		private array $errors,
		private array $query_audit,
		private array $preflight_audit
	) {
	}

	/**
	 * @param list<array<string, mixed>> $pos_sync_results POS sync execution results.
	 * @param list<array<string, mixed>> $payment_provider_results Payment provider execution results.
	 */
	public static function persisted(
		PosPaymentLogQueryBuildPlan $query_plan,
		PosPaymentLogTransactionPreflightResult $preflight_result,
		array $pos_sync_results,
		array $payment_provider_results,
		int $pos_sync_rows_affected,
		int $payment_provider_rows_affected
	): self {
		return new self(
			self::STATUS_PERSISTED,
			array_values( $pos_sync_results ),
			array_values( $payment_provider_results ),
			max( 0, $pos_sync_rows_affected ),
			max( 0, $payment_provider_rows_affected ),
			array(),
			$query_plan->audit_payload(),
			$preflight_result->audit_payload()
		);
	}

	/**
	 * @param list<string>              $errors Execution errors.
	 * @param list<array<string, mixed>> $pos_sync_results Partial POS sync execution results.
	 * @param list<array<string, mixed>> $payment_provider_results Partial payment provider execution results.
	 */
	public static function rejected(
		PosPaymentLogQueryBuildPlan $query_plan,
		PosPaymentLogTransactionPreflightResult $preflight_result,
		array $errors,
		array $pos_sync_results = array(),
		array $payment_provider_results = array(),
		int $pos_sync_rows_affected = 0,
		int $payment_provider_rows_affected = 0
	): self {
		return new self(
			self::STATUS_REJECTED,
			array_values( $pos_sync_results ),
			array_values( $payment_provider_results ),
			max( 0, $pos_sync_rows_affected ),
			max( 0, $payment_provider_rows_affected ),
			array_values( array_unique( $errors ) ),
			$query_plan->audit_payload(),
			$preflight_result->audit_payload()
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_persisted(): bool {
		return self::STATUS_PERSISTED === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	public function rows_affected(): int {
		return $this->pos_sync_rows_affected + $this->payment_provider_rows_affected;
	}

	public function pos_sync_rows_affected(): int {
		return $this->pos_sync_rows_affected;
	}

	public function payment_provider_rows_affected(): int {
		return $this->payment_provider_rows_affected;
	}

	public function pos_sync_query_count(): int {
		return count( $this->pos_sync_results );
	}

	public function payment_provider_query_count(): int {
		return count( $this->payment_provider_results );
	}

	public function total_query_count(): int {
		return $this->pos_sync_query_count() + $this->payment_provider_query_count();
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function pos_sync_results(): array {
		return $this->pos_sync_results;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function payment_provider_results(): array {
		return $this->payment_provider_results;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	/**
	 * @return list<string>
	 */
	public function log_idempotency_keys(): array {
		$keys = array();

		foreach ( array_merge( $this->pos_sync_results, $this->payment_provider_results ) as $result ) {
			$key = trim( (string) ( $result['idempotency_key'] ?? '' ) );

			if ( '' !== $key ) {
				$keys[] = $key;
			}
		}

		return array_values( array_unique( $keys ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'                             => 'pos_payment_log_execution_repository',
			'status'                             => $this->status,
			'is_persisted'                       => $this->is_persisted(),
			'is_rejected'                        => $this->is_rejected(),
			'pos_sync_query_count'               => $this->pos_sync_query_count(),
			'payment_provider_query_count'       => $this->payment_provider_query_count(),
			'total_query_count'                  => $this->total_query_count(),
			'pos_sync_rows_affected'             => $this->pos_sync_rows_affected(),
			'payment_provider_rows_affected'     => $this->payment_provider_rows_affected(),
			'rows_affected'                      => $this->rows_affected(),
			'log_idempotency_keys'               => $this->log_idempotency_keys(),
			'query'                              => $this->query_audit,
			'preflight'                          => $this->preflight_audit,
			'pos_sync_results'                   => $this->pos_sync_results,
			'payment_provider_results'           => $this->payment_provider_results,
			'route_connected_writes_deferred'    => true,
			'provider_inventory_write_deferred'  => true,
			'payment_capture_execution_deferred' => true,
			'production_capture_deferred'        => true,
			'errors'                             => $this->errors,
		);
	}
}
