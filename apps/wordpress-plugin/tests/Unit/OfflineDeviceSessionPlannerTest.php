<?php
/**
 * Offline device session planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use InvalidArgumentException;
use TCGStorePlatform\Offline\OfflineDeviceAccessDecision;
use TCGStorePlatform\Offline\OfflineDeviceSessionPlanner;
use TCGStorePlatform\Tests\TestCase;

final class OfflineDeviceSessionPlannerTest extends TestCase {
	public function test_planner_builds_last_seen_update_context_and_audit_payload(): void {
		$plan = ( new OfflineDeviceSessionPlanner() )->plan(
			$this->accepted_decision(),
			$this->device_row(),
			'2026-06-06T18:30:00Z'
		);

		$update  = $plan->device_update_row();
		$context = $plan->session_context();
		$audit   = $plan->audit_payload();

		$this->assert_same( 42, $update['offline_device_id'] );
		$this->assert_same( 'device-main-01', $update['public_id'] );
		$this->assert_same( '2026-06-06T18:30:00Z', $update['last_seen_at'] );
		$this->assert_same( '2026-06-06T18:30:00Z', $update['updated_at'] );
		$this->assert_same( 8, $update['previous_row_version'] );
		$this->assert_same( 8, $update['expected_row_version'] );
		$this->assert_same( 9, $update['row_version'] );
		$this->assert_same( 9, $context['device_row_version'] );
		$this->assert_same( 'offline_push', $context['required_scope'] );
		$this->assert_same( 'offline_device_session_planned', $audit['action'] );
		$this->assert_same( 42, $audit['offline_device_id'] );
		$this->assert_same( 'device-main-01', $audit['device_id'] );
		$this->assert_same( 'kiosk', $audit['device_mode'] );
		$this->assert_same( 2, $audit['location_id'] );
		$this->assert_same( 9, $audit['next_row_version'] );
		$this->assert_false( array_key_exists( 'device_token', $audit ) );
		$this->assert_false( array_key_exists( 'token_hash', $audit ) );
	}

	public function test_planner_accepts_string_ids_from_database_rows(): void {
		$plan = ( new OfflineDeviceSessionPlanner() )->plan(
			$this->accepted_decision(
				array(
					'offline_device_id' => '43',
				)
			),
			$this->device_row(
				array(
					'offline_device_id' => '43',
					'row_version'       => '3',
				)
			),
			'2026-06-06T18:30:00Z'
		);

		$this->assert_same( 43, $plan->device_update_row()['offline_device_id'] );
		$this->assert_same( 4, $plan->device_update_row()['row_version'] );
		$this->assert_same( 3, $plan->device_update_row()['previous_row_version'] );
	}

	public function test_planner_rejects_denied_decision_mismatched_row_and_bad_time(): void {
		$planner = new OfflineDeviceSessionPlanner();

		$this->assert_throws_invalid_argument(
			fn () => $planner->plan(
				OfflineDeviceAccessDecision::rejected( array( 'device_revoked' ) ),
				$this->device_row(),
				'2026-06-06T18:30:00Z'
			)
		);

		$this->assert_throws_invalid_argument(
			fn () => $planner->plan(
				$this->accepted_decision(),
				$this->device_row(
					array(
						'public_id' => 'device-other-01',
					)
				),
				'2026-06-06T18:30:00Z'
			)
		);

		$this->assert_throws_invalid_argument(
			fn () => $planner->plan(
				$this->accepted_decision(),
				$this->device_row(),
				'not-now'
			)
		);
	}

	public function test_planner_rejects_invalid_device_row_versions_and_ids(): void {
		$planner = new OfflineDeviceSessionPlanner();

		$this->assert_throws_invalid_argument(
			fn () => $planner->plan(
				$this->accepted_decision(),
				$this->device_row(
					array(
						'offline_device_id' => 0,
					)
				),
				'2026-06-06T18:30:00Z'
			)
		);

		$this->assert_throws_invalid_argument(
			fn () => $planner->plan(
				$this->accepted_decision(),
				$this->device_row(
					array(
						'row_version' => 0,
					)
				),
				'2026-06-06T18:30:00Z'
			)
		);
	}

	/**
	 * @param array<string, mixed> $overrides Context overrides.
	 */
	private function accepted_decision( array $overrides = array() ): OfflineDeviceAccessDecision {
		return OfflineDeviceAccessDecision::accepted(
			array_merge(
				array(
					'offline_device_id'    => 42,
					'device_id'            => 'device-main-01',
					'device_mode'          => 'kiosk',
					'location_id'          => 2,
					'scopes'               => array( 'offline_pull', 'offline_push', 'kiosk' ),
					'required_scope'       => 'offline_push',
					'auth_type'            => 'device_bearer',
					'token_verified'       => true,
					'authenticated_at_utc' => '2026-06-06T18:29:00Z',
				),
				$overrides
			)
		);
	}

	/**
	 * @param array<string, mixed> $overrides Row overrides.
	 * @return array<string, mixed>
	 */
	private function device_row( array $overrides = array() ): array {
		return array_merge(
			array(
				'offline_device_id' => 42,
				'public_id'         => 'device-main-01',
				'row_version'       => 8,
			),
			$overrides
		);
	}

	/**
	 * @param callable(): void $callback Callback expected to throw.
	 */
	private function assert_throws_invalid_argument( callable $callback ): void {
		try {
			$callback();
		} catch ( InvalidArgumentException ) {
			$this->assert_true( true );

			return;
		}

		$this->assert_true( false, 'Expected InvalidArgumentException.' );
	}
}
