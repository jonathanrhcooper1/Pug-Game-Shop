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
	}
}
