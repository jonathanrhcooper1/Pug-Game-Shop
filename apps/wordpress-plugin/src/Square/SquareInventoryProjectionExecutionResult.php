<?php
/**
 * Square inventory projection execution result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Square;

final class SquareInventoryProjectionExecutionResult {
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
		private SquareInventoryProjectionPlan $plan,
		private array $block_reasons,
		private array $errors,
		private array $operation_results
	) {
	}

	/**
	 * @param list<string> $block_reasons Execution block reasons.
	 */
	public static function blocked( SquareInventoryProjectionPlan $plan, array $block_reasons ): self {
		return new self(
			self::STATUS_BLOCKED,
			$plan,
			array_values( array_unique( $block_reasons ) ),
			array(),
			array()
		);
	}

	/**
	 * @param list<array<string, mixed>> $operation_results Writer result summaries.
	 */
	public static function executed( SquareInventoryProjectionPlan $plan, array $operation_results ): self {
		return new self(
			self::STATUS_EXECUTED,
			$plan,
			array(),
			array(),
			$operation_results
		);
	}

	/**
	 * @param list<string>               $errors Execution errors.
	 * @param list<array<string, mixed>> $operation_results Writer result summaries.
	 */
	public static function rejected(
		SquareInventoryProjectionPlan $plan,
		array $errors,
		array $operation_results = array()
	): self {
		return new self(
			self::STATUS_REJECTED,
			$plan,
			array(),
			array_values( array_unique( $errors ) ),
			$operation_results
		);
	}

	public static function skipped( SquareInventoryProjectionPlan $plan ): self {
		return new self(
			self::STATUS_SKIPPED,
			$plan,
			array(),
			array(),
			array()
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

	public function operation_count(): int {
		return $this->plan->operation_count();
	}

	public function executed_operation_count(): int {
		return $this->is_executed() ? count( $this->operation_results ) : 0;
	}

	/**
	 * @return list<string>
	 */
	public function catalog_object_ids(): array {
		if ( ! $this->is_executed() ) {
			return array();
		}

		$ids = array();

		foreach ( $this->operation_results as $result ) {
			$id = $this->string_value( $result['catalog_object_id'] ?? '' );

			if ( '' !== $id ) {
				$ids[] = $id;
			}
		}

		return array_values( array_unique( $ids ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array_merge(
			array(
				'action'                              => 'square_inventory_projection_execution',
				'status'                              => $this->status,
				'is_blocked'                          => $this->is_blocked(),
				'is_executed'                         => $this->is_executed(),
				'is_rejected'                         => $this->is_rejected(),
				'is_skipped'                          => $this->is_skipped(),
				'projection_status'                   => $this->plan->status(),
				'projection_code'                     => $this->plan->code(),
				'idempotency_key'                     => $this->plan->idempotency_key(),
				'operation_count'                     => $this->operation_count(),
				'executed_operation_count'            => $this->executed_operation_count(),
				'catalog_object_count'                => count( $this->plan->catalog_objects() ),
				'inventory_change_count'              => count( $this->plan->inventory_changes() ),
				'requires_catalog_id_resolution'      => $this->plan->requires_catalog_id_resolution(),
				'catalog_object_ids'                  => $this->catalog_object_ids(),
				'block_reasons'                       => $this->block_reasons,
				'operation_results'                   => $this->operation_results,
				'explicit_execution_required'         => true,
				'provider_inventory_write_deferred'   => ! $this->is_executed(),
				'square_catalog_write_deferred'       => ! $this->is_executed(),
				'square_inventory_write_deferred'     => ! $this->is_executed(),
				'network_request_deferred'            => ! $this->is_executed(),
				'production_provider_write_deferred'  => true,
				'production_network_request_deferred' => true,
			),
			SquarePaymentDelegationPolicy::audit_payload(),
			array(
				'source_of_truth' => 'tcg_store_platform',
				'errors'          => $this->errors,
			)
		);
	}

	private function string_value( mixed $value ): string {
		return substr( trim( (string) ( is_array( $value ) || is_object( $value ) ? '' : $value ) ), 0, 191 );
	}
}
