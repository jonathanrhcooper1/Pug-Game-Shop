<?php
/**
 * Planned POS/payment log SQL templates.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Payments;

final class PosPaymentLogQueryBuildPlan {
	/**
	 * @param array<string, string>      $table_names POS/payment log table names.
	 * @param list<array<string, mixed>> $pos_sync_queries Prepared POS sync insert templates.
	 * @param list<array<string, mixed>> $payment_provider_queries Prepared payment provider insert templates.
	 * @param list<string>              $errors Query build errors.
	 * @param list<array<string, mixed>> $source_audit Source planner audit events.
	 */
	private function __construct(
		private bool $is_valid,
		private array $table_names,
		private array $pos_sync_queries,
		private array $payment_provider_queries,
		private array $errors,
		private array $source_audit
	) {
	}

	/**
	 * @param array<string, string>      $table_names POS/payment log table names.
	 * @param list<array<string, mixed>> $pos_sync_queries Prepared POS sync insert templates.
	 * @param list<array<string, mixed>> $payment_provider_queries Prepared payment provider insert templates.
	 */
	public static function accepted(
		PosPaymentLogPlan $log_plan,
		array $table_names,
		array $pos_sync_queries,
		array $payment_provider_queries
	): self {
		return new self(
			true,
			$table_names,
			array_values( $pos_sync_queries ),
			array_values( $payment_provider_queries ),
			array(),
			$log_plan->audit_events()
		);
	}

	/**
	 * @param array<string, string> $table_names POS/payment log table names.
	 * @param list<string>         $errors Query build errors.
	 */
	public static function rejected( PosPaymentLogPlan $log_plan, array $table_names, array $errors ): self {
		return new self(
			false,
			$table_names,
			array(),
			array(),
			array_values( array_unique( $errors ) ),
			$log_plan->audit_events()
		);
	}

	public function is_valid(): bool {
		return $this->is_valid;
	}

	/**
	 * @return array<string, string>
	 */
	public function table_names(): array {
		return $this->table_names;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function pos_sync_queries(): array {
		return $this->pos_sync_queries;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function payment_provider_queries(): array {
		return $this->payment_provider_queries;
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
			'action'                                    => 'pos_payment_log_sql_planned',
			'is_valid'                                  => $this->is_valid,
			'table_names'                               => $this->table_names,
			'pos_sync_query_count'                      => count( $this->pos_sync_queries ),
			'payment_provider_query_count'              => count( $this->payment_provider_queries ),
			'prepare_arg_count'                         => $this->prepare_arg_count(),
			'source'                                    => $this->source_audit,
			'pos_sync_write_execution_deferred'         => true,
			'payment_provider_write_execution_deferred' => true,
			'payment_log_repository_deferred'           => true,
			'route_connected_writes_deferred'           => true,
			'production_capture_deferred'               => true,
			'errors'                                    => $this->errors,
		);
	}

	public function prepare_arg_count(): int {
		$count = 0;

		foreach ( $this->pos_sync_queries as $query ) {
			$count += count( $query['prepare_args'] ?? array() );
		}

		foreach ( $this->payment_provider_queries as $query ) {
			$count += count( $query['prepare_args'] ?? array() );
		}

		return $count;
	}
}
