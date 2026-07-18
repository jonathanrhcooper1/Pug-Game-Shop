<?php
/**
 * Fulfillment queue REST endpoints for paid local-pickup WooCommerce orders.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Settings\FulfillmentNotificationSettings;
use TCGStorePlatform\Settings\Settings;

final class FulfillmentOrderController {
	private const NAMESPACE = 'tcg-store/v1';
	private const STATUS_META = '_tcg_fulfillment_status';
	private const READY_EMAIL_SENT_META = '_tcg_ready_for_pickup_email_sent_at';
	private const READY_ORDER_STATUS = 'ready-pickup';
	private const TERMINAL_RELAY_STATUSES = array( 'cancelled', 'refunded' );

	public function register(): void {
		add_action( 'init', array( $this, 'register_ready_pickup_order_status' ), 20 );
		add_filter( 'wc_order_statuses', array( $this, 'add_ready_pickup_order_status_label' ) );
		add_filter( 'woocommerce_order_is_paid_statuses', array( $this, 'add_ready_pickup_paid_order_status' ) );
		add_action( 'rest_api_init', array( $this, 'register_routes' ), 25 );
	}

	public function register_ready_pickup_order_status(): void {
		if ( ! function_exists( 'register_post_status' ) ) {
			return;
		}

		register_post_status(
			'wc-' . self::READY_ORDER_STATUS,
			array(
				'label'                     => _x( 'Ready for pickup', 'WooCommerce order status', 'tcg-store-platform' ),
				'public'                    => true,
				'exclude_from_search'       => false,
				'show_in_admin_all_list'    => true,
				'show_in_admin_status_list' => true,
				'label_count'               => _n_noop(
					'Ready for pickup <span class="count">(%s)</span>',
					'Ready for pickup <span class="count">(%s)</span>',
					'tcg-store-platform'
				),
			)
		);
	}

	/**
	 * @param array<string, string> $statuses Existing WooCommerce statuses.
	 * @return array<string, string>
	 */
	public function add_ready_pickup_order_status_label( array $statuses ): array {
		$next = array();

		foreach ( $statuses as $key => $label ) {
			$next[ $key ] = $label;

			if ( 'wc-processing' === $key ) {
				$next[ 'wc-' . self::READY_ORDER_STATUS ] = _x( 'Ready for pickup', 'WooCommerce order status', 'tcg-store-platform' );
			}
		}

		if ( ! array_key_exists( 'wc-' . self::READY_ORDER_STATUS, $next ) ) {
			$next[ 'wc-' . self::READY_ORDER_STATUS ] = _x( 'Ready for pickup', 'WooCommerce order status', 'tcg-store-platform' );
		}

		return $next;
	}

	/**
	 * @param list<string> $statuses WooCommerce statuses considered paid.
	 * @return list<string>
	 */
	public function add_ready_pickup_paid_order_status( array $statuses ): array {
		if ( ! in_array( self::READY_ORDER_STATUS, $statuses, true ) ) {
			$statuses[] = self::READY_ORDER_STATUS;
		}

		return $statuses;
	}

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/fulfillment/orders',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'list_fulfillment_orders' ),
				'permission_callback' => array( $this, 'can_read_fulfillment_orders' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/fulfillment/orders/(?P<order_id>\d+)/status',
			array(
				'methods'             => \WP_REST_Server::EDITABLE,
				'callback'            => array( $this, 'update_fulfillment_status' ),
				'permission_callback' => array( $this, 'can_update_fulfillment_orders' ),
			)
		);
	}

	/**
	 * @return list<array<string, string>>
	 */
	public static function route_contracts(): array {
		return array(
			array(
				'namespace'  => self::NAMESPACE,
				'path'       => '/fulfillment/orders',
				'method'     => 'GET',
				'callback'   => 'list_fulfillment_orders',
				'permission' => 'view_inventory',
			),
			array(
				'namespace'  => self::NAMESPACE,
				'path'       => '/fulfillment/orders/(?P<order_id>\d+)/status',
				'method'     => 'PATCH',
				'callback'   => 'update_fulfillment_status',
				'permission' => 'create_inventory',
			),
		);
	}

	public function can_read_fulfillment_orders(): bool {
		return $this->can( 'view_inventory' ) || $this->can( 'manage_woocommerce' );
	}

	public function can_update_fulfillment_orders(): bool {
		return $this->can( 'create_inventory' ) || $this->can( 'manage_woocommerce' );
	}

	public function list_fulfillment_orders( \WP_REST_Request $request ): \WP_REST_Response {
		if ( ! function_exists( 'wc_get_orders' ) ) {
			return new \WP_REST_Response(
				array(
					'data' => array(
						'resource'              => 'fulfillment_orders',
						'orders'                => array(),
						'order_count'           => 0,
						'woocommerce_available' => false,
						'local_pickup_required' => true,
						'payment_required'      => true,
					),
				),
				200
			);
		}

		$limit             = $this->bounded_int( $request->get_param( 'limit' ), 1, 100, 50 );
		$status_param      = $request->get_param( 'status' );
		$status            = $this->order_statuses( $status_param );
		$explicit_statuses = is_string( $status_param ) && '' !== trim( $status_param ) ? $status : array();
		$orders            = wc_get_orders(
			array(
				'limit'   => $limit,
				'status'  => $status,
				'orderby' => 'date',
				'order'   => 'DESC',
				'return'  => 'objects',
			)
		);

		$payload = array();
		foreach ( is_array( $orders ) ? $orders : array() as $order ) {
			$row = $this->fulfillment_order_payload( $order, $explicit_statuses );

			if ( null !== $row ) {
				$payload[] = $row;
			}
		}

		return new \WP_REST_Response(
			array(
				'data' => array(
					'resource'              => 'fulfillment_orders',
					'orders'                => $payload,
					'order_count'           => count( $payload ),
					'woocommerce_available' => true,
					'local_pickup_required' => true,
					'payment_required'      => true,
					'payment_authority'     => 'woocommerce_square_or_configured_gateway',
					'inventory_authority'   => 'tcg_store_platform_reservations',
					'fulfillment_notifications' => $this->fulfillment_notification_payload(),
					'credentials_synced_to_client' => false,
				),
			),
			200
		);
	}

	public function update_fulfillment_status( \WP_REST_Request $request ): \WP_REST_Response {
		$order_id = $this->bounded_int( $request->get_param( 'order_id' ), 1, PHP_INT_MAX, 0 );
		$status   = $this->clean_fulfillment_status( $request->get_param( 'status' ) );

		if ( '' === $status ) {
			return $this->blocked_response( 'invalid_fulfillment_status', __( 'Use awaiting_pull, pulling, ready_for_pickup, or completed.', 'tcg-store-platform' ), 400 );
		}

		if ( ! function_exists( 'wc_get_order' ) ) {
			return $this->blocked_response( 'woocommerce_unavailable', __( 'WooCommerce is not available.', 'tcg-store-platform' ), 409 );
		}

		$order = wc_get_order( $order_id );
		if ( ! is_object( $order ) ) {
			return $this->blocked_response( 'order_not_found', __( 'No WooCommerce order matched that ID.', 'tcg-store-platform' ), 404 );
		}

		$eligibility = $this->fulfillment_eligibility( $order );
		if ( ! $eligibility['eligible'] ) {
			return $this->blocked_response(
				$eligibility['code'],
				$this->fulfillment_eligibility_message( $eligibility['code'] ),
				409
			);
		}

		$current_status = $this->fulfillment_status( $order );
		$transition     = FulfillmentOrderMutationPolicy::transition( $current_status, $status );

		if ( ! $transition['accepted'] ) {
			return $this->blocked_response(
				$transition['code'],
				__( 'Fulfillment status cannot move backward.', 'tcg-store-platform' ),
				409
			);
		}

		if ( $transition['idempotent'] ) {
			return $this->fulfillment_status_response( $order, $transition['code'], false, true );
		}

		if ( method_exists( $order, 'update_meta_data' ) ) {
			$order->update_meta_data( self::STATUS_META, $status );
		}

		$email_sent = false;
		if ( 'ready_for_pickup' === $status ) {
			$this->mark_order_ready_for_pickup( $order );
			$email_sent = $this->send_ready_for_pickup_email_once( $order );
		} elseif ( 'completed' === $status && method_exists( $order, 'update_status' ) ) {
			$order->update_status( 'completed', __( 'Pug pickup fulfillment completed by staff.', 'tcg-store-platform' ), false );
		}

		if ( method_exists( $order, 'add_order_note' ) ) {
			$order->add_order_note(
				sprintf(
					'Pug fulfillment status updated to %1$s by staff user %2$d at %3$s.',
					$status,
					function_exists( 'get_current_user_id' ) ? (int) get_current_user_id() : 0,
					gmdate( 'c' )
				)
			);
		}

		if ( method_exists( $order, 'save' ) ) {
			$order->save();
		}

		return $this->fulfillment_status_response( $order, $transition['code'], $email_sent, false );
	}

	private function fulfillment_status_response( mixed $order, string $code, bool $email_sent, bool $idempotent ): \WP_REST_Response {
		return new \WP_REST_Response(
			array(
				'data' => array(
					'resource'                       => 'fulfillment_order',
					'accepted'                       => true,
					'code'                           => $code,
					'order'                          => $this->fulfillment_order_payload( $order ),
					'idempotent_replay'              => $idempotent,
					'fulfillment_mutation_performed' => ! $idempotent,
					'ready_for_pickup_email_sent'    => $email_sent,
					'inventory_mutation_performed'   => false,
					'payment_capture_performed'      => false,
					'credentials_synced_to_client'   => false,
				),
			),
			200
		);
	}

	private function mark_order_ready_for_pickup( mixed $order ): void {
		if ( method_exists( $order, 'update_status' ) ) {
			$order->update_status(
				self::READY_ORDER_STATUS,
				__( 'Pug order is ready for pickup.', 'tcg-store-platform' ),
				true
			);
		}

		if ( method_exists( $order, 'add_order_note' ) ) {
			$order->add_order_note(
				__( 'Your order is ready for pickup at The Pug. Please bring your order number and ID when you arrive.', 'tcg-store-platform' ),
				true
			);
		}
	}

	/**
	 * @return array<string, mixed>
	 */
	private function fulfillment_notification_payload(): array {
		$settings = FulfillmentNotificationSettings::sanitize(
			Settings::all()[ FulfillmentNotificationSettings::KEY ] ?? array()
		);

		return array(
			'audio_enabled'              => ! empty( $settings['audio_enabled'] ),
			'notification_sound_url'     => (string) ( $settings['notification_sound_url'] ?? '' ),
			'employee_only'              => true,
			'ready_pickup_email_enabled' => ! empty( $settings['ready_pickup_email_enabled'] ),
			'credentials_synced_to_client' => false,
		);
	}

	private function send_ready_for_pickup_email_once( mixed $order ): bool {
		$notifications = FulfillmentNotificationSettings::sanitize(
			Settings::all()[ FulfillmentNotificationSettings::KEY ] ?? array()
		);

		if ( empty( $notifications['ready_pickup_email_enabled'] ) ) {
			return false;
		}

		if ( ! function_exists( 'wp_mail' ) || ! method_exists( $order, 'get_billing_email' ) ) {
			return false;
		}

		if ( method_exists( $order, 'get_meta' ) && '' !== (string) $order->get_meta( self::READY_EMAIL_SENT_META, true ) ) {
			return false;
		}

		$email = sanitize_email( (string) $order->get_billing_email() );
		if ( '' === $email ) {
			return false;
		}

		$order_number  = method_exists( $order, 'get_order_number' ) ? (string) $order->get_order_number() : '';
		$customer_name = $this->customer_name( $order );
		$subject       = sprintf( __( 'Your Pug order %s is ready for pickup', 'tcg-store-platform' ), $order_number );
		$lines         = array(
			sprintf( __( 'Hi %s,', 'tcg-store-platform' ), '' !== $customer_name ? $customer_name : __( 'there', 'tcg-store-platform' ) ),
			'',
			sprintf( __( 'Order %s is ready for pickup at The Pug.', 'tcg-store-platform' ), $order_number ),
			__( 'Please bring your order number and ID when you arrive.', 'tcg-store-platform' ),
			'',
			__( 'Picked items:', 'tcg-store-platform' ),
		);

		foreach ( $this->serialized_line_items( $order ) as $item ) {
			$lines[] = sprintf(
				'- %1$s (%2$s) %3$s',
				(string) ( $item['card_name'] ?? '' ),
				(string) ( $item['condition'] ?? '' ),
				(string) ( $item['barcode'] ?? '' )
			);
		}

		$sent = wp_mail( $email, $subject, implode( "\n", $lines ) );
		if ( $sent && method_exists( $order, 'update_meta_data' ) ) {
			$order->update_meta_data( self::READY_EMAIL_SENT_META, gmdate( 'c' ) );
			if ( method_exists( $order, 'add_order_note' ) ) {
				$order->add_order_note( __( 'Ready-for-pickup email sent to customer.', 'tcg-store-platform' ) );
			}
		}

		return (bool) $sent;
	}

	/**
	 * @param list<string> $explicit_statuses Sanitized statuses explicitly requested by the reader.
	 */
	private function fulfillment_order_payload( mixed $order, array $explicit_statuses = array() ): ?array {
		if ( ! is_object( $order ) || ! method_exists( $order, 'get_items' ) ) {
			return null;
		}

		$order_status = method_exists( $order, 'get_status' ) ? (string) $order->get_status() : '';
		$is_terminal  = in_array( $order_status, self::TERMINAL_RELAY_STATUSES, true );

		if ( $is_terminal ) {
			if ( ! in_array( $order_status, $explicit_statuses, true ) || ! $this->has_prior_payment_evidence( $order, $order_status ) ) {
				return null;
			}
		} elseif ( ! method_exists( $order, 'is_paid' ) || ! $order->is_paid() ) {
			return null;
		}

		$pickup = $this->local_pickup_summary( $order );
		if ( ! $pickup['is_local_pickup'] ) {
			return null;
		}

		$items = $this->serialized_line_items( $order );
		if ( array() === $items || ( $is_terminal && ! $this->has_exact_serialized_line_identities( $items ) ) ) {
			return null;
		}

		$fulfillment_status = $this->fulfillment_status( $order );

		$order_id = method_exists( $order, 'get_id' ) ? (int) $order->get_id() : 0;

		return array(
			'order_id'               => $order_id,
			'order_number'           => method_exists( $order, 'get_order_number' ) ? (string) $order->get_order_number() : (string) $order_id,
			'customer_name'          => $this->customer_name( $order ),
			'order_status'           => $order_status,
			'fulfillment_status'     => $fulfillment_status,
			'payment_status'         => 'paid',
			'shipping_method_id'     => $pickup['method_id'],
			'shipping_method_title'  => $pickup['method_title'],
			'local_pickup'           => $pickup['is_local_pickup'],
			'item_count'             => count( $items ),
			'total_minor_units'      => $this->minor_units( method_exists( $order, 'get_total' ) ? $order->get_total() : '0' ),
			'currency'               => method_exists( $order, 'get_currency' ) ? (string) $order->get_currency() : 'USD',
			'paid_at_utc'            => $this->date_to_utc( method_exists( $order, 'get_date_paid' ) ? $order->get_date_paid() : null ),
			'created_at_utc'         => $this->date_to_utc( method_exists( $order, 'get_date_created' ) ? $order->get_date_created() : null ),
			'items'                  => $items,
		);
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function serialized_line_items( mixed $order ): array {
		$items = array();

		foreach ( $order->get_items() as $item ) {
			if ( ! is_object( $item ) || ! method_exists( $item, 'get_meta' ) ) {
				continue;
			}

			if ( '1' !== (string) $item->get_meta( '_tcg_serialized_inventory', true ) ) {
				continue;
			}

			$items[] = array(
				'order_item_id'     => method_exists( $item, 'get_id' ) ? (int) $item->get_id() : 0,
				'inventory_id'      => (int) $item->get_meta( '_tcg_inventory_id', true ),
				'reservation_id'    => (int) $item->get_meta( '_tcg_reservation_id', true ),
				'barcode'           => (string) $item->get_meta( '_tcg_barcode', true ),
				'card_name'         => (string) $item->get_meta( '_tcg_card_name', true ),
				'set_name'          => (string) $item->get_meta( '_tcg_set_name', true ),
				'condition'         => (string) $item->get_meta( '_tcg_condition_code', true ),
				'price_minor_units' => (int) $item->get_meta( '_tcg_price_minor_units', true ),
				'currency'          => (string) $item->get_meta( '_tcg_currency', true ),
				'quantity'          => method_exists( $item, 'get_quantity' ) ? (int) $item->get_quantity() : 1,
			);
		}

		return $items;
	}

	/**
	 * Terminal relay rows must be able to identify every authoritative reservation exactly.
	 *
	 * @param list<array<string, mixed>> $items Serialized fulfillment lines.
	 */
	private function has_exact_serialized_line_identities( array $items ): bool {
		if ( array() === $items ) {
			return false;
		}

		foreach ( $items as $item ) {
			if (
				(int) ( $item['inventory_id'] ?? 0 ) <= 0
				|| (int) ( $item['reservation_id'] ?? 0 ) <= 0
				|| '' === trim( (string) ( $item['barcode'] ?? '' ) )
			) {
				return false;
			}
		}

		return true;
	}

	private function has_prior_payment_evidence( mixed $order, string $order_status ): bool {
		$date_paid = method_exists( $order, 'get_date_paid' ) ? $order->get_date_paid() : null;
		if ( '' !== $this->date_to_utc( $date_paid ) ) {
			return true;
		}

		if ( 'refunded' !== $order_status ) {
			return false;
		}

		if ( method_exists( $order, 'get_total_refunded' ) && abs( (float) $order->get_total_refunded() ) > 0.0 ) {
			return true;
		}

		if ( method_exists( $order, 'get_refunds' ) ) {
			$refunds = $order->get_refunds();

			return is_array( $refunds ) && array() !== $refunds;
		}

		return false;
	}

	/**
	 * @return array{eligible: bool, code: string}
	 */
	private function fulfillment_eligibility( mixed $order ): array {
		if ( ! is_object( $order ) || ! method_exists( $order, 'get_items' ) ) {
			return FulfillmentOrderMutationPolicy::eligibility( false, false, 0 );
		}

		$order_status     = method_exists( $order, 'get_status' ) ? (string) $order->get_status() : '';
		$is_terminal      = in_array( $order_status, self::TERMINAL_RELAY_STATUSES, true );
		$paid             = ! $is_terminal && method_exists( $order, 'is_paid' ) && (bool) $order->is_paid();
		$local_pickup     = $this->local_pickup_summary( $order )['is_local_pickup'];
		$serialized_lines = $this->serialized_line_items( $order );

		return FulfillmentOrderMutationPolicy::eligibility( $paid, $local_pickup, count( $serialized_lines ) );
	}

	private function fulfillment_eligibility_message( string $code ): string {
		if ( 'order_not_local_pickup' === $code ) {
			return __( 'Only local-pickup orders can enter pickup fulfillment.', 'tcg-store-platform' );
		}

		if ( 'order_has_no_serialized_lines' === $code ) {
			return __( 'Pickup fulfillment requires at least one serialized inventory line.', 'tcg-store-platform' );
		}

		return __( 'Only paid WooCommerce orders can enter pickup fulfillment.', 'tcg-store-platform' );
	}

	private function fulfillment_status( mixed $order ): string {
		$stored_status = method_exists( $order, 'get_meta' )
			? $order->get_meta( self::STATUS_META, true )
			: '';
		$order_status  = method_exists( $order, 'get_status' ) ? $order->get_status() : '';

		return FulfillmentOrderMutationPolicy::derive_status( $stored_status, $order_status );
	}

	/**
	 * @return array{is_local_pickup: bool, method_id: string, method_title: string}
	 */
	private function local_pickup_summary( mixed $order ): array {
		$summary = array(
			'is_local_pickup' => false,
			'method_id'       => '',
			'method_title'    => '',
		);

		if ( ! method_exists( $order, 'get_shipping_methods' ) ) {
			return $summary;
		}

		foreach ( $order->get_shipping_methods() as $shipping_item ) {
			$method_id = is_object( $shipping_item ) && method_exists( $shipping_item, 'get_method_id' )
				? (string) $shipping_item->get_method_id()
				: '';
			$title = is_object( $shipping_item ) && method_exists( $shipping_item, 'get_method_title' )
				? (string) $shipping_item->get_method_title()
				: '';

			if ( str_contains( strtolower( $method_id ), 'local_pickup' ) || str_contains( strtolower( $title ), 'local pickup' ) ) {
				return array(
					'is_local_pickup' => true,
					'method_id'       => $method_id,
					'method_title'    => $title,
				);
			}

			if ( '' === $summary['method_id'] && '' !== $method_id ) {
				$summary['method_id']    = $method_id;
				$summary['method_title'] = $title;
			}
		}

		return $summary;
	}

	/**
	 * @return list<string>
	 */
	private function order_statuses( mixed $value ): array {
		if ( is_string( $value ) && '' !== trim( $value ) ) {
			return array_values(
				array_filter(
					array_map(
						static fn ( string $status ): string => preg_replace( '/[^a-z0-9_-]/', '', strtolower( trim( $status ) ) ) ?? '',
						explode( ',', $value )
					)
				)
			);
		}

		return array( 'processing', 'ready-pickup', 'completed', 'on-hold' );
	}

	private function clean_fulfillment_status( mixed $value ): string {
		return FulfillmentOrderMutationPolicy::clean_status( $value );
	}

	private function customer_name( mixed $order ): string {
		$first = method_exists( $order, 'get_billing_first_name' ) ? (string) $order->get_billing_first_name() : '';
		$last  = method_exists( $order, 'get_billing_last_name' ) ? (string) $order->get_billing_last_name() : '';

		return trim( preg_replace( '/\s+/', ' ', $first . ' ' . $last ) ?? '' );
	}

	private function date_to_utc( mixed $date ): string {
		if ( is_object( $date ) && method_exists( $date, 'date' ) ) {
			return (string) $date->date( 'Y-m-d\TH:i:s\Z' );
		}

		return '';
	}

	private function minor_units( mixed $value ): int {
		return max( 0, (int) round( (float) $value * 100 ) );
	}

	private function bounded_int( mixed $value, int $minimum, int $maximum, int $fallback ): int {
		$parsed = is_numeric( $value ) ? (int) $value : $fallback;

		return min( $maximum, max( $minimum, $parsed ) );
	}

	private function blocked_response( string $code, string $message, int $status ): \WP_REST_Response {
		return new \WP_REST_Response(
			array(
				'error' => array(
					'code'    => $code,
					'message' => $message,
				),
			),
			$status
		);
	}

	private function can( string $capability ): bool {
		return function_exists( 'current_user_can' ) && current_user_can( $capability );
	}
}
