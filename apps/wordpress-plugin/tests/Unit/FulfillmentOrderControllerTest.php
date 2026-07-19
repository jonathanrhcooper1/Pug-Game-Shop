<?php
/**
 * Fulfillment order route contract tests.
 *
 * @package TCGStorePlatform
 */

namespace {
	if ( ! class_exists( 'FulfillmentOrderTestDate' ) ) {
		final class FulfillmentOrderTestDate {
			public function __construct( private string $value ) {
			}

			public function date( string $format ): string {
				unset( $format );

				return $this->value;
			}
		}
	}

	if ( ! class_exists( 'FulfillmentOrderTestItem' ) ) {
		final class FulfillmentOrderTestItem {
			public function __construct( private int $id, private array $metadata, private int $quantity = 1 ) {
			}

			public function get_id(): int {
				return $this->id;
			}

			public function get_meta( string $key, bool $single = true ): mixed {
				unset( $single );

				return $this->metadata[ $key ] ?? '';
			}

			public function get_quantity(): int {
				return $this->quantity;
			}
		}
	}

	if ( ! class_exists( 'FulfillmentOrderTestShippingMethod' ) ) {
		final class FulfillmentOrderTestShippingMethod {
			public function __construct( private string $method_id, private string $method_title ) {
			}

			public function get_method_id(): string {
				return $this->method_id;
			}

			public function get_method_title(): string {
				return $this->method_title;
			}
		}
	}

	if ( ! class_exists( 'FulfillmentOrderTestOrder' ) ) {
		final class FulfillmentOrderTestOrder {
			public function __construct( private array $values ) {
			}

			public function get_id(): int {
				return (int) $this->values['id'];
			}

			public function get_order_number(): string {
				return (string) $this->values['order_number'];
			}

			public function get_status(): string {
				return (string) $this->values['status'];
			}

			public function is_paid(): bool {
				return (bool) $this->values['paid'];
			}

			public function get_items(): array {
				return $this->values['items'];
			}

			public function get_shipping_methods(): array {
				return $this->values['shipping_methods'];
			}

			public function get_date_paid(): mixed {
				return $this->values['date_paid'];
			}

			public function get_date_created(): mixed {
				return $this->values['date_created'];
			}

			public function get_total_refunded(): string {
				return (string) $this->values['total_refunded'];
			}

			public function get_refunds(): array {
				return $this->values['refunds'];
			}

			public function get_total(): string {
				return (string) $this->values['total'];
			}

			public function get_currency(): string {
				return (string) $this->values['currency'];
			}

			public function get_billing_first_name(): string {
				return (string) $this->values['first_name'];
			}

			public function get_billing_last_name(): string {
				return (string) $this->values['last_name'];
			}

			public function get_meta( string $key, bool $single = true ): mixed {
				unset( $single );

				return $this->values['metadata'][ $key ] ?? '';
			}
		}
	}
}

namespace TCGStorePlatform\Tests\Unit {
	use ReflectionMethod;
	use RuntimeException;
	use TCGStorePlatform\Api\V1\FulfillmentOrderController;
	use TCGStorePlatform\Tests\TestCase;

	final class FulfillmentOrderControllerTest extends TestCase {
	public function test_fulfillment_order_routes_cover_paid_local_pickup_queue(): void {
		$contracts = FulfillmentOrderController::route_contracts();

		$this->assert_same( 2, count( $contracts ) );
		$this->assert_same( 'tcg-store/v1', $contracts[0]['namespace'] );
		$this->assert_same( '/fulfillment/orders', $contracts[0]['path'] );
		$this->assert_same( 'GET', $contracts[0]['method'] );
		$this->assert_same( 'list_fulfillment_orders', $contracts[0]['callback'] );
		$this->assert_same( 'view_inventory', $contracts[0]['permission'] );
		$this->assert_same( '/fulfillment/orders/(?P<order_id>\d+)/status', $contracts[1]['path'] );
		$this->assert_same( 'PATCH', $contracts[1]['method'] );
		$this->assert_same( 'update_fulfillment_status', $contracts[1]['callback'] );
		$this->assert_same( 'create_inventory', $contracts[1]['permission'] );
	}

