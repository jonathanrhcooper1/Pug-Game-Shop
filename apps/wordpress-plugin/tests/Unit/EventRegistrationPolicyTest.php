<?php
/**
 * Event registration policy tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use DateTimeImmutable;
use TCGStorePlatform\Events\EventPaymentStatus;
use TCGStorePlatform\Events\EventRegistrationMode;
use TCGStorePlatform\Events\EventRegistrationPolicy;
use TCGStorePlatform\Events\EventRegistrationStatus;
use TCGStorePlatform\Tests\TestCase;

final class EventRegistrationPolicyTest extends TestCase {
	public function test_full_events_use_waitlist_when_enabled(): void {
		$decision = ( new EventRegistrationPolicy() )->decide(
			array_merge(
				$this->event(),
				array(
					'player_cap'       => 8,
					'waitlist_enabled' => 1,
				)
			),
			8,
			new DateTimeImmutable( '2026-06-01 12:00:00' )
		);

		$this->assert_true( $decision->is_accepted() );
		$this->assert_true( $decision->is_waitlist() );
		$this->assert_same( EventRegistrationStatus::WAITLIST, $decision->status() );
		$this->assert_same( EventPaymentStatus::NOT_REQUIRED, $decision->payment_status() );
	}

	public function test_paid_events_require_pay_at_store_until_online_payment_is_available(): void {
		$decision = ( new EventRegistrationPolicy() )->decide(
			array_merge(
				$this->event(),
				array(
					'entry_fee'          => '10.0000',
					'allow_pay_at_store' => 0,
				)
			),
			0,
			new DateTimeImmutable( '2026-06-01 12:00:00' )
		);

		$this->assert_false( $decision->is_accepted() );
		$this->assert_same( 'online_payment_required', $decision->code() );
	}

	public function test_paid_pay_at_store_events_hold_a_local_reservation(): void {
		$decision = ( new EventRegistrationPolicy() )->decide(
			array_merge(
				$this->event(),
				array(
					'entry_fee'          => '10.0000',
					'allow_pay_at_store' => 1,
				)
			),
			0,
			new DateTimeImmutable( '2026-06-01 12:00:00' )
		);

		$this->assert_true( $decision->is_accepted() );
		$this->assert_same( EventRegistrationStatus::RESERVED, $decision->status() );
		$this->assert_same( EventPaymentStatus::PAY_AT_STORE, $decision->payment_status() );
	}

	public function test_registration_deadline_closes_local_registration(): void {
		$decision = ( new EventRegistrationPolicy() )->decide(
			array_merge(
				$this->event(),
				array( 'registration_deadline' => '2026-05-31 23:59:59' )
			),
			0,
			new DateTimeImmutable( '2026-06-01 12:00:00' )
		);

		$this->assert_false( $decision->is_accepted() );
		$this->assert_same( 'registration_closed', $decision->code() );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function event(): array {
		return array(
			'registration_mode'     => EventRegistrationMode::LOCAL_ONLY,
			'registration_deadline' => '2026-06-06 17:00:00',
			'player_cap'            => 16,
			'waitlist_enabled'      => 0,
			'entry_fee'             => '0.0000',
			'allow_pay_at_store'    => 0,
		);
	}
}
