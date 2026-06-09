<?php
/**
 * Planned WooCommerce product write request envelope.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

final class InventoryProductWriteRequestPlan {
	public const READY    = 'ready';
	public const REJECTED = 'rejected';
	public const SKIPPED  = 'skipped';

	/**
	 * @param array<string, mixed> $request_plan Planned WooCommerce write request envelope.
	 * @param list<string>         $errors Validation errors.
	 */
	private function __construct(
		private string $status,
		private string $code,
		private InventoryProductProjectionPlan $projection_plan,
		private string $environment,
		private array $request_plan,
		private array $errors
	) {
	}

	/**
	 * @param array<string, mixed> $request_plan Planned WooCommerce write request envelope.
	 */
	public static function ready(
		InventoryProductProjectionPlan $projection_plan,
		string $environment,
		array $request_plan
	): self {
		return new self(
			self::READY,
			'woocommerce_product_write_request_ready',
			$projection_plan,
			$environment,
			$request_plan,
			array()
		);
	}

	/**
	 * @param array<string, mixed> $request_plan Planned WooCommerce write request envelope.
	 */
	public static function skipped(
		InventoryProductProjectionPlan $projection_plan,
		string $environment,
		array $request_plan
	): self {
		return new self(
			self::SKIPPED,
			'woocommerce_product_projection_skipped',
			$projection_plan,
			$environment,
			$request_plan,
			array()
		);
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	public static function rejected(
		InventoryProductProjectionPlan $projection_plan,
		string $environment,
		array $errors
	): self {
		return new self(
			self::REJECTED,
			'woocommerce_product_write_request_rejected',
			$projection_plan,
			$environment,
			array(),
			array_values( array_unique( $errors ) )
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function code(): string {
		return $this->code;
	}

	public function environment(): string {
		return $this->environment;
	}

	public function is_ready(): bool {
		return self::READY === $this->status;
	}

	public function is_rejected(): bool {
		return self::REJECTED === $this->status;
	}

	public function is_skipped(): bool {
		return self::SKIPPED === $this->status;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function request_plan(): array {
		return $this->request_plan;
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
	public function idempotency_keys(): array {
		$keys = array();

		foreach ( $this->requests() as $request ) {
			$key = $this->string_value( $request['idempotency_key'] ?? '' );

			if ( '' !== $key ) {
				$keys[] = $key;
			}
		}

		if ( array() === $keys && '' !== $this->projection_plan->idempotency_key() ) {
			$keys[] = $this->projection_plan->idempotency_key();
		}

		return array_values( array_unique( $keys ) );
	}

	/**
	 * @return array{product_ids:list<int>,skus:list<string>}
	 */
	public function external_ids(): array {
		$product_ids = array();
		$skus        = array();

		foreach ( $this->requests() as $request ) {
			$product_id = $this->positive_int( $request['product_id'] ?? null );
			$sku        = $this->string_value( $request['body']['sku'] ?? '' );

			if ( null !== $product_id ) {
				$product_ids[] = $product_id;
			}

			if ( '' !== $sku ) {
				$skus[] = $sku;
			}
		}

		return array(
			'product_ids' => array_values( array_unique( $product_ids ) ),
			'skus'        => array_values( array_unique( $skus ) ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'                                => 'woocommerce_product_write_request_plan',
			'status'                                => $this->status,
			'code'                                  => $this->code,
			'environment'                           => $this->environment,
			'projection_status'                     => $this->projection_plan->status(),
			'projection_code'                       => $this->projection_plan->code(),
			'idempotency_keys'                      => $this->idempotency_keys(),
			'external_ids'                          => $this->external_ids(),
			'request_plan'                          => $this->request_plan,
			'woocommerce_write_deferred'            => true,
			'wordpress_crud_write_deferred'         => true,
			'external_network_request_deferred'     => true,
			'production_woocommerce_write_deferred' => true !== ( $this->request_plan['production_write_approved'] ?? false ),
			'production_write_approved'             => true === ( $this->request_plan['production_write_approved'] ?? false ),
			'payment_capture_deferred'              => true,
			'square_inventory_write_deferred'       => true,
			'source_of_truth'                       => 'tcg_store_platform',
			'errors'                                => $this->errors,
		);
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function requests(): array {
		$requests = $this->request_plan['requests'] ?? array();

		return is_array( $requests ) ? $requests : array();
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
