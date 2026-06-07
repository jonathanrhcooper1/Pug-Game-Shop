<?php
/**
 * POS/payment log repository staging result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Payments;

final class PosPaymentLogRepositoryResult {
	public const STATUS_DEFERRED = 'deferred';
	public const STATUS_REJECTED = 'rejected';

	/**
	 * @param list<array<string, mixed>> $pos_sync_results POS sync query repository staging results.
	 * @param list<array<string, mixed>> $payment_provider_results Payment query repository staging results.
	 * @param list<string>              $errors Repository errors.
	 * @param array<string, mixed>      $query_audit POS/payment SQL query audit.
	 */
	private function __construct(
		private string $status,
		private array $pos_sync_results,
		private array $payment_provider_results,
		private array $errors,
		private array $query_audit
	) {
	}

	/**
	 * @param list<array<string, mixed>> $pos_sync_results POS sync query repository staging results.
	 * @param list<array<string, mixed>> $payment_provider_results Payment query repository staging results.
	 */
	public static function deferred(
		PosPaymentLogQueryBuildPlan $query_plan,
		array $pos_sync_results,
		array $payment_provider_results
	): self {
		return new self(
			self::STATUS_DEFERRED,
			array_values( $pos_sync_results ),
			array_values( $payment_provider_results ),
			array(),
			$query_plan->audit_payload()
		);
	}

	/**
	 * @param list<string> $errors Repository errors.
	 */
	public static function rejected( PosPaymentLogQueryBuildPlan $query_plan, array $errors ): self {
		return new self(
			self::STATUS_REJECTED,
			array(),
			array(),
			array_values( array_unique( $errors ) ),
			$query_plan->audit_payload()
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_deferred(): bool {
		return self::STATUS_DEFERRED === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	public function rows_affected(): int {
		return 0;
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

	public function prepare_arg_count(): int {
		$count = 0;

		foreach ( $this->pos_sync_results as $result ) {
			$count += $this->non_negative_int( $result['prepare_arg_count'] ?? 0 );
		}

		foreach ( $this->payment_provider_results as $result ) {
			$count += $this->non_negative_int( $result['prepare_arg_count'] ?? 0 );
		}

		return $count;
	}

	/**
	 * @return list<string>
	 */
	public function pos_sync_idempotency_keys(): array {
		return $this->idempotency_keys_from( $this->pos_sync_results );
	}

	/**
	 * @return list<string>
	 */
	public function payment_provider_idempotency_keys(): array {
		return $this->idempotency_keys_from( $this->payment_provider_results );
	}

	/**
	 * @return list<string>
	 */
	public function log_idempotency_keys(): array {
		return array_values(
			array_unique(
				array_merge(
					$this->pos_sync_idempotency_keys(),
					$this->payment_provider_idempotency_keys()
				)
			)
		);
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
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'                                    => 'pos_payment_log_repository',
			'status'                                    => $this->status,
			'is_deferred'                               => $this->is_deferred(),
			'is_rejected'                               => $this->is_rejected(),
			'pos_sync_query_count'                      => $this->pos_sync_query_count(),
			'payment_provider_query_count'              => $this->payment_provider_query_count(),
			'total_query_count'                         => $this->total_query_count(),
			'pos_sync_idempotency_keys'                 => $this->pos_sync_idempotency_keys(),
			'payment_provider_idempotency_keys'         => $this->payment_provider_idempotency_keys(),
			'log_idempotency_keys'                      => $this->log_idempotency_keys(),
			'prepare_arg_count'                         => $this->prepare_arg_count(),
			'rows_affected'                             => $this->rows_affected(),
			'query'                                     => $this->query_audit,
			'pos_sync_results'                          => $this->pos_sync_results,
			'payment_provider_results'                  => $this->payment_provider_results,
			'explicit_execution_required'               => true,
			'pos_sync_write_execution_deferred'         => true,
			'payment_provider_write_execution_deferred' => true,
			'payment_log_repository_deferred'           => true,
			'route_connected_writes_deferred'           => true,
			'provider_inventory_write_deferred'         => true,
			'payment_capture_execution_deferred'        => true,
			'production_capture_deferred'               => true,
			'errors'                                    => $this->errors,
		);
	}

	private function non_negative_int( mixed $value ): int {
		if ( is_int( $value ) && 0 <= $value ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return (int) $value;
		}

		return 0;
	}

	/**
	 * @param list<array<string, mixed>> $results Repository staging results.
	 * @return list<string>
	 */
	private function idempotency_keys_from( array $results ): array {
		$keys = array();

		foreach ( $results as $result ) {
			$key = trim( (string) ( $result['idempotency_key'] ?? '' ) );

			if ( '' !== $key ) {
				$keys[] = $key;
			}
		}

		return array_values( array_unique( $keys ) );
	}
}
