<?php
/**
 * Planned WooCommerce product projection payloads.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

final class InventoryProductProjectionPlan {
	public const READY   = 'ready';
	public const SKIPPED = 'skipped';
	public const FAILED  = 'failed';

	/**
	 * @param list<array<string, mixed>> $product_operations Planned WooCommerce product operations.
	 * @param list<array<string, mixed>> $audit_events Audit-safe projection events.
	 * @param list<string>               $errors Projection errors or skip reasons.
	 */
	private function __construct(
		private string $status,
		private string $code,
		private string $idempotency_key,
		private array $product_operations,
		private array $audit_events,
		private array $errors,
		private bool $requires_product_creation
	) {
	}

	/**
	 * @param list<array<string, mixed>> $product_operations Planned WooCommerce product operations.
	 * @param list<array<string, mixed>> $audit_events Audit-safe projection events.
	 * @param list<string>               $errors Projection warnings.
	 */
	public static function ready(
		string $code,
		string $idempotency_key,
		array $product_operations,
		array $audit_events,
		bool $requires_product_creation,
		array $errors = array()
	): self {
		return new self(
			self::READY,
			$code,
			$idempotency_key,
			$product_operations,
			$audit_events,
			array_values( array_unique( $errors ) ),
			$requires_product_creation
		);
	}

	/**
	 * @param list<string>               $errors Projection skip reasons.
	 * @param list<array<string, mixed>> $audit_events Audit-safe projection events.
	 */
	public static function skipped( string $code, string $idempotency_key, array $errors, array $audit_events ): self {
		return new self(
			self::SKIPPED,
			$code,
			$idempotency_key,
			array(),
			$audit_events,
			array_values( array_unique( $errors ) ),
			false
		);
	}

	/**
	 * @param list<string> $errors Projection errors.
	 */
	public static function failed( string $code, string $idempotency_key, array $errors ): self {
		return new self(
			self::FAILED,
			$code,
			$idempotency_key,
			array(),
			array(),
			array_values( array_unique( $errors ) ),
			false
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function code(): string {
		return $this->code;
	}

	public function idempotency_key(): string {
		return $this->idempotency_key;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function product_operations(): array {
		return $this->product_operations;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function audit_events(): array {
		return $this->audit_events;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	public function requires_product_creation(): bool {
		return $this->requires_product_creation;
	}

	public function operation_count(): int {
		return count( $this->product_operations );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function projection_contract(): array {
		return array(
			'provider'                        => 'woocommerce',
			'status'                          => $this->status,
			'code'                            => $this->code,
			'idempotency_key'                 => $this->idempotency_key,
			'product_operations'              => $this->product_operations,
			'operation_count'                 => $this->operation_count(),
			'requires_product_creation'       => $this->requires_product_creation,
			'source_of_truth'                 => 'tcg_store_platform',
			'woocommerce_write_deferred'      => true,
			'payment_capture_deferred'        => true,
			'square_inventory_write_deferred' => true,
			'network_request_deferred'        => true,
			'errors'                          => $this->errors,
		);
	}
}
