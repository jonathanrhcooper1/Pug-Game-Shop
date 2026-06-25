<?php
/**
 * Plan-only inventory search read queries.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventorySearchQueryPlanner {
	private const TABLE            = 'tcg_inventory_items';
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

	/**
	 * @var array<string, array<string, string>>
	 */
	private const SORT_MAP = array(
		'relevance'    => array(
			'card_name'    => 'ASC',
			'set_code'     => 'ASC',
			'card_number'  => 'ASC',
			'inventory_id' => 'ASC',
		),
		'updated_desc' => array(
			'updated_at'   => 'DESC',
			'inventory_id' => 'DESC',
		),
		'price_asc'    => array(
			'sale_price'   => 'ASC',
			'inventory_id' => 'ASC',
		),
		'price_desc'   => array(
			'sale_price'   => 'DESC',
			'inventory_id' => 'ASC',
		),
		'name_asc'     => array(
			'card_name'    => 'ASC',
			'inventory_id' => 'ASC',
		),
	);

	public function plan( InventorySearchRequest $request, string $table_prefix ): InventorySearchQueryPlan {
		$errors       = array();
		$table_prefix = trim( $table_prefix );
		$statuses     = $this->statuses_for_visibility( $request );
		$filters      = array(
			'query'              => $request->query(),
			'game'               => $request->game(),
			'set_filter'         => $request->set_filter(),
			'raw_or_graded'      => $request->raw_or_graded(),
			'updated_after'      => $request->updated_after(),
			'requested_statuses' => $request->statuses(),
			'statuses'           => $statuses,
			'location_id'        => $request->location_id(),
			'visibility'         => $request->visibility(),
			'sort'               => $request->sort(),
			'page'               => $request->page(),
			'page_size'          => $request->page_size(),
		);

		if ( '' === $table_prefix || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix ) ) {
			$errors[] = 'table_prefix_invalid';
		}

		if ( ! isset( self::SORT_MAP[ $request->sort() ] ) ) {
			$errors[] = 'sort_unsupported';
		}

		if ( array() !== $errors ) {
			return InventorySearchQueryPlan::rejected( $filters, $errors );
		}

		return InventorySearchQueryPlan::accepted(
			$table_prefix,
			$table_prefix . self::TABLE,
			$filters,
			$this->where_contract( $request, $statuses ),
			self::SELECTED_COLUMNS,
			self::SORT_MAP[ $request->sort() ],
			$request->page_size(),
			( $request->page() - 1 ) * $request->page_size()
		);
	}

	/**
	 * @return list<string>
	 */
	private function statuses_for_visibility( InventorySearchRequest $request ): array {
		if ( array() !== $request->statuses() ) {
			return $request->statuses();
		}

		if ( 'public' === $request->visibility() ) {
			return array( InventoryStatus::AVAILABLE );
		}

		return array();
	}

	/**
	 * @param list<string> $statuses Status filters.
	 * @return array<string, mixed>
	 */
	private function where_contract( InventorySearchRequest $request, array $statuses ): array {
		$where = array(
			'visibility_context' => $request->visibility(),
		);

		if ( '' !== $request->query() ) {
			$where['text_query'] = array(
				'value'   => $request->query(),
				'like'    => '%' . $request->query() . '%',
				'columns' => $this->search_columns( $request->visibility() ),
			);
		}

		if ( '' !== $request->game() ) {
			$where['game'] = $request->game();
		}

		if ( '' !== $request->set_filter() ) {
			$where['set_filter'] = array(
				'value'   => $request->set_filter(),
				'like'    => '%' . $request->set_filter() . '%',
				'columns' => array( 'set_name', 'set_code' ),
			);
		}

		if ( '' !== $request->raw_or_graded() ) {
			$where['raw_or_graded'] = $request->raw_or_graded();
		}

		if ( '' !== $request->updated_after() ) {
			$where['updated_after'] = $request->updated_after();
		}

		if ( array() !== $statuses ) {
			$where['status_in'] = $statuses;
		}

		if ( null !== $request->location_id() ) {
			$where['location_id'] = $request->location_id();
		}

		if ( 'public' === $request->visibility() ) {
			$where['online_visibility'] = 'visible';
		}

		if ( 'hidden' === $request->visibility() ) {
			$where['online_visibility'] = 'hidden';
		}

		return $where;
	}

	/**
	 * @return list<string>
	 */
	private function search_columns( string $visibility ): array {
		$columns = array( 'card_name', 'set_name', 'set_code', 'card_number' );

		if ( 'public' !== $visibility ) {
			$columns[] = 'barcode';
			$columns[] = 'sku';
			$columns[] = 'cert_number';
		}

		return $columns;
	}
}
