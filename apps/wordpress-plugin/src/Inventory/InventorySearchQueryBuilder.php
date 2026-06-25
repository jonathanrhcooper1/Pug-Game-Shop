<?php
/**
 * Inventory search prepared SQL template builder.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventorySearchQueryBuilder {
	private const SELECTED_COLUMNS = array(
		'inventory_id',
		'public_id',
		'game',
		'card_name',
		'set_name',
		'set_code',
		'card_number',
		'printed_number',
		'year',
		'rarity',
		'rarity_code',
		'variant',
		'finish',
		'parallel_name',
		'language',
		'raw_or_graded',
		'condition_code',
		'grading_company',
		'grade',
		'cert_number',
		'barcode',
		'sku',
		'cost',
		'cost_currency',
		'market_price',
		'market_price_currency',
		'suggested_price',
		'sale_price',
		'minimum_sale_price',
		'sale_currency',
		'price_lock',
		'price_floor_hit',
		'location_id',
		'online_visibility',
		'kiosk_visibility',
		'pos_visibility',
		'status',
		'woocommerce_product_id',
		'square_catalog_item_id',
		'square_catalog_variation_id',
		'square_location_id',
		'external_sync_state',
		'last_external_sync_at',
		'front_image_remote_url',
		'back_image_remote_url',
		'notes',
		'staff_notes',
		'updated_at',
		'row_version',
	);

	private const SEARCH_COLUMNS = array(
		'card_name',
		'set_name',
		'set_code',
		'card_number',
		'barcode',
		'sku',
		'cert_number',
	);

	/**
	 * @var list<array<string, string>>
	 */
	private const SORTS = array(
		array(
			'card_name'    => 'ASC',
			'set_code'     => 'ASC',
			'card_number'  => 'ASC',
			'inventory_id' => 'ASC',
		),
		array(
			'updated_at'   => 'DESC',
			'inventory_id' => 'DESC',
		),
		array(
			'sale_price'   => 'ASC',
			'inventory_id' => 'ASC',
		),
		array(
			'sale_price'   => 'DESC',
			'inventory_id' => 'ASC',
		),
		array(
			'card_name'    => 'ASC',
			'inventory_id' => 'ASC',
		),
	);

	public function build( InventorySearchQueryPlan $query_plan ): InventorySearchQueryBuildPlan {
		$errors = array();

		if ( ! $query_plan->is_valid() ) {
			$errors[] = 'inventory_search_query_plan_invalid';
			$errors   = array_merge( $errors, $query_plan->errors() );
		}

		if ( ! $this->is_identifier( $query_plan->table_name() ) ) {
			$errors[] = 'table_name_invalid';
		}

		if ( 1 !== preg_match( '/^[A-Za-z0-9_]*tcg_inventory_items$/', $query_plan->table_name() ) ) {
			$errors[] = 'table_unsupported';
		}

		if ( self::SELECTED_COLUMNS !== $query_plan->selected_columns() ) {
			$errors[] = 'selected_columns_unsupported';
		}

		if ( ! $this->selected_columns_are_safe( $query_plan->selected_columns() ) ) {
			$errors[] = 'selected_columns_invalid';
		}

		if ( ! in_array( $query_plan->order_by(), self::SORTS, true ) ) {
			$errors[] = 'order_by_unsupported';
		}

		if ( ! $this->order_by_is_safe( $query_plan->order_by() ) ) {
			$errors[] = 'order_by_invalid';
		}

		if ( $query_plan->limit() <= 0 || $query_plan->limit() > 100 ) {
			$errors[] = 'limit_unsupported';
		}

		if ( $query_plan->offset() < 0 ) {
			$errors[] = 'offset_unsupported';
		}

		$this->validate_where( $query_plan->where(), $errors );

		if ( array() !== $errors ) {
			return InventorySearchQueryBuildPlan::rejected( $query_plan, $errors );
		}

		return InventorySearchQueryBuildPlan::accepted(
			$query_plan,
			$this->build_query( $query_plan )
		);
	}

	/**
	 * @param array<string, mixed> $where  Safe where contract.
	 * @param list<string>         $errors Build errors.
	 */
	private function validate_where( array $where, array &$errors ): void {
		$allowed_keys = array(
			'visibility_context',
			'text_query',
			'game',
			'set_filter',
			'raw_or_graded',
			'status_in',
			'location_id',
			'online_visibility',
		);

		foreach ( array_keys( $where ) as $key ) {
			if ( ! in_array( (string) $key, $allowed_keys, true ) ) {
				$errors[] = 'where_key_unsupported';
			}
		}

		$visibility_context = (string) ( $where['visibility_context'] ?? '' );
		if ( '' !== $visibility_context && ! in_array( $visibility_context, array( 'public', 'staff', 'hidden', 'all' ), true ) ) {
			$errors[] = 'visibility_context_invalid';
		}

		if ( array_key_exists( 'text_query', $where ) ) {
			$this->validate_text_query( $where['text_query'], $errors );
		}

		if ( array_key_exists( 'set_filter', $where ) ) {
			$this->validate_text_query( $where['set_filter'], $errors );
		}

		$game = (string) ( $where['game'] ?? '' );
		if ( '' !== $game && 1 !== preg_match( '/^[a-z0-9_-]{2,64}$/', $game ) ) {
			$errors[] = 'game_invalid';
		}

		$raw_or_graded = (string) ( $where['raw_or_graded'] ?? '' );
		if ( '' !== $raw_or_graded && ! in_array( $raw_or_graded, array( 'raw', 'graded' ), true ) ) {
			$errors[] = 'raw_or_graded_invalid';
		}

		if ( array_key_exists( 'status_in', $where ) ) {
			$statuses = $where['status_in'];

			if ( ! is_array( $statuses ) || array() === $statuses ) {
				$errors[] = 'status_in_invalid';
			} else {
				foreach ( $statuses as $status ) {
					if ( ! InventoryStatus::is_valid( (string) $status ) ) {
						$errors[] = 'status_in_invalid';
					}
				}
			}
		}

		if ( array_key_exists( 'location_id', $where ) && ( ! is_int( $where['location_id'] ) || $where['location_id'] <= 0 ) ) {
			$errors[] = 'location_id_invalid';
		}

		$online_visibility = (string) ( $where['online_visibility'] ?? '' );
		if ( '' !== $online_visibility && ! in_array( $online_visibility, array( 'hidden', 'visible', 'staff_only' ), true ) ) {
			$errors[] = 'online_visibility_invalid';
		}
	}

	/**
	 * @param mixed        $text_query Text-query contract.
	 * @param list<string> $errors     Build errors.
	 */
	private function validate_text_query( mixed $text_query, array &$errors ): void {
		if ( ! is_array( $text_query ) ) {
			$errors[] = 'text_query_invalid';

			return;
		}

		$value   = trim( (string) ( $text_query['value'] ?? '' ) );
		$like    = (string) ( $text_query['like'] ?? '' );
		$columns = $text_query['columns'] ?? array();

		if ( '' === $value || strlen( $value ) > 120 || '' === $like ) {
			$errors[] = 'text_query_invalid';
		}

		if ( ! is_array( $columns ) || array() === $columns ) {
			$errors[] = 'text_query_columns_invalid';

			return;
		}

		foreach ( $columns as $column ) {
			if ( ! in_array( (string) $column, self::SEARCH_COLUMNS, true ) ) {
				$errors[] = 'text_query_columns_invalid';
			}
		}
	}

	/**
	 * @return array<string, mixed>
	 */
	private function build_query( InventorySearchQueryPlan $query_plan ): array {
		$where_parts = $this->where_sql( $query_plan->where() );
		$order_sql   = $this->order_by_sql( $query_plan->order_by() );

		$select_sql_template = sprintf(
			'SELECT %s FROM %s',
			implode( ', ', array_map( array( $this, 'quote_identifier' ), $query_plan->selected_columns() ) ),
			$this->quote_identifier( $query_plan->table_name() )
		);
		$count_sql_template  = sprintf(
			'SELECT COUNT(*) FROM %s',
			$this->quote_identifier( $query_plan->table_name() )
		);

		if ( '' !== $where_parts['sql'] ) {
			$select_sql_template .= ' WHERE ' . $where_parts['sql'];
			$count_sql_template  .= ' WHERE ' . $where_parts['sql'];
		}

		$select_sql_template  .= ' ORDER BY ' . $order_sql . ' LIMIT %d OFFSET %d';
		$select_prepare_args   = $where_parts['args'];
		$select_prepare_args[] = $query_plan->limit();
		$select_prepare_args[] = $query_plan->offset();

		return array(
			'table_name'                           => $query_plan->table_name(),
			'filters'                              => $query_plan->filters(),
			'where'                                => $query_plan->where(),
			'selected_columns'                     => $query_plan->selected_columns(),
			'order_by'                             => $query_plan->order_by(),
			'limit'                                => $query_plan->limit(),
			'offset'                               => $query_plan->offset(),
			'select_sql_template'                  => $select_sql_template,
			'select_prepare_args'                  => $select_prepare_args,
			'count_sql_template'                   => $count_sql_template,
			'count_prepare_args'                   => $where_parts['args'],
			'read_execution_deferred'              => true,
			'inventory_repository_deferred'        => true,
			'route_registration_deferred'          => true,
			'route_connected_writes_deferred'      => true,
			'woocommerce_projection_deferred'      => true,
			'square_inventory_projection_deferred' => true,
		);
	}

	/**
	 * @param array<string, mixed> $where Safe where contract.
	 * @return array{sql: string, args: list<mixed>}
	 */
	private function where_sql( array $where ): array {
		$where_clauses = array();
		$prepare_args  = array();

		if ( isset( $where['text_query'] ) && is_array( $where['text_query'] ) ) {
			$text_query = $where['text_query'];
			$columns    = array_values( $text_query['columns'] ?? array() );
			$or_clauses = array();

			foreach ( $columns as $column ) {
				$or_clauses[]   = sprintf( '%s LIKE %%s', $this->quote_identifier( (string) $column ) );
				$prepare_args[] = (string) $text_query['like'];
			}

			if ( array() !== $or_clauses ) {
				$where_clauses[] = '(' . implode( ' OR ', $or_clauses ) . ')';
			}
		}

		if ( isset( $where['game'] ) ) {
			$where_clauses[] = '`game` = %s';
			$prepare_args[]  = (string) $where['game'];
		}

		if ( isset( $where['set_filter'] ) && is_array( $where['set_filter'] ) ) {
			$set_filter = $where['set_filter'];
			$columns    = array_values( $set_filter['columns'] ?? array() );
			$or_clauses = array();

			foreach ( $columns as $column ) {
				$or_clauses[]   = sprintf( '%s LIKE %%s', $this->quote_identifier( (string) $column ) );
				$prepare_args[] = (string) $set_filter['like'];
			}

			if ( array() !== $or_clauses ) {
				$where_clauses[] = '(' . implode( ' OR ', $or_clauses ) . ')';
			}
		}

		if ( isset( $where['raw_or_graded'] ) ) {
			$where_clauses[] = '`raw_or_graded` = %s';
			$prepare_args[]  = (string) $where['raw_or_graded'];
		}

		if ( isset( $where['status_in'] ) && is_array( $where['status_in'] ) ) {
			$placeholders    = array_fill( 0, count( $where['status_in'] ), '%s' );
			$where_clauses[] = '`status` IN (' . implode( ', ', $placeholders ) . ')';

			foreach ( $where['status_in'] as $status ) {
				$prepare_args[] = (string) $status;
			}
		}

		if ( isset( $where['location_id'] ) ) {
			$where_clauses[] = '`location_id` = %d';
			$prepare_args[]  = (int) $where['location_id'];
		}

		if ( isset( $where['online_visibility'] ) ) {
			$where_clauses[] = '`online_visibility` = %s';
			$prepare_args[]  = (string) $where['online_visibility'];
		}

		return array(
			'sql'  => implode( ' AND ', $where_clauses ),
			'args' => $prepare_args,
		);
	}

	/**
	 * @param array<string, string> $order_by Stable ordering contract.
	 */
	private function order_by_sql( array $order_by ): string {
		$parts = array();

		foreach ( $order_by as $column => $direction ) {
			$parts[] = sprintf(
				'%s %s',
				$this->quote_identifier( (string) $column ),
				strtoupper( (string) $direction )
			);
		}

		return implode( ', ', $parts );
	}

	/**
	 * @param list<string> $columns Selected columns.
	 */
	private function selected_columns_are_safe( array $columns ): bool {
		foreach ( $columns as $column ) {
			if ( ! $this->is_identifier( $column ) || ! in_array( $column, self::SELECTED_COLUMNS, true ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * @param array<string, string> $order_by Stable ordering contract.
	 */
	private function order_by_is_safe( array $order_by ): bool {
		foreach ( $order_by as $column => $direction ) {
			if ( ! $this->is_identifier( (string) $column ) || ! in_array( (string) $column, self::SELECTED_COLUMNS, true ) ) {
				return false;
			}

			if ( ! in_array( strtoupper( (string) $direction ), array( 'ASC', 'DESC' ), true ) ) {
				return false;
			}
		}

		return array() !== $order_by;
	}

	private function quote_identifier( string $identifier ): string {
		return '`' . $identifier . '`';
	}

	private function is_identifier( string $value ): bool {
		return '' !== $value && 1 === preg_match( '/^[A-Za-z0-9_]+$/', $value );
	}
}
