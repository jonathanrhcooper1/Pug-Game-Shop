<?php
/**
 * Events schema tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Migrations\EventsSchema;
use TCGStorePlatform\Tests\TestCase;

final class EventsSchemaTest extends TestCase {
	public function test_event_tables_are_present(): void {
		$tables = EventsSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' );

		$this->assert_same( 6, count( $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_events', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_event_registrations', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_event_registration_logs', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_event_waitlist', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_event_checkins', $tables ) );
		$this->assert_true( array_key_exists( 'wp_tcg_event_templates', $tables ) );
	}

	public function test_event_table_contains_required_public_and_commerce_fields(): void {
		$events = EventsSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_events'];

		$this->assert_contains( 'registration_mode varchar(32) NOT NULL DEFAULT \'local_only\'', $events );
		$this->assert_not_contains( 'topdeck_', $events );
		$this->assert_contains( 'woocommerce_product_id bigint(20) unsigned NULL', $events );
		$this->assert_contains( 'offline_reservation_enabled tinyint(1) unsigned NOT NULL DEFAULT 0', $events );
		$this->assert_contains( 'KEY public_start (public_visibility, start_datetime)', $events );
	}

	public function test_registration_table_tracks_payment_and_checkin_state(): void {
		$registrations = EventsSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' )['wp_tcg_event_registrations'];

		$this->assert_contains( 'status varchar(32) NOT NULL DEFAULT \'reserved\'', $registrations );
		$this->assert_contains( 'payment_status varchar(32) NOT NULL DEFAULT \'not_required\'', $registrations );
		$this->assert_contains( 'woocommerce_order_id bigint(20) unsigned NULL', $registrations );
		$this->assert_not_contains( 'topdeck_', $registrations );
		$this->assert_contains( 'checkin_status varchar(32) NOT NULL DEFAULT \'not_checked_in\'', $registrations );
		$this->assert_contains( 'KEY event_status (event_id, status)', $registrations );
	}

	public function test_dbdelta_statements_avoid_if_not_exists(): void {
		foreach ( EventsSchema::tables( 'wp_', 'DEFAULT CHARACTER SET utf8mb4' ) as $sql ) {
			$this->assert_not_contains( 'IF NOT EXISTS', $sql );
		}
	}

	public function test_drop_order_reverses_event_dependencies(): void {
		$this->assert_same(
			array(
				'wp_tcg_event_templates',
				'wp_tcg_event_checkins',
				'wp_tcg_event_waitlist',
				'wp_tcg_event_registration_logs',
				'wp_tcg_event_registrations',
				'wp_tcg_events',
			),
			EventsSchema::drop_order( 'wp_' )
		);
	}
}
