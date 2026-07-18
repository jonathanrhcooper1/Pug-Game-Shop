<?php
/**
 * Prepared SQL template plan for inventory search reads.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventorySearchQueryBuildPlan {
	/**
	 * @param array<string, mixed> $query        Prepared read query metadata.
	 * @param list<string>         $errors       Query build errors.
	 * @param array<string, mixed> $source_audit Source planner audit payload.
	 */
	private function __construct(
		private bool $is_valid,
		private string $table_name,
		private array $query,
		private array $errors,
		private array $source_audit
	) {
	}

	/**
	 * @param array<string, mixed> $query Prepared read query metadata.
	 */
	public static function accepted( InventorySearchQueryPlan $query_plan, array $query ): self {
		return new self(
			true,
			$query_plan->table_name(),
			$query,
			array(),
			$query_plan->audit_payload()
		);
	}

	/**
	 * @param list<string> $errors Query build errors.
	 */
	public static function rejected( InventorySearchQueryPlan $query_plan, array $errors ): self {
		return new self(
			false,
			$query_plan->table_name(),
			array(),
			array_values( array_unique( $errors ) ),
			$query_plan->audit_payload()
		);
	}

	public function is_valid(): bool {
		return $this->is_valid;
	}

	public function table_name(): string {
		return $this->table_name;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function query(): array {
		return $this->query;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	public function select_prepare_arg_count(): int {
		return count( $this->query['select_prepare_args'] ?? array() );
	}

	public function count_prepare_arg_count(): int {
		return count( $this->query['count_prepare_args'] ?? array() );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'                               => 'inventory_search_query_sql_planned',
			'is_valid'                             => $this->is_valid,
			'table_name'                           => $this->table_name,
			'select_prepare_arg_count'             => $this->select_prepare_arg_count(),
			'count_prepare_arg_count'              => $this->count_prepare_arg_count(),
			'source'                               => $this->source_audit,
			'sql_query_ready'                      => $this->is_valid,
			'read_execution_deferred'              => true,
			'inventory_repository_deferred'        => true,
			'route_registration_deferred'          => true,
			'route_connected_writes_deferred'      => true,
			'woocommerce_projection_deferred'      => true,
			'square_inventory_projection_deferred' => true,
			'errors'                               => $this->errors,
		);
	}
}