	public function test_ready_pickup_remains_a_paid_woocommerce_status(): void {
		$controller = new FulfillmentOrderController();
		$statuses   = $controller->add_ready_pickup_paid_order_status( array( 'processing', 'completed' ) );

		$this->assert_same( array( 'processing', 'completed', 'ready-pickup' ), $statuses );
		$this->assert_same( $statuses, $controller->add_ready_pickup_paid_order_status( $statuses ) );
	}

	public function test_explicit_paid_refunded_order_is_included_after_woo_is_paid_turns_false(): void {
		$order = $this->order(
			array(
				'status'    => 'refunded',
				'paid'      => false,
				'date_paid' => new \FulfillmentOrderTestDate( '2026-07-18T14:15:00Z' ),
			)
		);

		$this->assert_same( null, $this->payload( $order ) );

		$payload = $this->payload( $order, array( 'refunded' ) );

		$this->assert_true( is_array( $payload ) );
		$this->assert_same( 'refunded', $payload['order_status'] );
		$this->assert_same( 'paid', $payload['payment_status'] );
		$this->assert_same( '2026-07-18T14:15:00Z', $payload['paid_at_utc'] );
	}

	public function test_unpaid_cancelled_order_is_excluded_when_explicitly_requested(): void {
		$order = $this->order(
			array(
				'status'    => 'cancelled',
				'paid'      => false,
				'date_paid' => null,
			)
		);

		$this->assert_same( null, $this->payload( $order, array( 'cancelled' ) ) );
	}

	public function test_refunded_relay_preserves_exact_serialized_line_identities(): void {
		$item = $this->serialized_item(
			array(
				'_tcg_inventory_id'   => 83017,
				'_tcg_reservation_id' => 44109,
				'_tcg_barcode'        => 'PUG-00A-004271',
			)
		);
		$order = $this->order(
			array(
				'status'    => 'refunded',
				'paid'      => false,
				'date_paid' => new \FulfillmentOrderTestDate( '2026-07-18T14:15:00Z' ),
				'items'     => array( $item ),
			)
		);

		$payload = $this->payload( $order, array( 'refunded' ) );

		$this->assert_true( is_array( $payload ) );
		$this->assert_same( 83017, $payload['items'][0]['inventory_id'] );
		$this->assert_same( 44109, $payload['items'][0]['reservation_id'] );
		$this->assert_same( 'PUG-00A-004271', $payload['items'][0]['barcode'] );
		$this->assert_same( 7001, $payload['items'][0]['order_item_id'] );
	}

	public function test_terminal_relay_rejects_incomplete_serialized_line_identity(): void {
		$order = $this->order(
			array(
				'status'    => 'refunded',
				'paid'      => false,
				'date_paid' => new \FulfillmentOrderTestDate( '2026-07-18T14:15:00Z' ),
				'items'     => array( $this->serialized_item( array( '_tcg_reservation_id' => 0 ) ) ),
			)
		);

		$this->assert_same( null, $this->payload( $order, array( 'refunded' ) ) );
	}

	public function test_documented_woo_refund_is_prior_payment_evidence_without_paid_date(): void {
		$order = $this->order(
			array(
				'status'          => 'refunded',
				'paid'            => false,
				'date_paid'       => null,
				'total_refunded'  => '24.50',
				'refunds'         => array( new \stdClass() ),
			)
		);

		$this->assert_true( is_array( $this->payload( $order, array( 'refunded' ) ) ) );
	}

	public function test_active_paid_pickup_order_remains_eligible_without_terminal_request(): void {
		$payload = $this->payload(
			$this->order(
				array(
					'status'    => 'processing',
					'paid'      => true,
					'date_paid' => null,
				)
			)
		);

		$this->assert_true( is_array( $payload ) );
		$this->assert_same( 'processing', $payload['order_status'] );
		$this->assert_same( 1, $payload['item_count'] );
	}

	public function test_terminal_order_is_not_eligible_for_active_status_mutation(): void {
		$order = $this->order(
			array(
				'status'    => 'refunded',
				'paid'      => true,
				'date_paid' => new \FulfillmentOrderTestDate( '2026-07-18T14:15:00Z' ),
			)
		);

		$eligibility = $this->invoke_private( 'fulfillment_eligibility', array( $order ) );

		$this->assert_false( $eligibility['eligible'] );
		$this->assert_same( 'order_not_paid', $eligibility['code'] );
	}

