<?php
/**
 * Non-production WooCommerce product write request planner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

final class InventoryProductWriteRequestPlanner {
	private const PRODUCTS_PATH               = '/wp-json/wc/v3/products';
	private const NON_PRODUCTION_ENVIRONMENTS = array( 'local', 'development', 'staging', 'test' );
	private const SUPPORTED_OPERATIONS        = array(
		'create_product',
		'update_product',
		'mark_product_out_of_stock',
		'mark_grouped_product_out_of_stock',
	);

	/**
	 * @param array<string, mixed> $context Request planning context.
	 */
	public function plan(
		InventoryProductProjectionPlan $projection_plan,
		array $context = array()
	): InventoryProductWriteRequestPlan {
		$environment = $this->environment( $context['environment'] ?? 'local' );
		$approved    = $this->production_write_approved( $environment, $context );
		$errors      = $this->validation_errors( $projection_plan, $environment, $approved );

		if ( array() !== $errors ) {
			return InventoryProductWriteRequestPlan::rejected( $projection_plan, $environment, $errors );
		}

		if ( InventoryProductProjectionPlan::SKIPPED === $projection_plan->status() ) {
			return InventoryProductWriteRequestPlan::skipped(
				$projection_plan,
				$environment,
				$this->empty_request_plan()
			);
		}

		return InventoryProductWriteRequestPlan::ready(
			$projection_plan,
			$environment,
			$this->request_plan( $projection_plan, $approved )
		);
	}

	/**
	 * @return list<string>
	 */
	private function validation_errors(
		InventoryProductProjectionPlan $projection_plan,
		string $environment,
		bool $production_write_approved
	): array {
		$errors = array();

		if ( ! in_array( $environment, self::NON_PRODUCTION_ENVIRONMENTS, true ) && ! $production_write_approved ) {
			$errors[] = 'woocommerce_product_write_non_production_environment_required';
		}

		if ( InventoryProductProjectionPlan::FAILED === $projection_plan->status() ) {
			$errors[] = 'woocommerce_product_projection_failed';
		}

		if ( '' === trim( $projection_plan->idempotency_key() ) ) {
			$errors[] = 'woocommerce_projection_idempotency_key_required';
		}

		if (
			InventoryProductProjectionPlan::READY === $projection_plan->status()
			&& 0 === $projection_plan->operation_count()
		) {
			$errors[] = 'woocommerce_product_projection_operations_required';
		}

		foreach ( $projection_plan->product_operations() as $index => $operation ) {
			$operation_type = $this->string_value( $operation['operation'] ?? '' );

			if ( ! in_array( $operation_type, self::SUPPORTED_OPERATIONS, true ) ) {
				$errors[] = 'woocommerce_product_operation_' . (string) $index . '_unsupported';
			}

			if ( 'create_product' !== $operation_type && null === $this->positive_int( $operation['product_id'] ?? null ) ) {
				$errors[] = 'woocommerce_product_operation_' . (string) $index . '_product_id_required';
			}

			if ( ! is_array( $operation['product'] ?? null ) ) {
				$errors[] = 'woocommerce_product_operation_' . (string) $index . '_payload_required';
			}
		}

		return array_values( array_unique( $errors ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function request_plan( InventoryProductProjectionPlan $projection_plan, bool $production_write_approved ): array {
		$requests = array();

		foreach ( $projection_plan->product_operations() as $index => $operation ) {
			$product_id     = $this->positive_int( $operation['product_id'] ?? null );
			$operation_type = $this->string_value( $operation['operation'] ?? '' );
			$body           = is_array( $operation['product'] ?? null ) ? $operation['product'] : array();
			$method         = 'create_product' === $operation_type ? 'POST' : 'PUT';

			$requests[] = array(
				'operation'       => $operation_type,
				'method'          => $method,
				'path'            => $this->path( $product_id ),
				'product_id'      => $product_id,
				'idempotency_key' => $projection_plan->idempotency_key() . ':woocommerce:' . (string) $index,
				'body'            => $body,
				'write_scope'     => $production_write_approved ? 'approved_production_product_sync' : 'non_production_product_sync',
			);
		}

		return array(
			'requests'                      => $requests,
			'request_count'                 => count( $requests ),
			'woocommerce_write_deferred'    => true,
			'wordpress_crud_write_deferred' => true,
			'production_write_approved'     => $production_write_approved,
		);
	}

	/**
	 * @return array{requests:array{},request_count:0,woocommerce_write_deferred:true,wordpress_crud_write_deferred:true}
	 */
	private function empty_request_plan(): array {
		return array(
			'requests'                      => array(),
			'request_count'                 => 0,
			'woocommerce_write_deferred'    => true,
			'wordpress_crud_write_deferred' => true,
			'production_write_approved'     => false,
		);
	}

	private function path( ?int $product_id ): string {
		if ( null === $product_id ) {
			return self::PRODUCTS_PATH;
		}

		return self::PRODUCTS_PATH . '/' . (string) $product_id;
	}

	private function environment( mixed $value ): string {
		$value = strtolower( trim( (string) $value ) );

		return 'dev' === $value ? 'development' : $value;
	}

	/**
	 * @param array<string, mixed> $context Request planning context.
	 */
	private function production_write_approved( string $environment, array $context ): bool {
		if ( in_array( $environment, self::NON_PRODUCTION_ENVIRONMENTS, true ) ) {
			return false;
		}

		return 'woocommerce-product-sync' === trim( (string) ( $context['production_write_approval'] ?? '' ) );
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

	private function string_value( mixed $value ): string {
		return substr( trim( (string) ( is_array( $value ) || is_object( $value ) ? '' : $value ) ), 0, 191 );
	}
}
