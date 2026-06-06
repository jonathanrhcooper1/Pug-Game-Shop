<?php
/**
 * Events and TopDeck schema tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\EventsTopDeckSchema;
use TCGStorePlatform\Tests\TestCase;

final class EventsTopDeckSchemaTest extends TestCase {
	public function test_events_topdeck_tables_are_present(): void {
		$tables = EventsTopDeckSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' );

		$this->assert_same( 7, count( $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_events', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_event_registrations', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_event_registration_logs', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_event_topdeck_sync_log', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_event_waitlist', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_event_checkins', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_event_templates', $tables ) );
	}

	public function test_event_table_contains_required_public_and_provider_fields(): void {
		$events = EventsTopDeckSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_events'];

		$this->assert_contains( 'registration_mode varchar(32) NOT NULL DEFAULT \'local_only\'', $events );
		$this->assert_contains( 'topdeck_tid varchar(191) NULL', $events );
		$this->assert_contains( 'topdeck_registration_url varchar(255) NULL', $events );
		$this->assert_contains( 'topdeck_create_supported tinyint(1) unsigned NOT NULL DEFAULT 0', $events );
		$this->assert_contains( 'woocommerce_product_id bigint(20) unsigned NULL', $events );
		$this->assert_contains( 'offline_reservation_enabled tinyint(1) unsigned NOT NULL DEFAULT 0', $events );
		$this->assert_contains( 'KEY public_start (public_visibility, start_datetime)', $events );
		$this->assert_contains( 'KEY topdeck_sync (topdeck_enabled, topdeck_sync_status, topdeck_last_sync_at)', $events );
	}

	public function test_registration_table_tracks_payment_topdeck_and_checkin_state(): void {
		$registrations = EventsTopDeckSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_event_registrations'];

		$this->assert_contains( 'status varchar(32) NOT NULL DEFAULT \'reserved\'', $registrations );
		$this->assert_contains( 'payment_status varchar(32) NOT NULL DEFAULT \'not_required\'', $registrations );
		$this->assert_contains( 'woocommerce_order_id bigint(20) unsigned NULL', $registrations );
		$this->assert_contains( 'topdeck_response_json longtext NULL', $registrations );
		$this->assert_contains( 'checkin_status varchar(32) NOT NULL DEFAULT \'not_checked_in\'', $registrations );
		$this->assert_contains( 'KEY event_status (event_id, status)', $registrations );
	}

	public function test_topdeck_sync_log_records_payloads_and_errors(): void {
		$sync_log = EventsTopDeckSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_event_topdeck_sync_log'];

		$this->assert_contains( 'action varchar(64) NOT NULL', $sync_log );
		$this->assert_contains( 'request_payload longtext NULL', $sync_log );
		$this->assert_contains( 'response_payload longtext NULL', $sync_log );
		$this->assert_contains( 'error_code varchar(100) NULL', $sync_log );
		$this->assert_contains( 'KEY action_status_created (action, status, created_at)', $sync_log );
	}

	public function test_dbdelta_statements_avoid_if_not_exists(): void {
		foreach ( EventsTopDeckSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' ) as $sql ) {
			$this->assert_not_contains( 'IF NOT EXISTS', $sql );
		}
	}

	public function test_drop_order_reverses_event_dependencies(): void {
		$this->assert_same(
			array(
				'wp_tcg_event_templates',
				'wp_tcg_event_checkins',
				'wp_tcg_event_waitlist',
				'wp_tcg_event_topdeck_sync_log',
				'wp_tcg_event_registration_logs',
				'wp_tcg_event_registrations',
				'wp_tcg_events',
			),
			EventsTopDeckSchema::drop_order( 'wp_' )
		);
	}
}
