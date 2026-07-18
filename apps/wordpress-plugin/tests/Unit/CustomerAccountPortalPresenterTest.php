<?php
/**
 * Customer account portal presenter tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Tests\TestCase;
use TCGStorePlatform\WooCommerce\CustomerAccountPortalPresenter;

final class CustomerAccountPortalPresenterTest extends TestCase {
	public function test_presenter_exposes_store_credit_without_private_customer_or_ledger_fields(): void {
		$portal = ( new CustomerAccountPortalPresenter() )->present(
			array(
				'customer_id'      => 42,
				'public_id'        => 'customer-public-id',
				'display_name'     => 'Jane Collector',
				'normalized_email' => 'jane@example.com',
				'display_phone'    => '555-1212',
				'credit_balance'   => '27.5',
				'credit_currency'  => 'usd',
				'credit_version'   => 3,
				'status'           => 'active',
			),
			array(
				array(
					'credit_ledger_id'     => 99,
					'public_id'            => 'ledger-public-id',
					'entry_type'           => 'buylist_credit',
					'amount'               => '12.50',
					'currency'             => 'USD',
					'balance_after'        => '27.50',
					'idempotency_key'      => 'secret-idempotency-key',
					'actor_user_id'        => 7,
					'manager_user_id'      => 8,
					'offline_operation_id' => 'offline-op-secret',
					'metadata_json'        => '{"api_key":"secret"}',
					'created_at'           => '2026-06-09 12:00:00',
				),
			),
			array(),
			array(
				'branding' => array(
					'company' => array(
						'name'       => 'The Pug Game Shop',
						'short_name' => 'The Pug',
						'logo_url'   => 'https://example.test/logo.png',
					),
				),
				'links'    => array(
					'shop_url'   => 'https://example.test/shop/',
					'orders_url' => 'https://example.test/my-account/orders/',
				),
			),
			array(
				array(
					'public_id'       => 'registration-public-id',
					'event_id'        => 17,
					'event_title'     => 'Friday Pokemon League',
					'event_slug'      => 'friday-pokemon-league',
					'start_datetime'  => '2026-06-12 18:00:00',
					'email'           => 'jane@example.com',
					'first_name'      => 'Jane',
					'last_name'       => 'Collector',
					'phone'           => '555-1212',
					'status'          => 'reserved',
					'payment_status'  => 'pay_at_store',
					'checkin_status'  => 'not_checked_in',
					'game'            => 'pokemon',
					'format'          => 'Standard',
					'entry_fee'       => '5.0000',
					'currency'        => 'USD',
					'idempotency_key' => 'secret-event-key',
				),
			)
		);

		$json = (string) json_encode( $portal );

		$this->assert_true( $portal['customer_linked'] );
		$this->assert_same( '27.50', $portal['store_credit']['balance'] );
		$this->assert_same( 'USD', $portal['store_credit']['currency'] );
		$this->assert_same( 'The Pug Collector Vault', $portal['brand']['headline'] );
		$this->assert_same( 'https://example.test/shop/', $portal['links']['shop_url'] );
		$this->assert_same( 'Buylist credit', $portal['store_credit']['ledger_entries'][0]['label'] );
		$this->assert_same( 'Friday Pokemon League', $portal['event_history']['registrations'][0]['title'] );
		$this->assert_same( 'Reserved', $portal['event_history']['registrations'][0]['status_label'] );
		$this->assert_same( 'Pay At Store', $portal['event_history']['registrations'][0]['payment_status_label'] );
		$this->assert_same( 'Pokemon', $portal['event_history']['registrations'][0]['game_label'] );
		$this->assert_not_contains( 'jane@example.com', $json );
		$this->assert_not_contains( '555-1212', $json );
		$this->assert_not_contains( 'secret-idempotency-key', $json );
		$this->assert_not_contains( 'secret-event-key', $json );
		$this->assert_not_contains( 'offline-op-secret', $json );
		$this->assert_not_contains( 'api_key', $json );
		$this->assert_not_contains( 'manager_user_id', $json );
	}

	public function test_presenter_formats_card_purchase_history_from_order_snapshots(): void {
		$portal = ( new CustomerAccountPortalPresenter() )->present(
			array(
				'customer_id'     => 42,
				'public_id'       => 'customer-public-id',
				'display_name'    => 'Jane Collector',
				'credit_balance'  => '0',
				'credit_currency' => 'USD',
				'credit_version'  => 0,
				'status'          => 'active',
			),
			array(),
			array(
				array(
					'order_id'     => 7001,
					'order_number' => 'GM-7001',
					'status'       => 'completed',
					'status_label' => 'Completed',
					'created_at'   => '2026-06-09 14:00:00',
					'total'        => '18.99',
					'currency'     => 'usd',
					'item_count'   => 1,
					'view_url'     => 'https://example.test/my-account/view-order/7001/',
					'lines'        => array(
						array(
							'name'           => 'Fallback Product Name',
							'card_name'      => 'Charizard',
							'quantity'       => 1,
							'total'          => '18.99',
							'currency'       => 'USD',
							'is_serialized'  => true,
							'inventory_id'   => 55,
							'condition_code' => 'nm',
							'set_name'       => 'Base Set',
							'card_number'    => '4/102',
						),
					),
				),
			)
		);

		$order = $portal['purchase_history']['orders'][0];
		$line  = $order['lines'][0];

		$this->assert_same( 'GM-7001', $order['order_number'] );
		$this->assert_same( '18.99', $order['total'] );
		$this->assert_same( 'USD', $order['currency'] );
		$this->assert_same( 'Charizard', $line['name'] );
		$this->assert_same( 55, $line['inventory_id'] );
		$this->assert_same( 'NM', $line['condition_code'] );
		$this->assert_same( 'Near Mint', $line['condition_label'] );
		$this->assert_same( 'Base Set', $line['set_name'] );
		$this->assert_same( '4/102', $line['card_number'] );
	}

	public function test_rendered_html_contains_credit_and_purchase_sections(): void {
		$presenter = new CustomerAccountPortalPresenter();
		$portal    = $presenter->present(
			array(
				'customer_id'     => 42,
				'public_id'       => 'customer-public-id',
				'display_name'    => 'Jane Collector',
				'credit_balance'  => '8',
				'credit_currency' => 'USD',
				'credit_version'  => 1,
				'status'          => 'active',
			),
			array(),
			array(
				array(
					'order_id'     => 7001,
					'order_number' => 'GM-7001',
					'status_label' => 'Completed',
					'total'        => '8',
					'currency'     => 'USD',
					'lines'        => array(
						array(
							'card_name'      => 'Mew',
							'quantity'       => 1,
							'condition_code' => 'LP',
						),
					),
				),
			),
			array(
				'branding' => array(
					'company' => array(
						'name'       => 'The Pug Game Shop',
						'short_name' => 'The Pug',
					),
				),
				'links'    => array(
					'shop_url'   => 'https://example.test/shop/',
					'orders_url' => 'https://example.test/my-account/orders/',
				),
			),
			array(
				array(
					'event_title'    => 'Commander Night',
					'start_datetime' => '2026-06-12 19:00:00',
					'status'         => 'confirmed',
					'payment_status' => 'paid',
					'checkin_status' => 'checked_in',
					'game'           => 'magic',
					'format'         => 'Commander',
					'entry_fee'      => '10',
					'currency'       => 'USD',
				),
			)
		);

		$html = $presenter->render_html( $portal );

		$this->assert_contains( 'Store Credit', $html );
		$this->assert_contains( 'Collector Vault', $html );
		$this->assert_contains( 'Browse inventory', $html );
		$this->assert_contains( '8.00 USD', $html );
		$this->assert_contains( 'Card Purchase History', $html );
		$this->assert_contains( 'Order GM-7001', $html );
		$this->assert_contains( 'Mew', $html );
		$this->assert_contains( 'x1', $html );
		$this->assert_contains( 'Lightly Played', $html );
		$this->assert_contains( 'Event Registration History', $html );
		$this->assert_contains( 'Commander Night', $html );
		$this->assert_contains( 'Checked In', $html );
	}
}
