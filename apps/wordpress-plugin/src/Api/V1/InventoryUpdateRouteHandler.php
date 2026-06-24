<?php
/**
 * Route-connected inventory update handler.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\WooCommerce\InventoryProductProjectionExecutor;
use TCGStorePlatform\WooCommerce\InventoryProductProjectionPlanner;
use TCGStorePlatform\WooCommerce\InventoryProductWriteRequestPlanner;
use TCGStorePlatform\WooCommerce\WooCommerceInventoryProductWriter;

final class InventoryUpdateRouteHandler {
	/**
	 * @var callable|null
	 */
	private $now_provider;

	public function __construct(
		private \wpdb $database,
		private string $table_prefix = 'wp_',
		private ?InventoryProductProjectionPlanner $woocommerce_projection_planner = null,
		private ?InventoryProductProjectionExecutor $woocommerce_projection_executor = null,
		?callable $now_provider = null
	) {
		$this->now_provider = $now_provider;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function update_inventory_item( OfflineRestRequestData $data ): array {
		$inventory_identity = $data->route_param( 'inventory_id' );
		$idempotency_key    = $data->idempotency_key();
		$body               = $data->body_params();

		if ( null === $inventory_identity ) {
			return $this->rejected( 'inventory_identity_required', array( 'inventory_identity_required' ) );
		}

		if ( null === $idempotency_key ) {
			return $this->rejected( 'idempotency_key_required', array( 'idempotency_key_required' ) );
		}

		if ( ! $this->table_prefix_ready( $this->table_prefix ) ) {
			return $this->rejected( 'inventory_table_prefix_invalid', array( 'inventory_table_prefix_invalid' ), 500 );
		}

		$table_name = $this->table_name();
		$row        = $this->inventory_row( $table_name, $inventory_identity );

		if ( null === $row ) {
			return $this->rejected( 'inventory_item_not_found', array( 'inventory_item_not_found' ), 404 );
		}

		$updates = $this->update_row( $body, $row );
		$errors  = $this->update_errors( $updates, $row, $table_name );

		if ( array() !== $errors ) {
			return $this->rejected( 'inventory_update_request_invalid', $errors, 400 );
		}

		$updated_at             = $this->now_mysql();
		$updates['updated_at']  = $updated_at;
		$updates['row_version'] = (int) ( $row['row_version'] ?? 0 ) + 1;

		$updated_by = $this->positive_int( $body['updated_by_user_id'] ?? null );
		if ( null !== $updated_by ) {
			$updates['updated_by'] = $updated_by;
		}

		$updated = $this->database->update(
			$table_name,
			$updates,
			array( 'inventory_id' => (int) $row['inventory_id'] ),
			$this->update_formats( $updates ),
			array( '%d' )
		);

		if ( false === $updated ) {
			return $this->rejected( 'inventory_update_failed', array( 'inventory_update_failed' ), 500 );
		}

		$updated_row      = $this->inventory_row( $table_name, (string) $row['inventory_id'] ) ?? array_merge( $row, $updates );
		$woocommerce_sync = $this->truthy( $body['sync_woocommerce_product'] ?? true )
			? $this->sync_woocommerce_group( $table_name, $updated_row, $data )
			: $this->woocommerce_sync_deferred_contract( false );

		return array(
			'status'      => 'updated',
			'status_code' => 200,
			'code'        => 'inventory_item_updated',
			'callback'    => 'update_inventory_item',
			'data'        => $this->response_data( $updated_row, $row ),
			'meta'        => array_merge(
				$this->ready_meta(),
				array(
					'idempotent'               => false,
					'woocommerce_product_sync' => $woocommerce_sync,
					'source_of_truth'          => 'tcg_store_platform',
				)
			),
		);
	}

	/**
	 * @return array<string, mixed>|null
	 */
	private function inventory_row( string $table_name, string $identity ): ?array {
		$row = $this->database->get_row(
			$this->database->prepare(
				'SELECT * FROM `' . $table_name . '` WHERE ' . $this->identity_where_sql( $identity ) . ' LIMIT 1', // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				$this->identity_select_args( $identity )
			),
			ARRAY_A
		);

		return is_array( $row ) ? $row : null;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function update_row( array $body, array $row ): array {
		$updates = array(
			'external_sync_state' => 'synced',
		);
		$status  = $this->status( $body['status'] ?? null );

		if ( null !== $status ) {
			$updates['status'] = $status;
		}

		if ( array_key_exists( 'barcode', $body ) ) {
			$updates['barcode'] = $this->barcode( $body['barcode'] );
		}

		if ( array_key_exists( 'sku', $body ) ) {
			$updates['sku'] = $this->barcode( $body['sku'] );
		} elseif ( array_key_exists( 'barcode', $body ) ) {
			$updates['sku'] = $this->barcode( $body['barcode'] );
		}

		$sale_price = $this->money_from_minor( $body['sale_price_minor_units'] ?? null );
		if ( null !== $sale_price ) {
			$updates['sale_price'] = $sale_price;
		}

		$minimum_sale_price = $this->money_from_minor( $body['minimum_sale_price_minor_units'] ?? null );
		if ( null !== $minimum_sale_price ) {
			$updates['minimum_sale_price'] = $minimum_sale_price;
		}

		if ( array_key_exists( 'sale_currency', $body ) ) {
			$updates['sale_currency'] = $this->currency( $body['sale_currency'] );
		}

		foreach ( array( 'online_visibility', 'kiosk_visibility', 'pos_visibility' ) as $field ) {
			if ( array_key_exists( $field, $body ) ) {
				$updates[ $field ] = $this->visibility( $body[ $field ] );
			}
		}

		if ( array_key_exists( 'staff_notes', $body ) ) {
			$updates['staff_notes'] = $this->long_text( $body['staff_notes'] );
		}

		if ( InventoryStatus::AVAILABLE === ( $updates['status'] ?? ( $row['status'] ?? '' ) ) && empty( $row['date_listed'] ) ) {
			$updates['date_listed'] = $this->now_mysql();
		}

		if ( InventoryStatus::SOLD === ( $updates['status'] ?? '' ) && empty( $row['date_sold'] ) ) {
			$updates['date_sold'] = $this->now_mysql();
		}

		return $updates;
	}

	/**
	 * @return list<string>
	 */
	private function update_errors( array $updates, array $row, string $table_name ): array {
		$errors = array();
		$status = (string) ( $updates['status'] ?? ( $row['status'] ?? '' ) );

		if ( ! InventoryStatus::is_valid( $status ) ) {
			$errors[] = 'status_invalid';
		}

		$sale_price         = isset( $updates['sale_price'] ) ? (float) $updates['sale_price'] : (float) ( $row['sale_price'] ?? 0 );
		$minimum_sale_price = isset( $updates['minimum_sale_price'] ) ? (float) $updates['minimum_sale_price'] : (float) ( $row['minimum_sale_price'] ?? 0 );

		if ( $sale_price < $minimum_sale_price ) {
			$errors[] = 'sale_price_below_minimum';
		}

		foreach ( array( 'barcode', 'sku' ) as $field ) {
			if ( isset( $updates[ $field ] ) && '' === $updates[ $field ] ) {
				$errors[] = $field . '_required';
			}

			if ( isset( $updates[ $field ] ) && $this->duplicate_field_value( $table_name, $field, $updates[ $field ], (int) $row['inventory_id'] ) ) {
				$errors[] = $field . '_already_exists';
			}
		}

		return array_values( array_unique( $errors ) );
	}

	private function duplicate_field_value( string $table_name, string $field, string $value, int $current_inventory_id ): bool {
		if ( '' === $value || ! in_array( $field, array( 'barcode', 'sku' ), true ) ) {
			return false;
		}

		$count = $this->database->get_var(
			$this->database->prepare(
				"SELECT COUNT(*) FROM `{$table_name}` WHERE `{$field}` = %s AND `inventory_id` <> %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$value,
				$current_inventory_id
			)
		);

		return (int) $count > 0;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function group_rows( string $table_name, array $row ): array {
		$reference_card_id = $this->positive_int( $row['reference_card_id'] ?? null );
		$provider_name     = $this->text( $row['provider_name'] ?? '' );
		$provider_card_id  = $this->text( $row['provider_card_id'] ?? '' );

		if ( null !== $reference_card_id ) {
			$results = $this->database->get_results(
				$this->database->prepare(
					"SELECT * FROM `{$table_name}` WHERE `reference_card_id` = %d ORDER BY `inventory_id` ASC", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					array( $reference_card_id )
				),
				ARRAY_A
			);

			return is_array( $results ) ? array_values( array_filter( $results, 'is_array' ) ) : array();
		}

		if ( '' !== $provider_name && '' !== $provider_card_id ) {
			$results = $this->database->get_results(
				$this->database->prepare(
					"SELECT * FROM `{$table_name}` WHERE `provider_name` = %s AND `provider_card_id` = %s ORDER BY `inventory_id` ASC", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					array( $provider_name, $provider_card_id )
				),
				ARRAY_A
			);

			return is_array( $results ) ? array_values( array_filter( $results, 'is_array' ) ) : array();
		}

		return array( $row );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function sync_woocommerce_group( string $table_name, array $row, OfflineRestRequestData $data ): array {
		$group_rows = $this->group_rows( $table_name, $row );

		if ( array() === $group_rows ) {
			return $this->woocommerce_sync_deferred_contract( true, array( 'inventory_group_rows_missing' ) );
		}

		$context   = $this->woocommerce_context( $row, $data );
		$plan      = $this->woocommerce_projection_planner()->plan_group( $group_rows, $context );
		$execution = $this->woocommerce_projection_executor( $context )->execute( $plan );

		return array(
			'action'                    => 'woocommerce_product_sync',
			'status'                    => $execution->status(),
			'synced'                    => $execution->is_executed(),
			'requested'                 => true,
			'execution'                 => $execution->audit_payload(),
			'woocommerce_write_deferred' => ! $execution->is_executed(),
			'payment_capture_deferred'  => true,
			'square_inventory_deferred' => true,
			'source_of_truth'           => 'tcg_store_platform',
			'errors'                    => array_values(
				array_unique(
					array_merge(
						$execution->errors(),
						$execution->block_reasons()
					)
				)
			),
		);
	}

	private function woocommerce_projection_planner(): InventoryProductProjectionPlanner {
		return $this->woocommerce_projection_planner ?? new InventoryProductProjectionPlanner();
	}

	private function woocommerce_projection_executor( array $context ): InventoryProductProjectionExecutor {
		return $this->woocommerce_projection_executor ?? new InventoryProductProjectionExecutor(
			true,
			new WooCommerceInventoryProductWriter(),
			new InventoryProductWriteRequestPlanner(),
			$context
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function woocommerce_context( array $row, OfflineRestRequestData $data ): array {
		$body    = $data->body_params();
		$context = array(
			'environment'     => $this->environment_type(),
			'store_currency'  => (string) ( $row['sale_currency'] ?? 'USD' ),
			'idempotency_key' => substr( 'woocommerce:update:' . (string) $data->idempotency_key(), 0, 191 ),
		);

		$approval = trim( (string) ( $body['production_write_approval'] ?? $data->header( 'x-production-write-approval' ) ?? '' ) );
		if ( '' !== $approval ) {
			$context['production_write_approval'] = $approval;
		}

		return $context;
	}

	/**
	 * @param list<string> $errors Errors.
	 * @return array<string, mixed>
	 */
	private function woocommerce_sync_deferred_contract( bool $requested, array $errors = array() ): array {
		return array(
			'action'                    => 'woocommerce_product_sync',
			'status'                    => 'deferred',
			'synced'                    => false,
			'requested'                 => $requested,
			'woocommerce_write_deferred' => true,
			'payment_capture_deferred'  => true,
			'square_inventory_deferred' => true,
			'source_of_truth'           => 'tcg_store_platform',
			'errors'                    => array_values( array_unique( $errors ) ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function response_data( array $row, array $previous_row ): array {
		return array(
			'inventory_id'               => $this->positive_int( $row['inventory_id'] ?? null ),
			'public_id'                  => $this->text( $row['public_id'] ?? '' ),
			'barcode'                    => $this->text( $row['barcode'] ?? '' ),
			'sku'                        => $this->text( $row['sku'] ?? '' ),
			'card_name'                  => $this->text( $row['card_name'] ?? '' ),
			'previous_status'            => $this->text( $previous_row['status'] ?? '' ),
			'status'                     => $this->text( $row['status'] ?? '' ),
			'previous_sale_price'        => $this->money( $previous_row['sale_price'] ?? '0.00' ),
			'sale_price'                 => $this->money( $row['sale_price'] ?? '0.00' ),
			'minimum_sale_price'         => $this->money( $row['minimum_sale_price'] ?? '0.00' ),
			'sale_currency'              => $this->currency( $row['sale_currency'] ?? 'USD' ),
			'row_version'                => $this->positive_int( $row['row_version'] ?? null ),
			'woocommerce_product_id'     => $this->positive_int( $row['woocommerce_product_id'] ?? null ),
			'price_change_log_persisted' => false,
		);
	}

	private function identity_where_sql( string $identity ): string {
		return $this->positive_int( $identity ) ? '`inventory_id` = %d' : '`public_id` = %s';
	}

	/**
	 * @return list<mixed>
	 */
	private function identity_select_args( string $identity ): array {
		$inventory_id = $this->positive_int( $identity );

		return array( null !== $inventory_id ? $inventory_id : $identity );
	}

	private function table_name(): string {
		return $this->table_prefix . 'tcg_inventory_items';
	}

	private function table_prefix_ready( string $table_prefix ): bool {
		return '' !== $table_prefix && 1 === preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix );
	}

	private function now_mysql(): string {
		if ( is_callable( $this->now_provider ) ) {
			return (string) ( $this->now_provider )();
		}

		if ( function_exists( 'current_time' ) ) {
			return (string) current_time( 'mysql', true );
		}

		return gmdate( 'Y-m-d H:i:s' );
	}

	private function environment_type(): string {
		if ( function_exists( 'wp_get_environment_type' ) ) {
			return (string) wp_get_environment_type();
		}

		$environment_type = getenv( 'WP_ENVIRONMENT_TYPE' );

		return is_string( $environment_type ) && '' !== trim( $environment_type )
			? strtolower( trim( $environment_type ) )
			: 'production';
	}

	private function truthy( mixed $value ): bool {
		if ( is_bool( $value ) ) {
			return $value;
		}

		return in_array( strtolower( trim( (string) $value ) ), array( '1', 'true', 'yes', 'on' ), true );
	}

	private function status( mixed $value ): ?string {
		if ( is_array( $value ) || is_object( $value ) ) {
			return null;
		}

		$status = strtolower( trim( (string) $value ) );
		$status = 'conflict' === $status ? InventoryStatus::RETURN_REVIEW : $status;

		return InventoryStatus::is_valid( $status ) ? $status : null;
	}

	private function visibility( mixed $value ): string {
		if ( is_array( $value ) || is_object( $value ) ) {
			return 'hidden';
		}

		$visibility = strtolower( trim( (string) $value ) );

		return in_array( $visibility, array( 'hidden', 'visible', 'staff_only' ), true ) ? $visibility : 'hidden';
	}

	private function currency( mixed $value ): string {
		$currency = strtoupper( preg_replace( '/[^A-Z]/', '', (string) $value ) );

		return 3 === strlen( $currency ) ? $currency : 'USD';
	}

	private function barcode( mixed $value ): string {
		return strtoupper( preg_replace( '/[^A-Z0-9._-]/', '', $this->text( $value ) ) );
	}

	private function text( mixed $value ): string {
		if ( is_array( $value ) || is_object( $value ) ) {
			return '';
		}

		return substr( trim( (string) $value ), 0, 191 );
	}

	private function long_text( mixed $value ): string {
		if ( is_array( $value ) || is_object( $value ) ) {
			return '';
		}

		$text = function_exists( 'wp_strip_all_tags' )
			? wp_strip_all_tags( (string) $value )
			: strip_tags( (string) $value );

		return substr( trim( $text ), 0, 2000 );
	}

	private function money_from_minor( mixed $value ): ?string {
		if ( is_array( $value ) || is_object( $value ) || null === $value || '' === $value ) {
			return null;
		}

		if ( ! is_numeric( $value ) ) {
			return null;
		}

		return number_format( max( 0, (int) $value ) / 100, 4, '.', '' );
	}

	private function money( mixed $value ): string {
		return number_format( max( 0, (float) $value ), 4, '.', '' );
	}

	private function positive_int( mixed $value ): ?int {
		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		if ( is_numeric( $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		return null;
	}

	/**
	 * @return list<string>
	 */
	private function update_formats( array $updates ): array {
		$formats = array();

		foreach ( $updates as $field => $value ) {
			$formats[] = in_array( $field, array( 'row_version', 'updated_by' ), true ) ? '%d' : '%s';
		}

		return $formats;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function ready_meta(): array {
		return array(
			'route_connected_writes_enabled'       => true,
			'route_connected_writes_deferred'      => false,
			'inventory_repository_deferred'        => false,
			'route_registration_deferred'          => true,
			'default_route_registration_deferred'  => true,
			'route_still_gated'                    => true,
			'woocommerce_projection_deferred'      => false,
			'square_inventory_projection_deferred' => true,
			'label_print_deferred'                 => true,
			'square_payment_capture_supported'     => false,
		);
	}

	/**
	 * @param list<string> $errors Errors.
	 * @param array<string, mixed> $extra_meta Extra metadata.
	 * @return array<string, mixed>
	 */
	private function rejected( string $code, array $errors, int $status_code = 400, array $extra_meta = array() ): array {
		return array(
			'status'      => 'invalid',
			'status_code' => $status_code,
			'code'        => $code,
			'callback'    => 'update_inventory_item',
			'errors'      => array_values( array_unique( $errors ) ),
			'meta'        => array_merge(
				array(
					'route_connected_writes_enabled'       => true,
					'route_connected_writes_deferred'      => true,
					'inventory_repository_deferred'        => true,
					'route_registration_deferred'          => true,
					'default_route_registration_deferred'  => true,
					'route_still_gated'                    => true,
					'woocommerce_projection_deferred'      => true,
					'square_inventory_projection_deferred' => true,
					'label_print_deferred'                 => true,
					'square_payment_capture_supported'     => false,
				),
				$extra_meta
			),
		);
	}
}
