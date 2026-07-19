<?php
/**
 * Planned inventory search read query.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventorySearchQueryPlan {
	/**
	 * @param array<string, mixed>  $filters          Normalized request filters.
	 * @param array<string, mixed>  $where            Safe where contract.
	 * @param list<string>          $selected_columns Columns safe for repository reads.
	 * @param array<string, string> $order_by         Stable ordering contract.
	 * @param list<string>          $errors           Planning errors.
	 */
	private function __construct(
		private bool $is_valid,
		private string $table_prefix,
		private string $table_name,
		private array $filters,
		private array $where,
		private array $selected_columns,
		private array $order_by,
		private int $limit,
		private int $offset,
		private array $errors
	) {
	}

	/**
	 * @param array<string, mixed>  $filters          Normalized request filters.
	 * @param array<string, mixed>  $where            Safe where contract.
	 * @param list<string>          $selected_columns Columns safe for repository reads.
	 * @param array<string, string> $order_by         Stable ordering contract.
	 */
	public static function accepted(
		string $table_prefix,
		string $table_name,
		array $filters,
		array $where,
		array $selected_columns,
		array $order_by,
		int $limit,
		int $offset
	): self {
		return new self(
			true,
			trim( $table_prefix ),
			trim( $table_name ),
			$filters,
			$where,
			array_values( $selected_columns ),
			$order_by,
			$limit,
			$offset,
			array()
		);
	}

	/**
	 * @param array<string, mixed> $filters Normalized request filters.
	 * @param list<string>        $errors  Planning errors.
	 */
	public static function rejected( array $filters, array $errors ): self {
		return new self(
			false,
			'',
			'',
			$filters,
			array(),
			array(),
			array(),
			0,
			0,
			array_values( array_unique( $errors ) )
		);
	}

	public function is_valid(): bool {
		return $this->is_valid;
	}

	public function table_prefix(): string {
		return $this->table_prefix;
	}

	public function table_name(): string {
		return $this->table_name;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function filters(): array {
		return $this->filters;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function where(): array {
		return $this->where;
	}

	/**
	 * @return list<string>
	 */
	public function selected_columns(): array {
		return $this->selected_columns;
	}

	/**
	 * @return array<string, string>
	 */
	public function order_by(): array {
		return $this->order_by;
	}

	public function limit(): int {
		return $this->limit;
	}

	public function offset(): int {
		return $this->offset;
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
	public function query_contract(): array {
		return array(
			'table_name'                           => $this->table_name,
			'filters'                              => $this->filters,
			'where'                                => $this->where,
			'selected_columns'                     => $this->selected_columns,
			'order_by'                             => $this->order_by,
			'limit'                                => $this->limit,
			'offset'                               => $this->offset,
			'query_ready'                          => $this->is_valid,
			'read_execution_deferred'              => true,
			'route_registration_deferred'          => true,
			'route_connected_writes_deferred'      => true,
			'woocommerce_projection_deferred'      => true,
			'square_inventory_projection_deferred' => true,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'                               => 'inventory_search_query_planned',
			'is_valid'                             => $this->is_valid,
			'table_name'                           => $this->table_name,
			'visibility'                           => $this->filters['visibility'] ?? '',
			'filter_count'                         => count( array_filter( $this->filters, fn ( mixed $value ): bool => array() !== $value && '' !== $value && null !== $value && false !== $value ) ),
			'limit'                                => $this->limit,
			'offset'                               => $this->offset,
			'query_ready'                          => $this->is_valid,
			'read_execution_deferred'              => true,
			'route_connected_writes_deferred'      => true,
			'woocommerce_projection_deferred'      => true,
			'square_inventory_projection_deferred' => true,
			'errors'                               => $this->errors,
		);
	}
}
