<?php
/**
 * Event TopDeck registration planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Events\EventPaymentStatus;
use TCGStorePlatform\Events\EventRegistrationDecision;
use TCGStorePlatform\Events\EventRegistrationMode;
use TCGStorePlatform\Events\EventRegistrationStatus;
use TCGStorePlatform\Events\EventTopDeckRegistrationPlanner;
use TCGStorePlatform\Tests\TestCase;

final class EventTopDeckRegistrationPlannerTest extends TestCase {
	public function test_free_website_push_registration_with_tid_is_deferred_by_default(): void {
		$planner  = new EventTopDeckRegistrationPlanner();
		$decision = EventRegistrationDecision::accepted(
			EventRegistrationStatus::RESERVED,
			EventPaymentStatus::NOT_REQUIRED,
			'Local reservation accepted.'
		);

		$this->assert_false( $planner->should_queue( $this->event(), $decision ) );
	}

	public function test_legacy_provider_queue_requires_explicit_opt_in(): void {
		$planner  = new EventTopDeckRegistrationPlanner( true );
		$decision = EventRegistrationDecision::accepted(
			EventRegistrationStatus::RESERVED,
			EventPaymentStatus::NOT_REQUIRED,
			'Local reservation accepted.'
		);

		$this->assert_true( $planner->should_queue( $this->event(), $decision ) );
	}

	public function test_local_only_events_are_not_queued(): void {
		$planner  = new EventTopDeckRegistrationPlanner();
		$event    = array_merge(
			$this->event(),
			array( 'registration_mode' => EventRegistrationMode::LOCAL_ONLY )
		);
		$decision = EventRegistrationDecision::accepted(
			EventRegistrationStatus::RESERVED,
			EventPaymentStatus::NOT_REQUIRED,
			'Local reservation accepted.'
		);

		$this->assert_false( $planner->should_queue( $event, $decision ) );
	}

	public function test_missing_tid_or_disabled_topdeck_is_not_queued(): void {
		$planner  = new EventTopDeckRegistrationPlanner();
		$decision = EventRegistrationDecision::accepted(
			EventRegistrationStatus::RESERVED,
			EventPaymentStatus::NOT_REQUIRED,
			'Local reservation accepted.'
		);

		$this->assert_false(
			$planner->should_queue(
				array_merge( $this->event(), array( 'topdeck_tid' => '' ) ),
				$decision
			)
		);
		$this->assert_false(
			$planner->should_queue(
				array_merge( $this->event(), array( 'topdeck_enabled' => 0 ) ),
				$decision
			)
		);
	}

	public function test_waitlist_and_pay_at_store_registrations_are_not_queued(): void {
		$planner = new EventTopDeckRegistrationPlanner();

		$this->assert_false(
			$planner->should_queue(
				$this->event(),
				EventRegistrationDecision::accepted(
					EventRegistrationStatus::WAITLIST,
					EventPaymentStatus::NOT_REQUIRED,
					'Added to waitlist.',
					true
				)
			)
		);
		$this->assert_false(
			$planner->should_queue(
				$this->event(),
				EventRegistrationDecision::accepted(
					EventRegistrationStatus::RESERVED,
					EventPaymentStatus::PAY_AT_STORE,
					'Local reservation accepted.'
				)
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function event(): array {
		return array(
			'registration_mode' => EventRegistrationMode::WEBSITE_PUSH_TOPDECK,
			'topdeck_enabled'   => 1,
			'topdeck_tid'       => 'td-dev-1001',
		);
	}
}
