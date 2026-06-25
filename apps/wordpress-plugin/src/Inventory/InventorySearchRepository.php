<?php
/**
 * Inventory search wpdb repository adapter.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventorySearchRepository {
	private \wpdb $database;
	private InventorySearchQueryBuilder $query_builder;

	public function __construct(
		\wpdb $database,
		?InventorySearchQueryBuilder $query_builder = null
	) {
		$this->database      = $database;
		$this->query_builder = $query_builder ?? new InventorySearchQueryBuilder();
	}

	public function fetch( InventorySearchQueryPlan $query_plan ): InventorySearchRepositoryResult {
		$query_build_plan = $this->query_builder->build( $query_plan );

		if ( ! $query_build_plan->is_valid() ) {
			return InventorySearchRepositoryResult::rejected(
				$query_build_plan,
				$query_build_plan->errors()
			);
		}

		$table_errors = $this->validate_table_name( $query_build_plan );
		if ( array() !== $table_errors ) {
			return InventorySearchRepositoryResult::rejected(
				$query_build_plan,
				$table_errors
			);
		}

		$query               = $query_build_plan->query();
		$select_prepared_sql = $this->database->prepare(
			$query['select_sql_template'], // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$query['select_prepare_args']
		);
		$rows                = $this->get_results( $select_prepared_sql );

		if ( ! is_array( $rows ) ) {
			return InventorySearchRepositoryResult::rejected(
				$query_build_plan,
				array( 'inventory_search_query_failed' ),
				$this->fetch_audit( $query, 0, 0 )
			);
		}

		$count_prepared_sql = $this->database->prepare(
			$query['count_sql_template'], // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$query['count_prepare_args']
		);
		$total              = $this->get_count( $count_prepared_sql );

		if ( null === $total ) {
			return InventorySearchRepositoryResult::rejected(
				$query_build_plan,
				array( 'inventory_search_count_failed' ),
				$this->fetch_audit( $query, count( $rows ), 0 )
			);
		}

		$inventory_rows = $this->inventory_rows( $rows, $errors );
		if ( array() !== $errors ) {
			return InventorySearchRepositoryResult::rejected(
				$query_build_plan,
				$errors,
				$this->fetch_audit( $query, count( $inventory_rows ), $total )
			);
		}

		return InventorySearchRepositoryResult::fetched(
			$query_build_plan,
			$inventory_rows,
			$total,
			$this->fetch_audit( $query, count( $inventory_rows ), $total )
		);
	}

	/**
	 * @return list<string>
	 */
	private function validate_table_name( InventorySearchQueryBuildPlan $query_build_plan ): array {
		$prefix = (string) ( $this->database->prefix ?? '' );
		$query  = $query_build_plan->query();

		if (
			'' === $prefix
			|| 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $prefix )
			|| ( $query['table_name'] ?? '' ) !== $prefix . 'tcg_inventory_items'
		) {
			return array( 'inventory_search_table_prefix_mismatch' );
		}

		return array();
	}

	/**
	 * @return list<array<string, mixed>>|false
	 */
	private function get_results( string $prepared_sql ): array|false {
		if ( ! method_exists( $this->database, 'get_results' ) ) {
			return false;
		}

		$rows = $this->database->get_results(
			$prepared_sql, // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$this->array_a_output_type()
		);

		return is_array( $rows ) ? $rows : false;
	}

	private function get_count( string $prepared_sql ): ?int {
		if ( method_exists( $this->database, 'get_var' ) ) {
			$value = $this->database->get_var(
				$prepared_sql // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			);

			return $this->non_negative_int( $value );
		}

		$rows = $this->get_results( $prepared_sql );

		if ( ! is_array( $rows ) || ! isset( $rows[0] ) || ! is_array( $rows[0] ) ) {
			return null;
		}

		return $this->non_negative_int( reset( $rows[0] ) );
	}

	/**
	 * @param list<array<string, mixed>> $rows Database rows.
	 * @param list<string>              $errors Row normalization errors.
	 * @return list<array<string, mixed>>
	 */
	private function inventory_rows( array $rows, ?array &$errors ): array {
		$errors         = array();
		$inventory_rows = array();

		foreach ( array_values( $rows ) as $index => $row ) {
			if ( ! is_array( $row ) ) {
				$errors[] = 'inventory_search_row_' . $index . '_invalid';
				continue;
			}

			$inventory_row = $this->inventory_row( $row, $index, $errors );

			if ( null !== $inventory_row ) {
				$inventory_rows[] = $inventory_row;
			}
		}

		return $inventory_rows;
	}

	/**
	 * @param array<string, mixed> $row Database row.
	 * @param list<string>         $errors Row normalization errors.
	 * @return array<string, mixed>|null
	 */
	private function inventory_row( array $row, int $index, array &$errors ): ?array {
		$row_errors    = array();
		$inventory_id  = $this->positive_int( $row['inventory_id'] ?? null );
		$public_id     = $this->entity_id( $row['public_id'] ?? null );
		$game          = $this->slugish( $row['game'] ?? null );
		$card_name     = $this->required_string( $row['card_name'] ?? null );
		$raw_or_graded = $this->raw_or_graded( $row['raw_or_graded'] ?? null );
		$status        = $this->status( $row['status'] ?? null );
		$sale_currency = $this->currency( $row['sale_currency'] ?? null );
		$row_version   = $this->positive_int( $row['row_version'] ?? null );
		$updated_at    = $this->utc_timestamp( $row['updated_at'] ?? null );

		foreach (
			array(
				'inventory_id'  => $inventory_id,
				'public_id'     => $public_id,
				'game'          => $game,
				'card_name'     => $card_name,
				'raw_or_graded' => $raw_or_graded,
				'status'        => $status,
				'sale_currency' => $sale_currency,
				'row_version'   => $row_version,
				'updated_at'    => $updated_at,
			) as $field => $value
		) {
			if ( null === $value ) {
				$row_errors[] = 'inventory_search_row_' . $index . '_' . $field . '_invalid';
			}
		}

		if ( array() !== $row_errors ) {
			$errors = array_merge( $errors, $row_errors );

			return null;
		}

		return array(
			'inventory_id'           => $inventory_id,
			'public_id'              => $public_id,
			'game'                   => $game,
			'card_name'              => $card_name,
			'set_name'               => $this->nullable_string( $row['set_name'] ?? null ),
			'set_code'               => $this->nullable_string( $row['set_code'] ?? null ),
			'card_number'            => $this->nullable_string( $row['card_number'] ?? null ),
			'printed_number'         => $this->nullable_string( $row['printed_number'] ?? null ),
			'year'                   => $this->nullable_positive_int( $row['year'] ?? null ),
			'rarity'                 => $this->nullable_string( $row['rarity'] ?? null ),
			'rarity_code'            => $this->nullable_string( $row['rarity_code'] ?? null ),
			'variant'                => $this->nullable_string( $row['variant'] ?? null ),
			'finish'                 => $this->nullable_string( $row['finish'] ?? null ),
			'parallel_name'          => $this->nullable_string( $row['parallel_name'] ?? null ),
			'language'               => $this->nullable_string( $row['language'] ?? null ),
			'raw_or_graded'          => $raw_or_graded,
			'condition_code'         => $this->nullable_string( $row['condition_code'] ?? null ),
			'grading_company'        => $this->nullable_string( $row['grading_company'] ?? null ),
			'grade'                  => $this->nullable_string( $row['grade'] ?? null ),
			'cert_number'            => $this->nullable_string( $row['cert_number'] ?? null ),
			'barcode'                => $this->nullable_string( $row['barcode'] ?? null ),
			'sku'                    => $this->nullable_string( $row['sku'] ?? null ),
			'cost'                   => $this->decimal_string( $row['cost'] ?? null ),
			'cost_currency'          => $this->currency_or_null( $row['cost_currency'] ?? null ),
			'market_price'           => $this->decimal_string( $row['market_price'] ?? null ),
			'market_price_currency'  => $this->currency_or_null( $row['market_price_currency'] ?? null ),
			'suggested_price'        => $this->decimal_string( $row['suggested_price'] ?? null ),
			'sale_price'             => $this->decimal_string( $row['sale_price'] ?? null ),
			'minimum_sale_price'     => $this->decimal_string( $row['minimum_sale_price'] ?? null ),
			'sale_currency'          => $sale_currency,
			'price_lock'             => $this->bool_value( $row['price_lock'] ?? false ),
			'price_floor_hit'        => $this->bool_value( $row['price_floor_hit'] ?? false ),
			'location_id'            => $this->nullable_positive_int( $row['location_id'] ?? null ),
			'online_visibility'      => $this->nullable_visibility( $row['online_visibility'] ?? null ),
			'kiosk_visibility'       => $this->nullable_visibility( $row['kiosk_visibility'] ?? null ),
			'pos_visibility'         => $this->nullable_visibility( $row['pos_visibility'] ?? null ),
			'status'                 => $status,
			'woocommerce_product_id' => $this->nullable_positive_int( $row['woocommerce_product_id'] ?? null ),
			'square_catalog_item_id' => $this->nullable_string( $row['square_catalog_item_id'] ?? null ),
			'square_catalog_variation_id' => $this->nullable_string( $row['square_catalog_variation_id'] ?? null ),
			'square_location_id' => $this->nullable_string( $row['square_location_id'] ?? null ),
			'external_sync_state'    => $this->nullable_string( $row['external_sync_state'] ?? null ),
			'last_external_sync_at'  => $this->utc_timestamp( $row['last_external_sync_at'] ?? null ),
			'front_image_remote_url' => $this->nullable_string( $row['front_image_remote_url'] ?? null ),
			'back_image_remote_url'  => $this->nullable_string( $row['back_image_remote_url'] ?? null ),
			'notes'                  => $this->nullable_string( $row['notes'] ?? null ),
			'staff_notes'            => $this->nullable_string( $row['staff_notes'] ?? null ),
			'updated_at'             => $updated_at,
			'row_version'            => $row_version,
		);
	}

	/**
	 * @param array<string, mixed> $query Prepared query.
	 * @return array<string, mixed>
	 */
	private function fetch_audit( array $query, int $row_count, int $total ): array {
		return array(
			'table_name'                           => (string) ( $query['table_name'] ?? '' ),
			'row_count'                            => $row_count,
			'total'                                => $total,
			'select_prepare_arg_count'             => count( $query['select_prepare_args'] ?? array() ),
			'count_prepare_arg_count'              => count( $query['count_prepare_args'] ?? array() ),
			'read_execution_deferred'              => false,
			'inventory_repository_deferred'        => false,
			'route_registration_deferred'          => true,
			'route_connected_reads_deferred'       => true,
			'route_connected_writes_deferred'      => true,
			'woocommerce_projection_deferred'      => true,
			'square_inventory_projection_deferred' => true,
		);
	}

	private function entity_id( mixed $value ): ?string {
		$value = trim( (string) $value );

		return '' !== $value && 1 === preg_match( '/^[A-Za-z0-9_.:-]{1,191}$/', $value ) ? $value : null;
	}

	private function slugish( mixed $value ): ?string {
		$value = strtolower( trim( (string) $value ) );

		return 1 === preg_match( '/^[a-z0-9_-]{1,64}$/', $value ) ? $value : null;
	}

	private function required_string( mixed $value ): ?string {
		$value = trim( (string) $value );

		return '' === $value ? null : $value;
	}

	private function nullable_string( mixed $value ): ?string {
		$value = trim( (string) $value );

		return '' === $value ? null : $value;
	}

	private function raw_or_graded( mixed $value ): ?string {
		$value = strtolower( trim( (string) $value ) );

		return in_array( $value, array( 'raw', 'graded' ), true ) ? $value : null;
	}

	private function status( mixed $value ): ?string {
		$value = strtolower( trim( (string) $value ) );

		return InventoryStatus::is_valid( $value ) ? $value : null;
	}

	private function currency( mixed $value ): ?string {
		$value = strtoupper( trim( (string) $value ) );

		return 1 === preg_match( '/^[A-Z]{3}$/', $value ) ? $value : null;
	}

	private function currency_or_null( mixed $value ): ?string {
		if ( null === $value || '' === trim( (string) $value ) ) {
			return null;
		}

		return $this->currency( $value );
	}

	private function nullable_visibility( mixed $value ): ?string {
		$value = strtolower( trim( (string) $value ) );

		return in_array( $value, array( 'hidden', 'visible', 'staff_only' ), true ) ? $value : null;
	}

	private function positive_int( mixed $value ): ?int {
		$value = $this->int_value( $value );

		return null !== $value && 0 < $value ? $value : null;
	}

	private function nullable_positive_int( mixed $value ): ?int {
		if ( null === $value || '' === trim( (string) $value ) ) {
			return null;
		}

		return $this->positive_int( $value );
	}

	private function non_negative_int( mixed $value ): ?int {
		$value = $this->int_value( $value );

		return null !== $value && 0 <= $value ? $value : null;
	}

	private function int_value( mixed $value ): ?int {
		if ( is_int( $value ) ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return (int) $value;
		}

		return null;
	}

	private function decimal_string( mixed $value ): ?string {
		if ( null === $value || '' === trim( (string) $value ) ) {
			return null;
		}

		if ( ! is_numeric( $value ) || (float) $value < 0 ) {
			return null;
		}

		return number_format( (float) $value, 2, '.', '' );
	}

	private function utc_timestamp( mixed $value ): ?string {
		$value = trim( (string) $value );

		if ( '' === $value ) {
			return null;
		}

		try {
			$date = new \DateTimeImmutable( $value, new \DateTimeZone( 'UTC' ) );
		} catch ( \Exception ) {
			return null;
		}

		return $date->setTimezone( new \DateTimeZone( 'UTC' ) )->format( 'Y-m-d\TH:i:s.u\Z' );
	}

	private function bool_value( mixed $value ): bool {
		if ( is_bool( $value ) ) {
			return $value;
		}

		return in_array( strtolower( trim( (string) $value ) ), array( '1', 'true', 'yes', 'on' ), true );
	}

	private function array_a_output_type(): string {
		return defined( 'ARRAY_A' ) ? (string) constant( 'ARRAY_A' ) : 'ARRAY_A';
	}
}
