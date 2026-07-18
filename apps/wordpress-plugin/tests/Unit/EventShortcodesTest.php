<?php
/**
 * Event shortcode tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Events\EventShortcodes;
use TCGStorePlatform\Tests\TestCase;

final class EventShortcodesTest extends TestCase {
	public function test_event_shortcode_contracts_include_registration_assets(): void {
		$this->assert_same( 'tcg-store-public-events', EventShortcodes::STYLE_HANDLE );

		$contracts = EventShortcodes::hook_contracts();
		$map       = array();

		foreach ( $contracts as $contract ) {
			$map[ $contract['type'] . ' ' . $contract['hook'] ] = $contract['callback'];
		}

		$this->assert_same( 'render_events', $map['shortcode tcg_events'] );
		$this->assert_same( 'render_event_detail', $map['shortcode tcg_event_detail'] );
		$this->assert_same( 'enqueue_assets', $map['action wp_enqueue_scripts'] );

		$source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/src/Events/EventShortcodes.php' );
		$this->assert_contains( 'events-empty-state', $source );
		$this->assert_contains( 'tcg_event', $source );
		$this->assert_contains( 'tcg-event-card__link', $source );
		$this->assert_contains( 'tcg-event-hero', $source );
		$this->assert_contains( 'tcg-event-registration__payment', $source );
		$this->assert_contains( 'View & Register', $source );
		$this->assert_contains( 'Pay at store', $source );
	}

	public function test_empty_event_state_is_readable_on_dark_storefront_theme(): void {
		$css = (string) file_get_contents( dirname( __DIR__, 2 ) . '/assets/css/public-events.css' );

		$this->assert_contains( '.tcg-events-empty', $css );
		$this->assert_contains( '.tcg-event-detail-empty', $css );
		$this->assert_contains( 'grid-template-columns: repeat(3, minmax(220px, 1fr))', $css );
		$this->assert_contains( '.tcg-events:has(.tcg-event-card:only-child)', $css );
		$this->assert_contains( '.tcg-event-card__cta', $css );
		$this->assert_contains( '.tcg-event-game-mark--pokemon', $css );
		$this->assert_contains( '.tcg-event-hero', $css );
		$this->assert_contains( '.tcg-event-stats', $css );
		$this->assert_contains( '.tcg-event-registration__payment', $css );
		$this->assert_contains( 'color: #f8fbff', $css );
		$this->assert_contains( 'rgba(255, 208, 68, 0.34)', $css );
	}
}
