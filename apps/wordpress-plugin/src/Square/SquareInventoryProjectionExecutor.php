<?php
/**
 * Guarded Square catalog and inventory projection executor.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Square;

use Throwable;

final class SquareInventoryProjectionExecutor {
	/**
	 * @var callable|null
	 */
	private $catalog_writer;

	/**
	 * @var callable|null
	 */
	private $inventory_writer;

	/**
	 * @param array<string, mixed> $request_context Square request planning context.
	 */
	public function __construct(
		private bool $execution_enabled = false,
		?callable $catalog_writer = null,
		?callable $inventory_writer = null,
		private ?SquareInventorySyncRequestPlanner $request_planner = null,
		private array $request_context = array()
	) {
		$this->catalog_writer   = $catalog_writer;
		$this->inventory_writer = $inventory_writer;
	}

	public function execute( SquareInventoryProjectionPlan $plan ): SquareInventoryProjectionExecutionResult {
		$sync_request_plan = $this->request_planner()->plan( $plan, $this->request_context );

		if ( SquareInventoryProjectionPlan::FAILED === $plan->status() ) {
			return SquareInventoryProjectionExecutionResult::rejected(
				$plan,
				array_merge(
					array( 'square_inventory_projection_plan_failed' ),
					$plan->errors()
				),
				array(),
				$sync_request_plan
			);
		}

		if ( SquareInventoryProjectionPlan::SKIPPED === $plan->status() ) {
			return SquareInventoryProjectionExecutionResult::skipped( $plan, $sync_request_plan );
		}

		if ( $sync_request_plan->is_rejected() ) {
			return SquareInventoryProjectionExecutionResult::rejected(
				$plan,
				array_merge(
					array( 'square_inventory_sync_request_rejected' ),
					$sync_request_plan->errors()
				),
				array(),
				$sync_request_plan
			);
		}

		$block_reasons = array();

		if ( ! $this->execution_enabled ) {
			$block_reasons[] = 'square_inventory_projection_execution_disabled';
			$block_reasons[] = 'explicit_square_inventory_execution_required';
		}

		if ( array() !== $plan->catalog_objects() && ! is_callable( $this->catalog_writer ) ) {
			$block_reasons[] = 'square_catalog_writer_deferred';
		}

		if ( array() !== $plan->inventory_changes() && ! is_callable( $this->inventory_writer ) ) {
			$block_reasons[] = 'square_inventory_writer_deferred';
		}

		if ( 0 === $plan->operation_count() ) {
			$block_reasons[] = 'square_inventory_projection_no_operations';
		}

		if ( array() !== $block_reasons ) {
			return SquareInventoryProjectionExecutionResult::blocked( $plan, $block_reasons, $sync_request_plan );
		}

		$results = array();
		$errors  = array();

		foreach ( $plan->catalog_objects() as $index => $catalog_object ) {
			try {
				$result    = ( $this->catalog_writer )( $catalog_object, $plan, $index );
				$results[] = $this->writer_result( 'catalog_upsert', $catalog_object, $result, $index );
			} catch ( Throwable ) {
				$errors[] = 'square_catalog_writer_failed';
			}
		}

		foreach ( $plan->inventory_changes() as $index => $inventory_change ) {
			try {
				$result    = ( $this->inventory_writer )( $inventory_change, $plan, $index );
				$results[] = $this->writer_result( 'inventory_change', $inventory_change, $result, $index );
			} catch ( Throwable ) {
				$errors[] = 'square_inventory_writer_failed';
			}
		}

		foreach ( $results as $result ) {
			if ( true === ( $result['failed'] ?? false ) ) {
				$errors[] = 'square_projection_writer_failed';
			}
		}

		if ( array() !== $errors ) {
			return SquareInventoryProjectionExecutionResult::rejected( $plan, $errors, $results, $sync_request_plan );
		}

		return SquareInventoryProjectionExecutionResult::executed( $plan, $results, $sync_request_plan );
	}

	public function execution_enabled(): bool {
		return $this->execution_enabled;
	}

	public function catalog_writer_configured(): bool {
		return is_callable( $this->catalog_writer );
	}

	public function inventory_writer_configured(): bool {
		return is_callable( $this->inventory_writer );
	}

	private function request_planner(): SquareInventorySyncRequestPlanner {
		if ( null === $this->request_planner ) {
			$this->request_planner = new SquareInventorySyncRequestPlanner();
		}

		return $this->request_planner;
	}

	/**
	 * @param array<string, mixed> $payload Planned Square payload.
	 * @param mixed                $result Writer return value.
	 * @return array<string, mixed>
	 */
	private function writer_result( string $operation, array $payload, mixed $result, int $index ): array {
		$result            = is_array( $result ) ? $result : array();
		$status            = $this->string_value( $result['status'] ?? 'written' );
		$catalog_object_id = $this->catalog_object_id( $operation, $payload, $result );
		$failed            = in_array( $status, array( 'failed', 'error', 'rejected' ), true );

		return array(
			'index'             => $index,
			'operation'         => $operation,
			'status'            => '' === $status ? 'written' : $status,
			'failed'            => $failed,
			'catalog_object_id' => $catalog_object_id,
		);
	}

	/**
	 * @param array<string, mixed> $payload Planned Square payload.
	 * @param array<string, mixed> $result Writer result.
	 */
	private function catalog_object_id( string $operation, array $payload, array $result ): string {
		$id = $this->string_value( $result['catalog_object_id'] ?? $result['id'] ?? '' );

		if ( '' !== $id ) {
			return $id;
		}

		if ( 'catalog_upsert' === $operation ) {
			return $this->string_value( $payload['id'] ?? '' );
		}

		$physical_count = is_array( $payload['physical_count'] ?? null ) ? $payload['physical_count'] : array();

		return $this->string_value( $physical_count['catalog_object_id'] ?? '' );
	}

	private function string_value( mixed $value ): string {
		return substr( trim( (string) ( is_array( $value ) || is_object( $value ) ? '' : $value ) ), 0, 191 );
	}
}
