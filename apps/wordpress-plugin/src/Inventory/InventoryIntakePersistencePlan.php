<?php
/**
 * Plan-only inventory intake persistence contract.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventoryIntakePersistencePlan {
	public const STATUS_PLANNED  = 'planned';
	public const STATUS_REJECTED = 'rejected';

	/**
	 * @param array<string, mixed> $insert_row Insert row payload.
	 * @param list<mixed>         $prepare_args Prepared SQL arguments.
	 * @param list<string>        $errors Validation/planning errors.
	 * @param array<string, mixed> $audit Audit metadata.
	 */
	private function __construct(
		private string $status,
		private string $table_name,
		private array $insert_row,
		private string $insert_sql_template,
		private array $prepare_args,
		private array $errors,
		private array $audit
	) {
	}

	/**
	 * @param array<string, mixed> $insert_row Insert row payload.
	 * @param list<mixed>         $prepare_args Prepared SQL arguments.
	 * @param array<string, mixed> $audit Audit metadata.
	 */
	public static function planned(
		string $table_name,
		array $insert_row,
		string $insert_sql_template,
		array $prepare_args,
		array $audit
	): self {
		return new self(
			self::STATUS_PLANNED,
			$table_name,
			$insert_row,
			$insert_sql_template,
			array_values( $prepare_args ),
			array(),
			$audit
		);
	}

	/**
	 * @param list<string>         $errors Validation/planning errors.
	 * @param array<string, mixed> $audit Audit metadata.
	 */
	public static function rejected( string $table_name, array $errors, array $audit = array() ): self {
		return new self(
			self::STATUS_REJECTED,
			$table_name,
			array(),
			'',
			array(),
			array_values( array_unique( $errors ) ),
			$audit
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_valid(): bool {
		return self::STATUS_PLANNED === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	public function table_name(): string {
		return $this->table_name;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function insert_row(): array {
		return $this->insert_row;
	}

	public function insert_sql_template(): string {
		return $this->insert_sql_template;
	}

	/**
	 * @return list<mixed>
	 */
	public function prepare_args(): array {
		return $this->prepare_args;
	}

	public function prepare_arg_count(): int {
		return count( $this->prepare_args );
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
		return array_merge(
			array(
				'action'                               => 'inventory_intake_persistence_plan',
				'status'                               => $this->status,
				'planned'                              => $this->is_valid(),
				'is_rejected'                          => $this->is_rejected(),
				'table_name'                           => $this->table_name,
				'column_count'                         => count( $this->insert_row ),
				'prepare_arg_count'                    => count( $this->prepare_args ),
				'route_registration_deferred'          => true,
				'route_connected_writes_deferred'      => true,
				'inventory_repository_deferred'        => true,
				'woocommerce_projection_deferred'      => true,
				'square_inventory_projection_deferred' => true,
				'label_print_deferred'                 => true,
				'errors'                               => $this->errors,
			),
			$this->audit
		);
	}
}
