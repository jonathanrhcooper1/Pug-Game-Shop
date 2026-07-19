<?php
/**
 * Authenticated LAN-to-WordPress inventory projection and readback API.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Inventory\InventoryProjectionRepository;
use TCGStorePlatform\WooCommerce\InventoryProductProjectionExecutor;
use TCGStorePlatform\WooCommerce\InventoryProductProjectionPlanner;
use TCGStorePlatform\WooCommerce\InventoryProductWriteRequestPlanner;
use TCGStorePlatform\WooCommerce\WooCommerceInventoryProductWriter;

final class InventoryProjectionController {
	private const NAMESPACE = 'tcg-store/v1';

	public function __construct( private ?InventoryProjectionRepository $repository = null ) {
	}

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ), 25 );
	}

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/inventory-projections/(?P<inventory_id>[A-Za-z0-9_:\-.]+)',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => array( $this, 'read' ),
					'permission_callback' => array( $this, 'can_read' ),
				),
				array(
					'methods'             => \WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'update' ),
					'permission_callback' => array( $this, 'can_update' ),
				),
			)
		);
	}

	public function can_read(): bool {
		return function_exists( 'current_user_can' )
			&& ( current_user_can( 'view_inventory' ) || current_user_can( 'edit_inventory' ) || current_user_can( 'manage_settings' ) );
	}

	public function can_update(): bool {
		return function_exists( 'current_user_can' )
			&& ( current_user_can( 'edit_inventory' ) || current_user_can( 'manage_settings' ) );
	}

	public function read( \WP_REST_Request $request ): \WP_REST_Response {
		$row = $this->repository()->find( (string) $request->get_param( 'inventory_id' ) );
		if ( null === $row ) {
			return new \WP_REST_Response(
				array(
					'status' => 'invalid',
					'code'   => 'inventory_projection_not_found',
				),
				404
			);
		}

		return new \WP_REST_Response(
			array(
				'status' => 'ok',
				'code'   => 'inventory_projection_read',
				'data'   => $this->readback( $row ),
			),
			200
		);
	}

	public function update( \WP_REST_Request $request ): \WP_REST_Response {
		$payload = $request->get_json_params();
		$payload = is_array( $payload ) ? $payload : array();
		$actor   = function_exists( 'get_current_user_id' ) ? (int) get_current_user_id() : 0;
		$result  = $this->repository()->update_absolute(
			(string) $request->get_param( 'inventory_id' ),
			$payload,
			$actor > 0 ? $actor : null
		);

		if ( 'updated' !== ( $result['status'] ?? '' ) || ! is_array( $result['row'] ?? null ) ) {
			return new \WP_REST_Response( $result, (int) ( $result['status_code'] ?? 422 ) );
		}

		$row       = $result['row'];
		$wc_sync   = $this->sync_woocommerce( $row, (string) $request->get_header( 'idempotency-key' ) );
		$refreshed = $this->repository()->find( (string) $row['public_id'] ) ?? $row;

		if ( true !== ( $wc_sync['verified'] ?? false ) ) {
			return new \WP_REST_Response(
				array(
					'status' => 'blocked',
					'code'   => 'inventory_projection_woocommerce_unverified',
					'data'   => $this->readback( $refreshed ),
					'meta'   => array( 'woocommerce_product_sync' => $wc_sync ),
				),
				409
			);
		}

		return new \WP_REST_Response(
			array(
				'status' => 'updated',
				'code'   => (string) $result['code'],
				'data'   => $this->readback( $refreshed ),
				'meta'   => array(
					'idempotent'                   => (bool) ( $result['idempotent'] ?? false ),
					'changed'                      => (bool) ( $result['changed'] ?? false ),
					'woocommerce_product_sync'     => $wc_sync,
					'source_of_truth'              => 'local_sync_server',
					'credentials_synced_to_client' => false,
				),
			),
			200
		);
	}

	/** @param array<string, mixed> $row @return array<string, mixed> */
	private function sync_woocommerce( array $row, string $idempotency_key ): array {
		$visible    = 'visible' === strtolower( (string) ( $row['online_visibility'] ?? '' ) );
		$available  = 'available' === strtolower( (string) ( $row['status'] ?? '' ) )
			&& (int) ( $row['quantity_on_hand'] ?? 0 ) > 0;
		$product_id = (int) ( $row['woocommerce_product_id'] ?? 0 );
		if ( ( ! $visible || ! $available ) && $product_id <= 0 ) {
			return array(
				'status'   => 'skipped',
				'verified' => true,
				'reason'   => ! $visible ? 'online_visibility_hidden' : 'inventory_not_sellable',
			);
		}

		$rows           = $this->repository()->product_group_rows( $row );
		$context        = array(
			'environment'               => $this->environment_type(),
			'store_currency'            => (string) ( $row['sale_currency'] ?? 'USD' ),
			'production_write_approval' => 'woocommerce-product-sync',
			'idempotency_key'           => '' !== trim( $idempotency_key ) ? $idempotency_key : 'projection:' . (string) $row['public_id'] . ':v' . (string) $row['row_version'],
		);
		$plan           = ( new InventoryProductProjectionPlanner() )->plan_group( $rows, $context );
		$executor       = new InventoryProductProjectionExecutor(
			true,
			new WooCommerceInventoryProductWriter(),
			new InventoryProductWriteRequestPlanner(),
			$context
		);
		$execution      = $executor->execute( $plan );
		$product_ids    = $execution->product_ids();
		$product_id     = isset( $product_ids[0] ) ? (int) $product_ids[0] : $product_id;
		$mapping_ok     = $product_id > 0 && $this->repository()->mark_woocommerce_synced(
			array_map( static fn ( array $group_row ): int => (int) ( $group_row['inventory_id'] ?? 0 ), $rows ),
			$product_id
		);
		$readback       = $this->woocommerce_readback( $product_id );
		$expected_stock = array_sum(
			array_map(
				static fn ( array $group_row ): int =>
				'available' === strtolower( (string) ( $group_row['status'] ?? '' ) )
				&& 'visible' === strtolower( (string) ( $group_row['online_visibility'] ?? '' ) )
				? max( 0, (int) ( $group_row['quantity_on_hand'] ?? 1 ) ) : 0,
				$rows
			)
		);
		$verified       = $execution->is_executed()
			&& $mapping_ok
			&& (int) ( $readback['stock_quantity'] ?? -1 ) === $expected_stock;

		return array(
			'status'         => $execution->status(),
			'requested'      => true,
			'synced'         => $verified,
			'verified'       => $verified,
			'product_id'     => $product_id,
			'product_ids'    => $product_id > 0 ? array( $product_id ) : array(),
			'expected_stock' => $expected_stock,
			'readback'       => $readback,
			'errors'         => array_values( array_unique( array_merge( $execution->errors(), $execution->block_reasons() ) ) ),
		);
	}

	/** @param array<string, mixed> $row @return array<string, mixed> */
	private function readback( array $row ): array {
		return array(
			'inventory_id'                   => (int) ( $row['inventory_id'] ?? 0 ),
			'public_id'                      => (string) ( $row['public_id'] ?? '' ),
			'barcode'                        => (string) ( $row['barcode'] ?? '' ),
			'sku'                            => (string) ( $row['sku'] ?? '' ),
			'status'                         => (string) ( $row['status'] ?? '' ),
			'quantity_on_hand'               => max( 0, (int) ( $row['quantity_on_hand'] ?? 0 ) ),
			'sale_price_minor_units'         => $this->minor_units( $row['sale_price'] ?? 0 ),
			'minimum_sale_price_minor_units' => $this->minor_units( $row['minimum_sale_price'] ?? 0 ),
			'market_price_minor_units'       => $this->minor_units( $row['market_price'] ?? 0 ),
			'sale_currency'                  => (string) ( $row['sale_currency'] ?? 'USD' ),
			'online_visibility'              => (string) ( $row['online_visibility'] ?? '' ),
			'kiosk_visibility'               => (string) ( $row['kiosk_visibility'] ?? '' ),
			'pos_visibility'                 => (string) ( $row['pos_visibility'] ?? '' ),
			'woocommerce_product_id'         => (int) ( $row['woocommerce_product_id'] ?? 0 ),
			'square_catalog_item_id'         => (string) ( $row['square_catalog_item_id'] ?? '' ),
			'square_catalog_variation_id'    => (string) ( $row['square_catalog_variation_id'] ?? '' ),
			'external_sync_state'            => (string) ( $row['external_sync_state'] ?? '' ),
			'row_version'                    => (int) ( $row['row_version'] ?? 0 ),
			'updated_at'                     => (string) ( $row['updated_at'] ?? '' ),
			'woocommerce'                    => $this->woocommerce_readback( (int) ( $row['woocommerce_product_id'] ?? 0 ) ),
		);
	}

	/** @return array<string, mixed> */
	private function woocommerce_readback( int $product_id ): array {
		if ( $product_id <= 0 || ! function_exists( 'wc_get_product' ) ) {
			return array(
				'available'  => false,
				'product_id' => $product_id,
			);
		}
		$product = wc_get_product( $product_id );
		if ( ! $product instanceof \WC_Product ) {
			return array(
				'available'  => false,
				'product_id' => $product_id,
			);
		}

		return array(
			'available'          => true,
			'product_id'         => $product_id,
			'sku'                => (string) $product->get_sku(),
			'regular_price'      => (string) $product->get_regular_price(),
			'stock_quantity'     => max( 0, (int) $product->get_stock_quantity() ),
			'stock_status'       => (string) $product->get_stock_status(),
			'status'             => (string) $product->get_status(),
			'catalog_visibility' => (string) $product->get_catalog_visibility(),
		);
	}

	private function repository(): InventoryProjectionRepository {
		if ( null === $this->repository ) {
			global $wpdb;
			$this->repository = new InventoryProjectionRepository( $wpdb );
		}

		return $this->repository;
	}

	private function minor_units( mixed $value ): int {
		return max( 0, (int) round( (float) $value * 100 ) );
	}

	private function environment_type(): string {
		return function_exists( 'wp_get_environment_type' ) ? (string) wp_get_environment_type() : 'production';
	}
}
