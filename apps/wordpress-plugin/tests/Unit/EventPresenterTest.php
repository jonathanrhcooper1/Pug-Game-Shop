<?php
/**
 * Event presenter tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use DateTimeImmutable;
use DateTimeZone;
use TCGStorePlatform\Events\EventPresenter;
use TCGStorePlatform\Events\EventRegistrationMode;
use TCGStorePlatform\Events\EventStatus;
use TCGStorePlatform\Tests\TestCase;

final class EventPresenterTest extends TestCase {
	public function test_presenter_builds_public_event_card_data(): void {
		$event = EventPresenter::present(
			$this->row(),
			new DateTimeImmutable( '2026-06-06 09:00:00', new DateTimeZone( 'America/New_York' ) )
		);

		$this->assert_same( 'Pokemon Prerelease', $event['title'] );
		$this->assert_same( EventStatus::ALMOST_FULL, $event['registration_status'] );
		$this->assert_same( 4, $event['seats_remaining'] );
		$this->assert_same( '30.00', $event['entry_fee'] );
		$this->assert_false( $event['is_free'] );
		$this->assert_same( array( 'almost_full', 'today', 'decklist_required', 'topdeck_synced' ), $event['badges'] );
		$this->assert_same( 'https://topdeck.example.test/register/td-dev-1001', $event['register_url'] );
		$this->assert_same( 'TopDeck', $event['topdeck']['attribution'] );
	}

	public function test_local_free_event_has_local_badge_and_no_register_url(): void {
		$row                       = $this->row();
		$row['entry_fee']          = '0.0000';
		$row['topdeck_enabled']    = 0;
		$row['registration_mode']  = EventRegistrationMode::LOCAL_ONLY;
		$row['registered_count']   = 2;
		$row['decklist_required']  = 0;
		$row['topdeck_sync_status'] = 'local_event';

		$event = EventPresenter::present(
			$row,
			new DateTimeImmutable( '2026-06-01 09:00:00', new DateTimeZone( 'America/New_York' ) )
		);

		$this->assert_true( $event['is_free'] );
		$this->assert_same( '', $event['register_url'] );
		$this->assert_same( array( 'open', 'local_event' ), $event['badges'] );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function row(): array {
		return array(
			'event_id'                 => 1001,
			'public_id'                => 'event-public-1001',
			'title'                    => 'Pokemon Prerelease',
			'slug'                     => 'pokemon-prerelease',
			'event_type'               => 'prerelease',
			'game'                     => 'pokemon',
			'format'                   => 'sealed',
			'rules_level'              => 'competitive',
			'start_datetime'           => '2026-06-06 17:00:00',
			'end_datetime'             => '2026-06-06 21:00:00',
			'timezone'                 => 'America/New_York',
			'entry_fee'                => '30.0000',
			'currency'                 => 'USD',
			'player_cap'               => 48,
			'registered_count'         => 44,
			'waitlist_enabled'         => 1,
			'registration_mode'        => EventRegistrationMode::TOPDECK_HOSTED,
			'registration_deadline'    => '2026-06-06 16:00:00',
			'refund_deadline'          => '2026-06-05 20:00:00',
			'decklist_required'        => 1,
			'decklist_deadline'        => '2026-06-06 16:30:00',
			'prize_support'            => 'Pack-per-win',
			'description'              => 'Prerelease event.',
			'what_to_bring'            => 'Player ID and sleeves.',
			'featured_event'           => 1,
			'header_image'             => 'https://example.test/event.jpg',
			'topdeck_enabled'          => 1,
			'topdeck_tid'              => 'td-dev-1001',
			'topdeck_event_url'        => 'https://topdeck.example.test/events/td-dev-1001',
			'topdeck_registration_url' => 'https://topdeck.example.test/register/td-dev-1001',
			'topdeck_sync_status'      => 'synced',
		);
	}
}
