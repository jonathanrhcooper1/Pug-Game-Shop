<?php
/**
 * Action Scheduler integration.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Scheduler;

use TCGStorePlatform\Logging\Logger;

final class DailyScheduler {
	public const ACTION_HOOK            = 'tcg_store_platform_daily';
	public const ACTION_GROUP           = 'tcg-store-platform';
	public const SCHEDULE_NEEDED_OPTION = 'tcg_store_platform_schedule_needed';

	private Logger $logger;

	public function __construct( Logger $logger ) {
		$this->logger = $logger;
	}

	public function register(): void {
		add_action( 'action_scheduler_init', array( $this, 'ensure_scheduled' ) );
		add_action( 'action_scheduler_ensure_recurring_actions', array( $this, 'ensure_scheduled' ) );
		add_action( self::ACTION_HOOK, array( $this, 'run' ), 1 );
	}

	public function ensure_scheduled(): void {
		if ( ! $this->is_available() || $this->has_scheduled_action() ) {
			return;
		}

		$this->schedule_next();
		delete_option( self::SCHEDULE_NEEDED_OPTION );
	}

	public function run(): void {
		$this->logger->info(
			'scheduler.daily_started',
			array(
				'scheduled_timezone' => 'America/New_York',
				'scheduled_time'     => '09:00',
			)
		);

		try {
			do_action( 'tcg_store_platform_daily_dispatch' );
		} finally {
			$this->schedule_next();
		}
	}

	/**
	 * @return array<string, mixed>
	 */
	public function status(): array {
		$next_timestamp = $this->next_scheduled_timestamp();

		return array(
			'available'        => $this->is_available(),
			'next_run_utc'     => $next_timestamp ? gmdate( 'c', $next_timestamp ) : null,
			'timezone'         => 'America/New_York',
			'local_time'       => '09:00',
			'schedule_pending' => (bool) get_option( self::SCHEDULE_NEEDED_OPTION, false ),
		);
	}

	public static function unschedule(): void {
		if ( function_exists( 'as_unschedule_all_actions' ) ) {
			as_unschedule_all_actions( self::ACTION_HOOK, array(), self::ACTION_GROUP );
		}

		update_option( self::SCHEDULE_NEEDED_OPTION, 1, false );
	}

	private function schedule_next(): void {
		if ( ! $this->is_available() ) {
			update_option( self::SCHEDULE_NEEDED_OPTION, 1, false );
			return;
		}

		$next      = DailyScheduleCalculator::next_run();
		$action_id = as_schedule_single_action(
			$next->getTimestamp(),
			self::ACTION_HOOK,
			array(),
			self::ACTION_GROUP,
			true
		);

		if ( 0 === $action_id ) {
			update_option( self::SCHEDULE_NEEDED_OPTION, 1, false );
			$this->logger->error( 'scheduler.daily_schedule_failed' );
			return;
		}

		delete_option( self::SCHEDULE_NEEDED_OPTION );
		$this->logger->info(
			'scheduler.daily_scheduled',
			array( 'next_run_utc' => $next->format( DATE_ATOM ) )
		);
	}

	private function is_available(): bool {
		return function_exists( 'as_schedule_single_action' )
			&& (
				did_action( 'action_scheduler_init' )
				|| (
					class_exists( '\Action_Scheduler' )
					&& \Action_Scheduler::is_initialized()
				)
			);
	}

	private function has_scheduled_action(): bool {
		if ( function_exists( 'as_has_scheduled_action' ) ) {
			return (bool) as_has_scheduled_action( self::ACTION_HOOK, array(), self::ACTION_GROUP );
		}

		return false !== $this->next_scheduled_timestamp();
	}

	private function next_scheduled_timestamp(): ?int {
		if ( ! function_exists( 'as_next_scheduled_action' ) ) {
			return null;
		}

		$timestamp = as_next_scheduled_action( self::ACTION_HOOK, array(), self::ACTION_GROUP );

		return false === $timestamp ? null : (int) $timestamp;
	}
}