	public function test_source_keeps_fulfillment_paid_pickup_and_inventory_boundaries(): void {
		$source = $this->source();

		foreach (
			array(
				'register_ready_pickup_order_status',
				'wc_order_statuses',
				'woocommerce_order_is_paid_statuses',
				'wc_get_orders',
				'local_pickup',
				'is_paid',
				'_tcg_serialized_inventory',
				'_tcg_fulfillment_status',
				'_tcg_ready_for_pickup_email_sent_at',
				'awaiting_pull',
				'ready_for_pickup',
				'ready-pickup',
				'wp_mail',
				'get_billing_email',
				'Ready for pickup',
				'payment_authority',
				'woocommerce_square_or_configured_gateway',
				'inventory_authority',
				'tcg_store_platform_reservations',
				'inventory_mutation_performed',
				'payment_capture_performed',
				'credentials_synced_to_client',
				'fulfillment_notifications',
				'notification_sound_url',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}
	}

	public function test_source_checks_eligibility_and_transition_before_order_mutation(): void {
		$source             = $this->source();
		$eligibility_offset = strpos( $source, '$eligibility = $this->fulfillment_eligibility( $order );' );
		$transition_offset  = strpos( $source, 'FulfillmentOrderMutationPolicy::transition' );
		$mutation_offset    = strpos( $source, '$order->update_meta_data( self::STATUS_META, $status );' );

		$this->assert_true( false !== $eligibility_offset );
		$this->assert_true( false !== $transition_offset );
		$this->assert_true( false !== $mutation_offset );
		$this->assert_true( $eligibility_offset < $mutation_offset );
		$this->assert_true( $transition_offset < $mutation_offset );
		$this->assert_contains( "array( 'processing', 'ready-pickup', 'completed', 'on-hold' )", $source );
	}

	/** @param array<string, mixed> $overrides */
	private function order( array $overrides = array() ): object {
		return new \FulfillmentOrderTestOrder(
			array_replace(
				array(
					'id'               => 9401,
					'order_number'     => 'PUG-9401',
					'status'           => 'processing',
					'paid'             => true,
					'items'            => array( $this->serialized_item() ),
					'shipping_methods' => array( new \FulfillmentOrderTestShippingMethod( 'local_pickup:4', 'Local pickup' ) ),
					'date_paid'        => new \FulfillmentOrderTestDate( '2026-07-18T14:15:00Z' ),
					'date_created'     => new \FulfillmentOrderTestDate( '2026-07-18T14:00:00Z' ),
					'total_refunded'   => '0',
					'refunds'          => array(),
					'total'            => '24.50',
					'currency'         => 'USD',
					'first_name'       => 'Ada',
					'last_name'        => 'Lovelace',
					'metadata'         => array(),
				),
				$overrides
			)
		);
	}

	/** @param array<string, mixed> $overrides */
	private function serialized_item( array $overrides = array() ): object {
		return new \FulfillmentOrderTestItem(
			7001,
			array_replace(
				array(
					'_tcg_serialized_inventory' => '1',
					'_tcg_inventory_id'         => 83001,
					'_tcg_reservation_id'       => 44101,
					'_tcg_barcode'              => 'PUG-00A-004201',
					'_tcg_card_name'            => 'Black Lotus',
					'_tcg_set_name'             => 'Limited Edition Alpha',
					'_tcg_condition_code'       => 'NM',
					'_tcg_price_minor_units'    => 2450,
					'_tcg_currency'             => 'USD',
				),
				$overrides
			)
		);
	}

	/**
	 * @param list<string> $explicit_statuses
	 * @return array<string, mixed>|null
	 */
	private function payload( object $order, array $explicit_statuses = array() ): ?array {
		$result = $this->invoke_private( 'fulfillment_order_payload', array( $order, $explicit_statuses ) );

		return is_array( $result ) ? $result : null;
	}

	private function invoke_private( string $method_name, array $arguments ): mixed {
		$controller = new FulfillmentOrderController();
		$method     = new ReflectionMethod( FulfillmentOrderController::class, $method_name );
		$method->setAccessible( true );

		return $method->invokeArgs( $controller, $arguments );
	}

	private function source(): string {
		$path     = dirname( __DIR__, 2 ) . '/src/Api/V1/FulfillmentOrderController.php';
		$contents = file_get_contents( $path );

		if ( false === $contents ) {
			throw new RuntimeException( 'Unable to read FulfillmentOrderController.php.' );
		}

		return $contents;
	}
	}
}
