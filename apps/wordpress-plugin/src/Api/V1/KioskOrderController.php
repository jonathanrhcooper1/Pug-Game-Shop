<?php
/**
 * Kiosk pickup order REST endpoints.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Inventory\InventoryStatus;

final class KioskOrderController {
	private const NAMESPACE = 'tcg-store/v1';

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ), 24 );
	}

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/kiosk/orders',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'create_kiosk_order' ),
				'permission_callback' => array( $this, 'can_create_kiosk_order' ),
			)
		);
	}

	public static function route_contracts(): array {
		return array(
			array(
				'namespace'  => self::NAMESPACE,
				'path'       => '/kiosk/orders',
				'method'     => 'POST',
				'callback'   => 'create_kiosk_order',
				'permission' => 'create_inventory',
			),
		);
	}

	public function can_create_kiosk_order(): bool {
		return function_exists( 'current_user_can' ) && current_user_can( 'create_inventory' );
	}

	public function create_kiosk_order( \WP_REST_Request $request ): \WP_REST_Response {
		$payload    = $this->request_payload( $request );
		$first_name = $this->clean_name( $payload['first_name'] ?? '' );
		$last_name  = $this->clean_name( $payload['last_name'] ?? '' );
		$order_id   = $this->clean_id( $payload['order_id'] ?? (string) $request->get_header( 'idempotency-key' ) );
		$item_ids   = $this->inventory_public_ids( $payload['inventory_public_ids'] ?? array() );

		if ( '' === $first_name || '' === $last_name || '' === $order_id || empty( $item_ids ) ) {
			return new \WP_REST_Response(
				array(
					'error' => array(
						'code'    => 'tcg_kiosk_order_invalid',
						'message' => __( 'Kiosk pickup orders require a first name, last name, order ID, and inventory items.', 'tcg-store-platform' ),
					),
				),
				400
			);
		}

		$result = $this->reserve_items( $order_id, $first_name, $last_name, $item_ids );

		if ( 'ok' !== $result['status'] ) {
			return new \WP_REST_Response(
				array(
					'error' => array(
						'code'    => $result['code'],
						'message' => $result['message'],
					),
				),
				409
			);
		}

		return new \WP_REST_Response(
			array(
				'data' => array(
					'resource'                    => 'kiosk_order',
					'accepted'                    => true,
					'code'                        => 'kiosk_order_reserved',
					'order'                       => array(
						'order_id'          => $order_id,
						'first_name'        => $first_name,
						'last_name'         => $last_name,
						'status'            => 'reserved_for_pickup',
						'reservation_count' => count( $result['reservations'] ),
					),
					'reservations'                => $result['reservations'],
					'credentials_synced_to_client' => false,
				),
			),
			201
		);
	}

	private function reserve_items( string $order_id, string $first_name, string $last_name, array $item_public_ids ): array {
		global $wpdb;

		$inventory_table    = $wpdb->prefix . 'tcg_inventory_items';
		$reservations_table = $wpdb->prefix . 'tcg_reservations';
		$reservations       = array();
		$owner_token_hash   = hash( 'sha256', $order_id . '|' . strtolower( $first_name . ' ' . $last_name ) );
		$expires_at         = gmdate( 'Y-m-d H:i:s', time() + 2 * HOUR_IN_SECONDS );

		$wpdb->query( 'START TRANSACTION' );

		foreach ( $item_public_ids as $index => $public_id ) {
			$inventory = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT * FROM {$inventory_table} WHERE public_id = %s LIMIT 1 FOR UPDATE",
					$public_id
				),
				ARRAY_A
			);

			if ( ! is_array( $inventory ) ) {
				$wpdb->query( 'ROLLBACK' );

				return $this->blocked( 'inventory_not_found', __( 'Inventory item was not found for kiosk pickup.', 'tcg-store-platform' ) );
			}

			if ( InventoryStatus::AVAILABLE !== (string) ( $inventory['status'] ?? '' ) ) {
				$wpdb->query( 'ROLLBACK' );

				return $this->blocked( 'inventory_unavailable', __( 'Inventory item is not available for kiosk pickup.', 'tcg-store-platform' ) );
			}

			$reservation_idempotency = $order_id . ':' . $public_id;
			$inserted                = $wpdb->insert(
				$reservations_table,
				array(
					'public_id'           => $this->uuid(),
					'inventory_id'        => (int) $inventory['inventory_id'],
					'active_inventory_id' => (int) $inventory['inventory_id'],
					'source'              => 'kiosk',
					'cart_id'             => $order_id,
					'order_id'            => null,
					'customer_id'         => null,
					'owner_token_hash'    => $owner_token_hash,
					'idempotency_key'     => $reservation_idempotency,
					'status'              => 'active',
					'expires_at'          => $expires_at,
					'converted_at'        => null,
					'released_at'         => null,
					'release_reason'      => null,
					'price_snapshot'      => (string) ( $inventory['sale_price'] ?? '0.0000' ),
					'currency'            => (string) ( $inventory['sale_currency'] ?? 'USD' ),
					'metadata_json'       => $this->json(
						array(
							'first_name'         => $first_name,
							'last_name'          => $last_name,
							'local_order_id'     => $order_id,
							'local_line_index'   => $index,
							'inventory_public_id' => $public_id,
							'source'             => 'offline_lan_sync',
						)
					),
					'created_at'          => $this->now(),
					'updated_at'          => $this->now(),
					'row_version'         => 1,
				),
				array( '%s', '%d', '%d', '%s', '%s', '%d', '%d', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d' )
			);

			if ( false === $inserted ) {
				$wpdb->query( 'ROLLBACK' );

				return $this->blocked( 'reservation_insert_failed', __( 'Kiosk reservation could not be created.', 'tcg-store-platform' ) );
			}

			$updated = $wpdb->update(
				$inventory_table,
				array(
					'status'     => InventoryStatus::RESERVED,
					'updated_at' => $this->now(),
					'row_version' => (int) ( $inventory['row_version'] ?? 1 ) + 1,
				),
				array(
					'inventory_id' => (int) $inventory['inventory_id'],
					'status'       => InventoryStatus::AVAILABLE,
				),
				array( '%s', '%s', '%d' ),
				array( '%d', '%s' )
			);

			if ( false === $updated || 0 === (int) $updated ) {
				$wpdb->query( 'ROLLBACK' );

				return $this->blocked( 'inventory_update_failed', __( 'Inventory item could not be reserved for kiosk pickup.', 'tcg-store-platform' ) );
			}

			$reservations[] = array(
				'reservation_id'      => (int) $wpdb->insert_id,
				'inventory_public_id' => $public_id,
				'status'              => 'active',
				'expires_at'          => $expires_at,
			);
		}

		$wpdb->query( 'COMMIT' );

		return array(
			'status'       => 'ok',
			'reservations' => $reservations,
		);
	}

	private function request_payload( \WP_REST_Request $request ): array {
		$payload = $request->get_json_params();

		if ( ! is_array( $payload ) ) {
			$payload = $request->get_body_params();
		}

		return is_array( $payload ) ? $payload : array();
	}

	private function inventory_public_ids( mixed $value ): array {
		if ( ! is_array( $value ) ) {
			return array();
		}

		return array_values(
			array_unique(
				array_filter(
					array_map( array( $this, 'clean_id' ), $value )
				)
			)
		);
	}

	private function blocked( string $code, string $message ): array {
		return array(
			'status'  => 'blocked',
			'code'    => $code,
			'message' => $message,
		);
	}

	private function clean_name( mixed $value ): string {
		return substr( trim( preg_replace( '/\s+/', ' ', (string) $value ) ?? '' ), 0, 100 );
	}

	private function clean_id( mixed $value ): string {
		return substr( preg_replace( '/[^a-zA-Z0-9._:-]+/', '-', trim( (string) $value ) ) ?? '', 0, 191 );
	}

	private function json( array $value ): string {
		return function_exists( 'wp_json_encode' ) ? (string) wp_json_encode( $value ) : (string) json_encode( $value );
	}

	private function now(): string {
		return gmdate( 'Y-m-d H:i:s' );
	}

	private function uuid(): string {
		return function_exists( 'wp_generate_uuid4' ) ? wp_generate_uuid4() : sprintf(
			'%s-%s-%s-%s-%s',
			bin2hex( random_bytes( 4 ) ),
			bin2hex( random_bytes( 2 ) ),
			bin2hex( random_bytes( 2 ) ),
			bin2hex( random_bytes( 2 ) ),
			bin2hex( random_bytes( 6 ) )
		);
	}
}
