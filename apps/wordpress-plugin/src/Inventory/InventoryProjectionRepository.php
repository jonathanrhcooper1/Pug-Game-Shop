<?php
/**
 * Authoritative WordPress inventory projection persistence.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventoryProjectionRepository {
	private const STATUSES     = array( 'available', 'reserved', 'sold', 'pending_intake', 'return_review', 'damaged', 'removed' );
	private const VISIBILITIES = array( 'hidden', 'visible', 'staff_only' );

	public function __construct( private \wpdb $database ) {
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function find( string $identity ): ?array {
		$identity   = $this->identity( $identity );
		$table_name = $this->table_name();
		if ( '' === $identity || '' === $table_name ) {
			return null;
		}

		if ( 1 === preg_match( '/^\d+$/', $identity ) ) {
			$query = $this->database->prepare(
				"SELECT * FROM `{$table_name}` WHERE `inventory_id` = %d OR `public_id` = %s LIMIT 1",
				array( (int) $identity, $identity )
			);
		} else {
			$query = $this->database->prepare(
				"SELECT * FROM `{$table_name}` WHERE `public_id` = %s LIMIT 1",
				array( $identity )
			);
		}

		if ( ! is_string( $query ) || '' === $query ) {
			return null;
		}

		$row = $this->database->get_row( $query, $this->array_output_type() );

		return is_array( $row ) ? $row : null;
	}

	/**
	 * Apply an idempotent absolute-state update from the LAN source of truth.
	 *
	 * @param array<string, mixed> $payload Normalized REST payload.
	 * @return array<string, mixed>
	 */
	public function update_absolute( string $identity, array $payload, ?int $actor_user_id = null ): array {
		$current = $this->find( $identity );
		if ( null === $current ) {
			return $this->failure( 'inventory_projection_not_found', array( 'inventory_item_not_found' ), 404 );
		}

		$normalized = $this->normalize_update( $payload, $current, $actor_user_id );
		if ( array() !== $normalized['errors'] ) {
			return $this->failure( 'inventory_projection_invalid', $normalized['errors'], 422 );
		}

		$fields = $normalized['fields'];
		if ( $this->matches( $current, $fields ) ) {
			return array(
				'status'      => 'updated',
				'code'        => 'inventory_projection_already_current',
				'status_code' => 200,
				'idempotent'  => true,
				'changed'     => false,
				'row'         => $current,
				'errors'      => array(),
			);
		}

		if ( false === $this->database->query( 'START TRANSACTION' ) ) {
			return $this->failure( 'inventory_projection_transaction_failed', array( 'transaction_begin_failed' ), 500 );
		}

		$assignments = array();
		$arguments   = array();
		foreach ( $fields as $column => $value ) {
			$assignments[] = '`' . $column . '` = ' . ( is_int( $value ) ? '%d' : '%s' );
			$arguments[]   = $value;
		}
		$assignments[] = '`row_version` = `row_version` + 1';
		$arguments[]   = (int) $current['inventory_id'];
		$arguments[]   = (int) $current['row_version'];

		$table_name = $this->table_name();
		$query      = $this->database->prepare(
			"UPDATE `{$table_name}` SET " . implode( ', ', $assignments ) . ' WHERE `inventory_id` = %d AND `row_version` = %d LIMIT 1',
			$arguments
		);
		$rows       = is_string( $query ) ? $this->database->query( $query ) : false;

		if ( 1 !== $rows ) {
			$this->database->query( 'ROLLBACK' );

			return $this->failure(
				'inventory_projection_concurrent_update',
				array( false === $rows ? 'inventory_projection_update_failed' : 'inventory_projection_row_version_conflict' ),
				409
			);
		}

		if ( $this->price_changed( $current, $fields ) && ! $this->insert_price_log( $current, $fields, $actor_user_id ) ) {
			$this->database->query( 'ROLLBACK' );

			return $this->failure( 'inventory_projection_price_log_failed', array( 'price_change_log_insert_failed' ), 500 );
		}

		if ( false === $this->database->query( 'COMMIT' ) ) {
			$this->database->query( 'ROLLBACK' );

			return $this->failure( 'inventory_projection_commit_failed', array( 'transaction_commit_failed' ), 500 );
		}

		$updated = $this->find( (string) $current['public_id'] );

		return array(
			'status'      => 'updated',
			'code'        => 'inventory_projection_updated',
			'status_code' => 200,
			'idempotent'  => false,
			'changed'     => true,
			'row'         => is_array( $updated ) ? $updated : array_merge( $current, $fields ),
			'errors'      => array(),
		);
	}

	/**
	 * @param array<string, mixed> $seed Inventory row.
	 * @return list<array<string, mixed>>
	 */
	public function product_group_rows( array $seed ): array {
		$where = $this->group_where( $seed );
		if ( null === $where ) {
			return array( $seed );
		}

		$table_name = $this->table_name();
		$rows       = $this->database->get_results(
			"SELECT * FROM `{$table_name}` WHERE {$where} ORDER BY `condition_code`, `variant`, `finish`, `sale_price`, `inventory_id`",
			$this->array_output_type()
		);

		return is_array( $rows ) && array() !== $rows
			? array_values( array_filter( $rows, 'is_array' ) )
			: array( $seed );
	}

	/**
	 * @param list<int> $inventory_ids Inventory identifiers.
	 */
	public function mark_woocommerce_synced( array $inventory_ids, int $product_id ): bool {
		$inventory_ids = array_values( array_unique( array_filter( array_map( static fn ( mixed $value ): int => abs( (int) $value ), $inventory_ids ) ) ) );
		if ( array() === $inventory_ids || $product_id <= 0 ) {
			return false;
		}

		$placeholders = implode( ', ', array_fill( 0, count( $inventory_ids ), '%d' ) );
		$now          = gmdate( 'Y-m-d H:i:s.u' );
		$args         = array_merge( array( $product_id, 'synced', $now, $now ), $inventory_ids );
		$query        = $this->database->prepare(
			"UPDATE `{$this->table_name()}` SET `woocommerce_product_id` = %d, `external_sync_state` = %s, `last_external_sync_at` = %s, `updated_at` = %s, `row_version` = `row_version` + 1 WHERE `inventory_id` IN ({$placeholders})",
			$args
		);

		return is_string( $query ) && false !== $this->database->query( $query );
	}

	/**
	 * @param array<string, mixed> $payload Request payload.
	 * @param array<string, mixed> $current Current row.
	 * @return array{fields:array<string,int|string>,errors:list<string>}
	 */
	private function normalize_update( array $payload, array $current, ?int $actor_user_id ): array {
		$errors   = array();
		$quantity = $this->integer( $payload['quantity_on_hand'] ?? $payload['set_quantity'] ?? null );
		$status   = strtolower( $this->text( $payload['status'] ?? $current['status'] ?? '' ) );
		$sale     = $this->integer( $payload['sale_price_minor_units'] ?? null );
		$floor    = $this->integer( $payload['minimum_sale_price_minor_units'] ?? null );

		if ( null === $quantity || $quantity < 0 || $quantity > 999999 ) {
			$errors[] = 'quantity_on_hand_invalid';
		}
		if ( ! in_array( $status, self::STATUSES, true ) ) {
			$errors[] = 'status_invalid';
		}
		if ( null === $sale || $sale < 0 ) {
			$errors[] = 'sale_price_minor_units_invalid';
		}
		if ( null === $floor || $floor < 0 ) {
			$errors[] = 'minimum_sale_price_minor_units_invalid';
		}
		if ( null !== $sale && null !== $floor && $sale < $floor ) {
			$errors[] = 'sale_price_below_minimum';
		}

		$visibilities = array();
		foreach ( array( 'online_visibility', 'kiosk_visibility', 'pos_visibility' ) as $field ) {
			$value = strtolower( $this->text( $payload[ $field ] ?? $current[ $field ] ?? '' ) );
			if ( ! in_array( $value, self::VISIBILITIES, true ) ) {
				$errors[] = $field . '_invalid';
			}
			$visibilities[ $field ] = $value;
		}

		$barcode = strtoupper( preg_replace( '/[^0-9A-Z .\/$+%\-]/', '-', $this->text( $payload['barcode'] ?? $current['barcode'] ?? '' ) ) ?? '' );
		$barcode = trim( preg_replace( '/-+/', '-', $barcode ) ?? '', '-' );
		if ( '' === $barcode ) {
			$errors[] = 'barcode_required';
		}

		if ( array() !== $errors ) {
			return array(
				'fields' => array(),
				'errors' => array_values( array_unique( $errors ) ),
			);
		}

		$quantity = (int) $quantity;
		if ( 0 === $quantity && ! in_array( $status, array( 'sold', 'removed', 'damaged', 'return_review' ), true ) ) {
			$status = 'removed';
		}
		if ( $quantity > 0 && in_array( $status, array( 'sold', 'removed' ), true ) ) {
			$status = 'available';
		}

		$now    = gmdate( 'Y-m-d H:i:s.u' );
		$fields = array_merge(
			array(
				'quantity_on_hand'            => $quantity,
				'status'                      => $status,
				'barcode'                     => $barcode,
				'sku'                         => $barcode,
				'sale_price'                  => number_format( (int) $sale / 100, 2, '.', '' ),
				'minimum_sale_price'          => number_format( (int) $floor / 100, 2, '.', '' ),
				'sale_currency'               => 'USD',
				'pricing_source'              => $this->text( $payload['pricing_source'] ?? 'local_sync_server' ),
				'price_floor_hit'             => (int) $sale === (int) $floor ? 1 : 0,
				'square_catalog_item_id'      => $this->text( $payload['square_catalog_item_id'] ?? $current['square_catalog_item_id'] ?? '' ),
				'square_catalog_variation_id' => $this->text( $payload['square_catalog_variation_id'] ?? $current['square_catalog_variation_id'] ?? '' ),
				'external_sync_state'         => 'pending',
				'staff_notes'                 => $this->text( $payload['staff_notes'] ?? $current['staff_notes'] ?? '', 1000 ),
				'updated_by'                  => $actor_user_id ?? (int) ( $current['updated_by'] ?? 0 ),
				'updated_at'                  => $now,
			),
			$visibilities
		);
		if ( 'sold' === $status ) {
			$fields['date_sold'] = $now;
		}

		if ( array_key_exists( 'market_price_minor_units', $payload ) ) {
			$market = $this->integer( $payload['market_price_minor_units'] );
			if ( null !== $market && $market >= 0 ) {
				$fields['market_price']          = number_format( $market / 100, 2, '.', '' );
				$fields['market_price_currency'] = 'USD';
			}
		}

		return array(
			'fields' => $fields,
			'errors' => array(),
		);
	}

	/** @param array<string, mixed> $current @param array<string, mixed> $fields */
	private function matches( array $current, array $fields ): bool {
		foreach ( $fields as $column => $value ) {
			if ( in_array( $column, array( 'updated_at', 'external_sync_state', 'staff_notes', 'updated_by', 'date_sold' ), true ) ) {
				continue;
			}
			if ( (string) ( $current[ $column ] ?? '' ) !== (string) $value ) {
				return false;
			}
		}

		return true;
	}

	/** @param array<string, mixed> $current @param array<string, mixed> $fields */
	private function price_changed( array $current, array $fields ): bool {
		return (string) ( $current['sale_price'] ?? '' ) !== (string) ( $fields['sale_price'] ?? '' )
			|| (string) ( $current['minimum_sale_price'] ?? '' ) !== (string) ( $fields['minimum_sale_price'] ?? '' )
			|| ( isset( $fields['market_price'] ) && (string) ( $current['market_price'] ?? '' ) !== (string) $fields['market_price'] );
	}

	/** @param array<string, mixed> $current @param array<string, mixed> $fields */
	private function insert_price_log( array $current, array $fields, ?int $actor_user_id ): bool {
		$table = (string) $this->database->prefix . 'tcg_price_change_log';
		$now   = gmdate( 'Y-m-d H:i:s.u' );
		$id    = $this->stable_uuid( 'price:' . (string) $current['public_id'] . ':' . $now . ':' . (string) $current['row_version'] );
		$query = $this->database->prepare(
			"INSERT INTO `{$table}` (`public_id`, `inventory_id`, `old_market_price`, `new_market_price`, `old_sale_price`, `new_sale_price`, `minimum_sale_price`, `currency`, `floor_hit`, `change_source`, `reason`, `actor_user_id`, `created_at`) VALUES (%s, %d, %s, %s, %s, %s, %s, %s, %d, %s, %s, %d, %s)",
			array(
				$id,
				(int) $current['inventory_id'],
				(string) ( $current['market_price'] ?? '0.00' ),
				(string) ( $fields['market_price'] ?? $current['market_price'] ?? '0.00' ),
				(string) ( $current['sale_price'] ?? '0.00' ),
				(string) $fields['sale_price'],
				(string) $fields['minimum_sale_price'],
				'USD',
				(int) $fields['price_floor_hit'],
				(string) $fields['pricing_source'],
				'LAN authoritative projection',
				$actor_user_id ?? 0,
				$now,
			)
		);

		return is_string( $query ) && 1 === $this->database->query( $query );
	}

	/** @param array<string, mixed> $seed */
	private function group_where( array $seed ): ?string {
		$reference_id = (int) ( $seed['reference_card_id'] ?? 0 );
		if ( $reference_id > 0 ) {
			return $this->database->prepare( '`reference_card_id` = %d', array( $reference_id ) );
		}

		$provider = $this->text( $seed['provider_name'] ?? '' );
		$card_id  = $this->text( $seed['provider_card_id'] ?? '' );
		if ( '' !== $provider && '' !== $card_id ) {
			return $this->database->prepare( '`provider_name` = %s AND `provider_card_id` = %s', array( $provider, $card_id ) );
		}

		$game   = $this->text( $seed['game'] ?? '' );
		$name   = $this->text( $seed['card_name'] ?? '' );
		$set    = $this->text( $seed['set_code'] ?? $seed['set_name'] ?? '' );
		$number = $this->text( $seed['printed_number'] ?? $seed['card_number'] ?? '' );
		if ( '' === $game || '' === $name || ( '' === $set && '' === $number ) ) {
			return null;
		}

		return $this->database->prepare(
			'`game` = %s AND `card_name` = %s AND (`set_code` = %s OR `set_name` = %s) AND (`printed_number` = %s OR `card_number` = %s)',
			array( $game, $name, $set, $set, $number, $number )
		);
	}

	private function table_name(): string {
		$prefix = (string) ( $this->database->prefix ?? '' );

		return 1 === preg_match( '/^[A-Za-z0-9_]+$/', $prefix ) ? $prefix . 'tcg_inventory_items' : '';
	}

	private function identity( string $value ): string {
		return substr( preg_replace( '/[^A-Za-z0-9_:\-.]/', '', trim( $value ) ) ?? '', 0, 96 );
	}

	private function integer( mixed $value ): ?int {
		if ( is_int( $value ) ) {
			return $value;
		}

		return is_string( $value ) && 1 === preg_match( '/^-?\d+$/', $value ) ? (int) $value : null;
	}

	private function text( mixed $value, int $length = 191 ): string {
		return substr( trim( (string) ( is_array( $value ) || is_object( $value ) ? '' : $value ) ), 0, $length );
	}

	private function stable_uuid( string $seed ): string {
		$hex = hash( 'sha256', $seed );

		return substr( $hex, 0, 8 ) . '-' . substr( $hex, 8, 4 ) . '-' . substr( $hex, 12, 4 ) . '-' . substr( $hex, 16, 4 ) . '-' . substr( $hex, 20, 12 );
	}

	/** @return array<string, mixed> */
	private function failure( string $code, array $errors, int $status_code ): array {
		return array(
			'status'      => 'invalid',
			'code'        => $code,
			'status_code' => $status_code,
			'errors'      => $errors,
			'row'         => null,
		);
	}

	private function array_output_type(): string {
		return defined( 'ARRAY_A' ) ? (string) constant( 'ARRAY_A' ) : 'ARRAY_A';
	}
}
