<?php
/**
 * Guarded WooCommerce product projection executor.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

use Throwable;

final class InventoryProductProjectionExecutor {
	/**
	 * @var callable|null
	 */
	private $product_writer;

	public function __construct(
		private bool $execution_enabled = false,
		?callable $product_writer = null,
		private ?InventoryProductWriteRequestPlanner $request_planner = null,
		private array $request_context = array()
	) {
		$this->product_writer = $product_writer;
	}

	public function execute( InventoryProductProjectionPlan $plan ): InventoryProductProjectionExecutionResult {
		$write_request_plan = $this->request_planner()->plan( $plan, $this->request_context );

		if ( InventoryProductProjectionPlan::FAILED === $plan->status() ) {
			return InventoryProductProjectionExecutionResult::rejected(
				$plan,
				array_merge(
					array( 'woocommerce_product_projection_plan_failed' ),
					$plan->errors()
				),
				array(),
				$write_request_plan
			);
		}

		if ( InventoryProductProjectionPlan::SKIPPED === $plan->status() ) {
			return InventoryProductProjectionExecutionResult::skipped( $plan, $write_request_plan );
		}

		if ( $write_request_plan->is_rejected() ) {
			return InventoryProductProjectionExecutionResult::rejected(
				$plan,
				array_merge(
					array( 'woocommerce_product_write_request_rejected' ),
					$write_request_plan->errors()
				),
				array(),
				$write_request_plan
			);
		}

		$block_reasons = array();

		if ( ! $this->execution_enabled ) {
			$block_reasons[] = 'woocommerce_product_projection_execution_disabled';
			$block_reasons[] = 'explicit_woocommerce_projection_execution_required';
		}

		if ( ! is_callable( $this->product_writer ) ) {
			$block_reasons[] = 'woocommerce_product_writer_deferred';
		}

		if ( 0 === $plan->operation_count() ) {
			$block_reasons[] = 'woocommerce_product_projection_no_operations';
		}

		if ( array() !== $block_reasons ) {
			return InventoryProductProjectionExecutionResult::blocked( $plan, $block_reasons, $write_request_plan );
		}

		$results = array();
		$errors  = array();

		foreach ( $plan->product_operations() as $index => $operation ) {
			try {
				$result    = ( $this->product_writer )( $operation, $plan, $index );
				$results[] = $this->writer_result( $operation, $result, $index );
			} catch ( Throwable ) {
				$errors[] = 'woocommerce_product_writer_failed';
			}
		}

		foreach ( $results as $result ) {
			if ( true === ( $result['failed'] ?? false ) ) {
				$errors[] = 'woocommerce_product_writer_failed';
			}
		}

		if ( array() !== $errors ) {
			return InventoryProductProjectionExecutionResult::rejected( $plan, $errors, $results, $write_request_plan );
		}

		return InventoryProductProjectionExecutionResult::executed( $plan, $results, $write_request_plan );
	}

	public function execution_enabled(): bool {
		return $this->execution_enabled;
	}

	public function product_writer_configured(): bool {
		return is_callable( $this->product_writer );
	}

	private function request_planner(): InventoryProductWriteRequestPlanner {
		if ( null === $this->request_planner ) {
			$this->request_planner = new InventoryProductWriteRequestPlanner();
		}

		return $this->request_planner;
	}

	/**
	 * @param array<string, mixed> $operation Planned WooCommerce operation.
	 * @param mixed                $result Writer return value.
	 * @return array<string, mixed>
	 */
	private function writer_result( array $operation, mixed $result, int $index ): array {
		$result         = is_array( $result ) ? $result : array();
		$operation_name = $this->string_value( $operation['operation'] ?? '' );
		$product        = is_array( $operation['product'] ?? null ) ? $operation['product'] : array();
		$product_id     = $this->positive_int( $result['product_id'] ?? $result['id'] ?? $operation['product_id'] ?? $product['id'] ?? null );
		$status         = $this->string_value( $result['status'] ?? 'written' );
		$failed         = in_array( $status, array( 'failed', 'error', 'rejected' ), true );

		return array(
			'index'                     => $index,
			'operation'                 => $operation_name,
			'status'                    => '' === $status ? 'written' : $status,
			'failed'                    => $failed,
			'product_id'                => $product_id,
			'requires_product_creation' => true === ( $operation['requires_product_creation'] ?? false ),
		);
	}

	private function string_value( mixed $value ): string {
		return substr( trim( (string) ( is_array( $value ) || is_object( $value ) ? '' : $value ) ), 0, 191 );
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
