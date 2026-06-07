<?php
/**
 * Plan inventory intake database inserts without executing writes.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventoryIntakePersistencePlanner {
	private const TABLE = 'tcg_inventory_items';

	/**
	 * @param callable(): string|null $clock Optional timestamp provider.
	 */
	public function __construct(
		private $clock = null
	) {
	}

	public function plan( InventoryIntakeRequest $request, string $table_prefix ): InventoryIntakePersistencePlan {
		$table_prefix = trim( $table_prefix );
		$table_name   = $table_prefix . self::TABLE;
		$errors       = $this->preflight_errors( $request, $table_prefix );

		if ( array() !== $errors ) {
			return InventoryIntakePersistencePlan::rejected(
				$table_name,
				$errors,
				$this->audit_context( $request, array() )
			);
		}

		$item     = $request->item_fields();
		$now      = $this->now();
		$identity = $this->identity( $request, $item );
		$row      = $this->insert_row( $request, $item, $identity, $now );
		$sql      = $this->insert_sql( $table_name, $row, $prepare_args );

		return InventoryIntakePersistencePlan::planned(
			$table_name,
			$row,
			$sql,
			$prepare_args,
			$this->audit_context( $request, $identity )
		);
	}

	/**
	 * @return list<string>
	 */
	private function preflight_errors( InventoryIntakeRequest $request, string $table_prefix ): array {
		$errors = array();
		$item   = $request->item_fields();

		if ( '' === $table_prefix || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix ) ) {
			$errors[] = 'table_prefix_invalid';
		}

		if ( '' === trim( $request->idempotency_key() ) ) {
			$errors[] = 'idempotency_key_required';
		}

		if ( '' === $this->string_field( $item, 'game' ) ) {
			$errors[] = 'game_required';
		}

		if ( '' === $this->string_field( $item, 'card_name' ) ) {
			$errors[] = 'card_name_required';
		}

		if ( null === $this->money_from_minor( $item['minimum_sale_price_minor_units'] ?? null ) ) {
			$errors[] = 'minimum_price_required';
		}

		if ( null !== ( $item['sale_price_minor_units'] ?? null ) && null === $this->money_from_minor( $item['sale_price_minor_units'] ) ) {
			$errors[] = 'sale_price_invalid';
		}

		if ( 1 !== preg_match( '/^[A-Z]{3}$/', $request->currency() ) ) {
			$errors[] = 'currency_invalid';
		}

		if ( ! InventoryStatus::is_valid( (string) ( $item['status'] ?? '' ) ) ) {
			$errors[] = 'status_invalid';
		}

		return array_values( array_unique( $errors ) );
	}

	/**
	 * @param array<string, mixed> $item Normalized item fields.
	 * @return array<string, mixed>
	 */
	private function identity( InventoryIntakeRequest $request, array $item ): array {
		$fingerprint       = substr( hash( 'sha256', $request->idempotency_key() ), 0, 16 );
		$barcode           = $this->string_field( $item, 'barcode' );
		$sku               = $this->string_field( $item, 'sku' );
		$generated_barcode = false;
		$generated_sku     = false;

		if ( '' === $barcode ) {
			$barcode           = 'PUG-' . strtoupper( $fingerprint );
			$generated_barcode = true;
		}

		if ( '' === $sku ) {
			$sku           = $barcode;
			$generated_sku = true;
		}

		return array(
			'public_id'         => $this->stable_uuid( 'inventory:' . $request->idempotency_key() ),
			'barcode'           => $barcode,
			'sku'               => $sku,
			'idempotency_hash'  => $fingerprint,
			'generated_barcode' => $generated_barcode,
			'generated_sku'     => $generated_sku,
		);
	}

	/**
	 * @param array<string, mixed> $item Normalized item fields.
	 * @param array<string, mixed> $identity Identity fields.
	 * @return array<string, mixed>
	 */
	private function insert_row(
		InventoryIntakeRequest $request,
		array $item,
		array $identity,
		string $now
	): array {
		$status              = (string) ( $item['status'] ?? InventoryStatus::PENDING_INTAKE );
		$minimum_sale_price  = $this->money_from_minor( $item['minimum_sale_price_minor_units'] ?? null ) ?? '0.00';
		$sale_price          = $this->money_from_minor( $item['sale_price_minor_units'] ?? null ) ?? $minimum_sale_price;
		$market_price        = $this->money_from_minor( $item['market_price_minor_units'] ?? null );
		$listed_at           = $this->is_listed_status( $status ) ? $now : null;
		$sold_at             = InventoryStatus::SOLD === $status ? $now : null;
		$market_price_source = null !== $market_price ? $request->currency() : null;

		return array(
			'public_id'                     => $identity['public_id'],
			'reference_card_id'             => $this->nullable_positive_int( $item['reference_card_id'] ?? null ),
			'reference_variant_id'          => $this->nullable_positive_int( $item['reference_variant_id'] ?? null ),
			'manual_reference_payload_json' => $this->nullable_string( $item['manual_reference_payload_json'] ?? null ),
			'provider_name'                 => $this->nullable_string( $item['provider_name'] ?? null ),
			'provider_card_id'              => $this->nullable_string( $item['provider_card_id'] ?? null ),
			'game'                          => $this->string_field( $item, 'game' ),
			'card_name'                     => $this->string_field( $item, 'card_name' ),
			'set_name'                      => $this->nullable_string( $item['set_name'] ?? null ),
			'set_code'                      => $this->nullable_string( $item['set_code'] ?? null ),
			'card_number'                   => $this->nullable_string( $item['card_number'] ?? null ),
			'printed_number'                => $this->nullable_string( $item['printed_number'] ?? null ),
			'year'                          => $this->nullable_positive_int( $item['year'] ?? null ),
			'rarity'                        => $this->nullable_string( $item['rarity'] ?? null ),
			'rarity_code'                   => $this->nullable_string( $item['rarity_code'] ?? null ),
			'variant'                       => $this->nullable_string( $item['variant'] ?? null ),
			'finish'                        => $this->nullable_string( $item['finish'] ?? null ),
			'parallel_name'                 => $this->nullable_string( $item['parallel_name'] ?? null ),
			'language'                      => $this->nullable_string( $item['language'] ?? null ),
			'raw_or_graded'                 => $this->string_field( $item, 'raw_or_graded' ),
			'condition_code'                => $this->nullable_string( $item['condition_code'] ?? null ),
			'grading_company'               => $this->nullable_string( $item['grading_company'] ?? null ),
			'grade'                         => $this->nullable_string( $item['grade'] ?? null ),
			'cert_number'                   => $this->nullable_string( $item['cert_number'] ?? null ),
			'barcode'                       => $identity['barcode'],
			'sku'                           => $identity['sku'],
			'cost'                          => $this->money_from_minor( $item['cost_minor_units'] ?? null ),
			'cost_currency'                 => $this->currency_or_null( $item['cost_currency'] ?? null ),
			'market_price'                  => $market_price,
			'market_price_currency'         => $market_price_source,
			'suggested_price'               => $this->money_from_minor( $item['suggested_price_minor_units'] ?? null ),
			'sale_price'                    => $sale_price,
			'minimum_sale_price'            => $minimum_sale_price,
			'sale_currency'                 => $request->currency(),
			'pricing_source'                => $request->source(),
			'pricing_formula'               => null,
			'price_lock'                    => $this->bool_int( $item['price_lock'] ?? false ),
			'price_floor_hit'               => $sale_price === $minimum_sale_price ? 1 : 0,
			'location_id'                   => $this->nullable_positive_int( $item['location_id'] ?? null ),
			'case_id'                       => $this->nullable_positive_int( $item['case_id'] ?? null ),
			'box_id'                        => $this->nullable_positive_int( $item['box_id'] ?? null ),
			'binder_id'                     => $this->nullable_positive_int( $item['binder_id'] ?? null ),
			'shelf_id'                      => $this->nullable_positive_int( $item['shelf_id'] ?? null ),
			'row_slot'                      => $this->nullable_string( $item['row_slot'] ?? null ),
			'online_visibility'             => $this->string_or_default( $item['online_visibility'] ?? null, 'hidden' ),
			'kiosk_visibility'              => $this->string_or_default( $item['kiosk_visibility'] ?? null, 'hidden' ),
			'pos_visibility'                => $this->string_or_default( $item['pos_visibility'] ?? null, 'visible' ),
			'status'                        => $status,
			'front_image_local_path'        => $this->nullable_string( $item['front_image_local_path'] ?? null ),
			'back_image_local_path'         => $this->nullable_string( $item['back_image_local_path'] ?? null ),
			'front_image_remote_url'        => $this->nullable_string( $item['front_image_remote_url'] ?? null ),
			'back_image_remote_url'         => $this->nullable_string( $item['back_image_remote_url'] ?? null ),
			'notes'                         => $this->nullable_string( $item['notes'] ?? null ),
			'staff_notes'                   => $this->nullable_string( $item['staff_notes'] ?? null ),
			'date_acquired'                 => $now,
			'date_listed'                   => $listed_at,
			'date_sold'                     => $sold_at,
			'created_by'                    => $request->actor_user_id(),
			'updated_by'                    => $request->actor_user_id(),
			'created_at'                    => $now,
			'updated_at'                    => $now,
			'row_version'                   => 1,
		);
	}

	/**
	 * @param array<string, mixed> $row Insert row.
	 * @param list<mixed>         $prepare_args Prepared arguments.
	 */
	private function insert_sql( string $table_name, array $row, ?array &$prepare_args ): string {
		$prepare_args = array();
		$columns      = array();
		$values       = array();

		foreach ( $row as $column => $value ) {
			$columns[] = '`' . $column . '`';

			if ( null === $value ) {
				$values[] = 'NULL';
				continue;
			}

			if ( is_int( $value ) ) {
				$values[]       = '%d';
				$prepare_args[] = $value;
				continue;
			}

			$values[]       = '%s';
			$prepare_args[] = (string) $value;
		}

		return 'INSERT INTO `' . $table_name . '` (' . implode( ', ', $columns ) . ') VALUES (' . implode( ', ', $values ) . ')';
	}

	/**
	 * @param array<string, mixed> $identity Identity fields.
	 * @return array<string, mixed>
	 */
	private function audit_context( InventoryIntakeRequest $request, array $identity ): array {
		return array(
			'source'                          => $request->source(),
			'idempotency_fingerprint'         => substr( hash( 'sha256', $request->idempotency_key() ), 0, 12 ),
			'actor_user_id'                   => $request->actor_user_id(),
			'generated_public_id'             => (string) ( $identity['public_id'] ?? '' ),
			'generated_barcode'               => true === ( $identity['generated_barcode'] ?? false ),
			'generated_sku'                   => true === ( $identity['generated_sku'] ?? false ),
			'woocommerce_projection_deferred' => $request->woocommerce_projection_deferred(),
			'label_print_deferred'            => $request->label_print_deferred(),
		);
	}

	private function now(): string {
		if ( is_callable( $this->clock ) ) {
			$value = ( $this->clock )();

			if ( is_string( $value ) && '' !== trim( $value ) ) {
				return trim( $value );
			}
		}

		return gmdate( 'Y-m-d H:i:s.u' );
	}

	private function stable_uuid( string $seed ): string {
		$hex = hash( 'sha256', $seed );

		return substr( $hex, 0, 8 )
			. '-' . substr( $hex, 8, 4 )
			. '-' . substr( $hex, 12, 4 )
			. '-' . substr( $hex, 16, 4 )
			. '-' . substr( $hex, 20, 12 );
	}

	/**
	 * @param array<string, mixed> $item Item fields.
	 */
	private function string_field( array $item, string $field ): string {
		return trim( (string) ( $item[ $field ] ?? '' ) );
	}

	private function nullable_string( mixed $value ): ?string {
		$value = trim( (string) $value );

		return '' === $value ? null : $value;
	}

	private function string_or_default( mixed $value, string $fallback ): string {
		$value = $this->nullable_string( $value );

		return null === $value ? $fallback : $value;
	}

	private function nullable_positive_int( mixed $value ): ?int {
		if ( null === $value || '' === trim( (string) $value ) ) {
			return null;
		}

		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		return null;
	}

	private function money_from_minor( mixed $value ): ?string {
		if ( null === $value || '' === trim( (string) $value ) ) {
			return null;
		}

		if ( is_int( $value ) && $value >= 0 ) {
			return number_format( $value / 100, 2, '.', '' );
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return number_format( (int) $value / 100, 2, '.', '' );
		}

		return null;
	}

	private function currency_or_null( mixed $value ): ?string {
		$value = strtoupper( trim( (string) $value ) );

		return 1 === preg_match( '/^[A-Z]{3}$/', $value ) ? $value : null;
	}

	private function bool_int( mixed $value ): int {
		if ( is_bool( $value ) ) {
			return $value ? 1 : 0;
		}

		return in_array( strtolower( trim( (string) $value ) ), array( '1', 'true', 'yes', 'on' ), true ) ? 1 : 0;
	}

	private function is_listed_status( string $status ): bool {
		return in_array( $status, array( InventoryStatus::AVAILABLE, InventoryStatus::RESERVED, InventoryStatus::SOLD ), true );
	}
}
