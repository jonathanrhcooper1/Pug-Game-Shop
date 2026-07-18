<?php
/**
 * Fulfillment order route contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

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

	private function source(): string {
		$path     = dirname( __DIR__, 2 ) . '/src/Api/V1/FulfillmentOrderController.php';
		$contents = file_get_contents( $path );

		if ( false === $contents ) {
			throw new RuntimeException( 'Unable to read FulfillmentOrderController.php.' );
		}

		return $contents;
	}
}
