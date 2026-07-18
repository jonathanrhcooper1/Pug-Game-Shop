<?php
/**
 * Event filter sanitization tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Events\EventFilters;
use TCGStorePlatform\Tests\TestCase;

final class EventFiltersTest extends TestCase {
	public function test_filters_sanitize_public_event_query_values(): void {
		$filters = EventFilters::from_array(
			array(
				'game'                => 'Magic: The Gathering',
				'format'              => 'Commander Night!',
				'event_type'          => 'Trade Night',
				'registration_status' => 'Almost Full',
				'date_from'           => '2026-06-01',
				'date_to'             => '2026-06-30',
				'free_paid'           => 'paid',
				'tone'                => 'competitive',
				'featured'            => 'yes',
			)
		);

		$this->assert_same(
			array(
				'game'                => 'magic-the-gathering',
				'format'              => 'commander-night',
				'event_type'          => 'trade-night',
				'registration_status' => 'almost-full',
				'date_from'           => '2026-06-01',
				'date_to'             => '2026-06-30',
				'free_paid'           => 'paid',
				'tone'                => 'competitive',
				'featured'            => true,
			),
			$filters->to_array()
		);
	}

	public function test_invalid_filter_values_are_dropped(): void {
		$filters = EventFilters::from_array(
			array(
				'date_from' => 'tomorrow',
				'date_to'   => '2026/06/30',
				'free_paid' => 'discounted',
				'tone'      => 'intense',
				'featured'  => 'no',
			)
		);

		$this->assert_same( array(), $filters->to_array() );
	}
}
