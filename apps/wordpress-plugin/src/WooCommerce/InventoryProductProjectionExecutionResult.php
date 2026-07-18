<?php
/**
 * WooCommerce product projection execution result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

final class InventoryProductProjectionExecutionResult {
	public const STATUS_BLOCKED  = 'blocked';
	public const STATUS_EXECUTED = 'executed';
	public const STATUS_REJECTED = 'rejected';
	public const STATUS_SKIPPED  = 'skipped';

	/**
	 * @param list<string>               $block_reasons Execution block reasons.
	 * @param list<string>               $errors Execution errors.
	 * @param list<array<string, mixed>> $operation_results Writer result summaries.
	 */
	private function __construct(
		private string $status,
		private InventoryProductProjectionPlan $plan,
		private array $block_reasons,
		private array $errors,
		private array $operation_results,
		private ?InventoryProductWriteRequestPlan $write_request_plan = null
	) {
	}

	/**
	 * @param list<string> $block_reasons Execution block reasons.
	 */
	public static function blocked(
		InventoryProductProjectionPlan $plan,
		array $block_reasons,
		?InventoryProductWriteRequestPlan $write_request_plan = null
	): self {
		return new self(
			self::STATUS_BLOCKED,
			$plan,
			array_values( array_unique( $block_reasons ) ),
			array(),
			array(),
			$write_request_plan
		);
	}

	/**
	 * @param list<array<string, mixed>> $operation_results Writer result summaries.
	 */
	public static function executed(
		InventoryProductProjectionPlan $plan,
		array $operation_results,
		?InventoryProductWriteRequestPlan $write_request_plan = null
	): self {
		return new self(
			self::STATUS_EXECUTED,
			$plan,
			array(),
			array(),
			$operation_results,
			$write_request_plan
		);
	}

	/**
	 * @param list<string>               $errors Execution errors.
	 * @param list<array<string, mixed>> $operation_results Writer result summaries.
	 */
	public static function rejected(
		InventoryProductProjectionPlan $plan,
		array $errors,
		array $operation_results = array(),
		?InventoryProductWriteRequestPlan $write_request_plan = null
	): self {
		return new self(
			self::STATUS_REJECTED,
			$plan,
			array(),
			array_values( array_unique( $errors ) ),
			$operation_results,
			$write_request_plan
		);
	}

	public static function skipped(
		InventoryProductProjectionPlan $plan,
		?InventoryProductWriteRequestPlan $write_request_plan = null
	): self {
		return new self(
			self::STATUS_SKIPPED,
			$plan,
			array(),
			array(),
			array(),
			$write_request_plan
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_blocked(): bool {
		return self::STATUS_BLOCKED === $this->status;
	}

	public function is_executed(): bool {
		return self::STATUS_EXECUTED === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	public function is_skipped(): bool {
		return self::STATUS_SKIPPED === $this->status;
	}

	/**
	 * @return list<string>
	 */
	public function block_reasons(): array {
		return $this->block_reasons;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function operation_results(): array {
		return $this->operation_results;
	}

	public function write_request_plan(): ?InventoryProductWriteRequestPlan {
		return $this->write_request_plan;
	}

	public function operation_count(): int {
		return $this->plan->operation_count();
	}

	public function executed_operation_count(): int {
		return $this->is_executed() ? count( $this->operation_results ) : 0;
	}

	/**
	 * @return list<int>
	 */
	public function product_ids(): array {
		if ( ! $this->is_executed() ) {
			return array();
		}

		$product_ids = array();

		foreach ( $this->operation_results as $result ) {
			$product_id = $this->positive_int( $result['product_id'] ?? null );

			if ( null !== $product_id ) {
				$product_ids[] = $product_id;
			}
		}

		return array_values( array_unique( $product_ids ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'                                     => 'woocommerce_product_projection_execution',
			'status'                                     => $this->status,
			'is_blocked'                                 => $this->is_blocked(),
			'is_executed'                                => $this->is_executed(),
			'is_rejected'                                => $this->is_rejected(),
			'is_skipped'                                 => $this->is_skipped(),
			'projection_status'                          => $this->plan->status(),
			'projection_code'                            => $this->plan->code(),
			'idempotency_key'                            => $this->plan->idempotency_key(),
			'operation_count'                            => $this->operation_count(),
			'executed_operation_count'                   => $this->executed_operation_count(),
			'requires_product_creation'                  => $this->plan->requires_product_creation(),
			'product_ids'                                => $this->product_ids(),
			'block_reasons'                              => $this->block_reasons,
			'operation_results'                          => $this->operation_results,
			'woocommerce_write_request_status'           => null !== $this->write_request_plan
				? $this->write_request_plan->status()
				: 'not_planned',
			'woocommerce_write_request_code'             => null !== $this->write_request_plan
				? $this->write_request_plan->code()
				: '',
			'woocommerce_write_request_environment'      => null !== $this->write_request_plan
				? $this->write_request_plan->environment()
				: '',
			'woocommerce_write_request_ready'            => null !== $this->write_request_plan
				&& $this->write_request_plan->is_ready(),
			'woocommerce_write_request_idempotency_keys' => null !== $this->write_request_plan
				? $this->write_request_plan->idempotency_keys()
				: array(),
			'woocommerce_write_request_external_ids'     => null !== $this->write_request_plan
				? $this->write_request_plan->external_ids()
				: array(
					'product_ids' => array(),
					'skus'        => array(),
				),
			'woocommerce_write_request_plan'             => null !== $this->write_request_plan
				? $this->write_request_plan->request_plan()
				: array(),
			'woocommerce_write_request_errors'           => null !== $this->write_request_plan
				? $this->write_request_plan->errors()
				: array(),
			'explicit_execution_required'                => true,
			'woocommerce_write_deferred'                 => ! $this->is_executed(),
			'woocommerce_product_writer_deferred'        => ! $this->is_executed(),
			'square_inventory_write_deferred'            => true,
			'payment_capture_deferred'                   => true,
			'external_network_request_deferred'          => true,
			'production_woocommerce_write_deferred'      => ! (
				$this->is_executed()
				&& null !== $this->write_request_plan
				&& true === ( $this->write_request_plan->request_plan()['production_write_approved'] ?? false )
			),
			'source_of_truth'                            => 'tcg_store_platform',
			'errors'                                     => $this->errors,
		);
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
}
