<?php
/**
 * Route-connected exact inventory sale finalization handler.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\WooCommerce\InventoryProductProjectionExecutor;
use TCGStorePlatform\WooCommerce\InventoryProductProjectionPlanner;
use TCGStorePlatform\WooCommerce\InventoryProductWriteRequestPlanner;
use TCGStorePlatform\WooCommerce\WooCommerceInventoryProductWriter;

final class InventoryMarkSoldRouteHandler {
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
	public function mark_inventory_item_sold( OfflineRestRequestData $data ): array {
		$inventory_identity = $data->route_param( 'inventory_id' );
		$idempotency_key    = $data->idempotency_key();
		$body               = $data->body_params();
		$square_reference   = $this->external_reference( $body );

		if ( null === $inventory_identity ) {
			return $this->rejected( 'inventory_identity_required', array( 'inventory_identity_required' ) );
		}

		if ( null === $idempotency_key ) {
			return $this->rejected( 'idempotency_key_required', array( 'idempotency_key_required' ) );
		}

		if ( '' === $square_reference ) {
			return $this->rejected( 'square_reference_required', array( 'square_reference_required' ) );
		}

		if ( ! $this->table_prefix_ready( $this->table_prefix ) ) {
			return $this->rejected( 'inventory_table_prefix_invalid', array( 'inventory_table_prefix_invalid' ), 500 );
		}

		$table_name = $this->table_name();
		$row        = $this->inventory_row( $table_name, $inventory_identity );

		if ( null === $row ) {
			return $this->rejected( 'inventory_item_not_found', array( 'inventory_item_not_found' ), 404 );
		}

		$previous_status = strtolower( trim( (string) ( $row['status'] ?? '' ) ) );

		if ( InventoryStatus::SOLD === $previous_status ) {
			return array(
				'status'      => 'sold',
				'status_code' => 200,
				'code'        => 'inventory_item_already_sold',
				'callback'    => 'mark_inventory_item_sold',
				'data'        => $this->response_data( $row, InventoryStatus::SOLD, $previous_status, $square_reference ),
				'meta'        => array_merge(
					$this->ready_meta(),
					array(
						'idempotent'                => true,
						'woocommerce_product_sync'  => $this->woocommerce_sync_deferred_contract( false ),
						'square_receipt_reference'  => $square_reference,
						'provider_payment_capture'  => 'official_woocommerce_square_extension',
						'square_payment_delegated'  => true,
					)
				),
			);
		}

		if ( ! InventoryStatus::can_transition( $previous_status, InventoryStatus::SOLD ) ) {
			return $this->rejected(
				'inventory_status_transition_invalid',
				array( 'inventory_status_transition_invalid' ),
				409,
				array(
					'previous_status' => $previous_status,
					'target_status'   => InventoryStatus::SOLD,
				)
			);
		}

		$sold_at = $this->now_mysql();
		$updated = $this->database->query(
			$this->database->prepare(
				"UPDATE `{$table_name}` SET `status` = %s, `date_sold` = %s, `external_sync_state` = %s, `updated_at` = %s, `row_version` = `row_version` + 1 WHERE " . $this->identity_where_sql( $inventory_identity ) . " AND `status` IN (%s, %s) LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$this->identity_update_args(
					$inventory_identity,
					array(
						InventoryStatus::SOLD,
						$sold_at,
						'sold_pos_square',
						$sold_at,
						InventoryStatus::AVAILABLE,
						InventoryStatus::RESERVED,
					)
				)
			)
		);

		if ( 1 !== (int) $updated ) {
			return $this->rejected( 'inventory_mark_sold_update_failed', array( 'inventory_mark_sold_update_failed' ), 409 );
		}

		$updated_row = $this->inventory_row( $table_name, $inventory_identity ) ?? array_merge(
			$row,
			array(
				'status'     => InventoryStatus::SOLD,
				'date_sold'  => $sold_at,
				'updated_at' => $sold_at,
				'row_version' => (int) ( $row['row_version'] ?? 0 ) + 1,
			)
		);
		$woocommerce_sync = $this->truthy( $body['sync_woocommerce_product'] ?? true )
			? $this->sync_woocommerce_group( $table_name, $updated_row, $data )
			: $this->woocommerce_sync_deferred_contract( false );

		return array(
			'status'      => 'sold',
			'status_code' => 200,
			'code'        => 'inventory_item_marked_sold',
			'callback'    => 'mark_inventory_item_sold',
			'data'        => $this->response_data( $updated_row, InventoryStatus::SOLD, $previous_status, $square_reference ),
			'meta'        => array_merge(
				$this->ready_meta(),
				array(
					'idempotent'                => false,
					'square_receipt_reference'  => $square_reference,
					'woocommerce_product_sync'  => $woocommerce_sync,
					'provider_payment_capture'  => 'official_woocommerce_square_extension',
					'square_payment_delegated'  => true,
					'provider_inventory_write_deferred' => true,
					'source_of_truth'           => 'tcg_store_platform',
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
			'environment'    => $this->environment_type(),
			'store_currency' => (string) ( $row['sale_currency'] ?? 'USD' ),
			'idempotency_key' => substr( 'woocommerce:mark-sold:' . (string) $data->idempotency_key(), 0, 191 ),
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
	private function response_data( array $row, string $status, string $previous_status, string $square_reference ): array {
		return array(
			'inventory_id'             => $this->positive_int( $row['inventory_id'] ?? null ),
			'public_id'                => $this->text( $row['public_id'] ?? '' ),
			'barcode'                  => $this->text( $row['barcode'] ?? '' ),
			'sku'                      => $this->text( $row['sku'] ?? '' ),
			'card_name'                => $this->text( $row['card_name'] ?? '' ),
			'previous_status'          => $previous_status,
			'status'                   => $status,
			'date_sold'                => $this->text( $row['date_sold'] ?? $this->now_mysql() ),
			'row_version'              => $this->positive_int( $row['row_version'] ?? null ),
			'woocommerce_product_id'   => $this->positive_int( $row['woocommerce_product_id'] ?? null ),
			'square_receipt_reference' => $square_reference,
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

	/**
	 * @param list<mixed> $leading_args Args before identity/status args.
	 * @return list<mixed>
	 */
	private function identity_update_args( string $identity, array $leading_args ): array {
		$identity_arg = $this->identity_select_args( $identity );

		return array_merge(
			array_slice( $leading_args, 0, 4 ),
			$identity_arg,
			array_slice( $leading_args, 4 )
		);
	}

	/**
	 * @param array<string, mixed> $body Request body.
	 */
	private function external_reference( array $body ): string {
		foreach ( array( 'square_receipt_reference', 'square_ticket_reference', 'square_order_id', 'external_order_id' ) as $key ) {
			$value = $this->text( $body[ $key ] ?? '' );
			if ( '' !== $value ) {
				return $value;
			}
		}

		return '';
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

	private function text( mixed $value ): string {
		if ( is_array( $value ) || is_object( $value ) ) {
			return '';
		}

		return substr( trim( (string) $value ), 0, 191 );
	}

	private function positive_int( mixed $value ): ?int {
		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		return null;
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
			'callback'    => 'mark_inventory_item_sold',
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
