<?php
/**
 * Planned Square catalog and inventory projection payloads.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Square;

final class SquareInventoryProjectionPlan {
	public const READY   = 'ready';
	public const SKIPPED = 'skipped';
	public const FAILED  = 'failed';

	/**
	 * @param list<array<string, mixed>> $catalog_objects Square CatalogObject payloads.
	 * @param list<array<string, mixed>> $inventory_changes Square InventoryChange payloads.
	 * @param list<array<string, mixed>> $audit_events Audit-safe projection events.
	 * @param list<string> $errors Projection errors or skip reasons.
	 */
	private function __construct(
		private string $status,
		private string $code,
		private string $idempotency_key,
		private array $catalog_objects,
		private array $inventory_changes,
		private array $audit_events,
		private array $errors,
		private bool $requires_catalog_id_resolution
	) {
	}

	/**
	 * @param list<array<string, mixed>> $catalog_objects Square CatalogObject payloads.
	 * @param list<array<string, mixed>> $inventory_changes Square InventoryChange payloads.
	 * @param list<array<string, mixed>> $audit_events Audit-safe projection events.
	 * @param list<string> $errors Projection warnings.
	 */
	public static function ready(
		string $code,
		string $idempotency_key,
		array $catalog_objects,
		array $inventory_changes,
		array $audit_events,
		bool $requires_catalog_id_resolution,
		array $errors = array()
	): self {
		return new self(
			self::READY,
			$code,
			$idempotency_key,
			$catalog_objects,
			$inventory_changes,
			$audit_events,
			array_values( array_unique( $errors ) ),
			$requires_catalog_id_resolution
		);
	}

	/**
	 * @param list<string> $errors Projection skip reasons.
	 * @param list<array<string, mixed>> $audit_events Audit-safe projection events.
	 */
	public static function skipped( string $code, string $idempotency_key, array $errors, array $audit_events ): self {
		return new self(
			self::SKIPPED,
			$code,
			$idempotency_key,
			array(),
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
	public function catalog_objects(): array {
		return $this->catalog_objects;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function inventory_changes(): array {
		return $this->inventory_changes;
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

	public function requires_catalog_id_resolution(): bool {
		return $this->requires_catalog_id_resolution;
	}

	public function operation_count(): int {
		return count( $this->catalog_objects ) + count( $this->inventory_changes );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function projection_contract(): array {
		return array_merge(
			array(
				'provider'                          => 'square',
				'status'                            => $this->status,
				'code'                              => $this->code,
				'idempotency_key'                   => $this->idempotency_key,
				'catalog_objects'                   => $this->catalog_objects,
				'inventory_changes'                 => $this->inventory_changes,
				'operation_count'                   => $this->operation_count(),
				'requires_catalog_id_resolution'    => $this->requires_catalog_id_resolution,
				'source_of_truth'                   => 'tcg_store_platform',
				'provider_inventory_write_deferred' => true,
				'network_request_deferred'          => true,
			),
			SquarePaymentDelegationPolicy::audit_payload(),
			array(
				'errors' => $this->errors,
			)
		);
	}
}
