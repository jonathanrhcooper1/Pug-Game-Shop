<?php
/**
 * Inventory intake repository result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventoryIntakeRepositoryResult {
	public const STATUS_INSERTED = 'inserted';
	public const STATUS_REJECTED = 'rejected';

	/**
	 * @param array<string, mixed> $response_payload Created inventory response payload.
	 * @param list<string>         $errors Repository errors.
	 * @param array<string, mixed> $plan_audit Persistence plan audit payload.
	 */
	private function __construct(
		private string $status,
		private ?int $rows_affected,
		private ?int $insert_id,
		private array $response_payload,
		private array $errors,
		private array $plan_audit
	) {
	}

	public static function inserted(
		InventoryIntakePersistencePlan $plan,
		int $rows_affected,
		?int $insert_id
	): self {
		$row = $plan->insert_row();

		return new self(
			self::STATUS_INSERTED,
			$rows_affected,
			$insert_id,
			array(
				'inventory_id' => $insert_id,
				'public_id'    => (string) ( $row['public_id'] ?? '' ),
				'barcode'      => (string) ( $row['barcode'] ?? '' ),
				'sku'          => (string) ( $row['sku'] ?? '' ),
				'status'       => (string) ( $row['status'] ?? '' ),
				'row_version'  => (int) ( $row['row_version'] ?? 1 ),
			),
			array(),
			$plan->audit_payload()
		);
	}

	/**
	 * @param list<string> $errors Repository errors.
	 */
	public static function rejected(
		InventoryIntakePersistencePlan $plan,
		array $errors,
		?int $rows_affected = null
	): self {
		return new self(
			self::STATUS_REJECTED,
			$rows_affected,
			null,
			array(),
			array_values( array_unique( $errors ) ),
			$plan->audit_payload()
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_inserted(): bool {
		return self::STATUS_INSERTED === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	public function rows_affected(): ?int {
		return $this->rows_affected;
	}

	public function insert_id(): ?int {
		return $this->insert_id;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function response_payload(): array {
		return $this->response_payload;
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
			'action'                               => 'inventory_intake_repository_insert',
			'status'                               => $this->status,
			'is_inserted'                          => $this->is_inserted(),
			'is_rejected'                          => $this->is_rejected(),
			'rows_affected'                        => $this->rows_affected,
			'insert_id'                            => $this->insert_id,
			'response_public_id'                   => (string) ( $this->response_payload['public_id'] ?? '' ),
			'plan'                                 => $this->plan_audit,
			'repository_execution_deferred'        => false,
			'route_registration_deferred'          => true,
			'route_connected_writes_deferred'      => true,
			'woocommerce_projection_deferred'      => true,
			'square_inventory_projection_deferred' => true,
			'label_print_deferred'                 => true,
			'errors'                               => $this->errors,
		);
	}
}
