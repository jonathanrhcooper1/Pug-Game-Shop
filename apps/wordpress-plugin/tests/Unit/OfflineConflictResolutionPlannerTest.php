<?php
/**
 * Offline conflict resolution planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use InvalidArgumentException;
use TCGStorePlatform\Offline\OfflineConflictResolutionRequestParser;
use TCGStorePlatform\Offline\OfflineConflictResolutionPlanner;
use TCGStorePlatform\Tests\TestCase;

final class OfflineConflictResolutionPlannerTest extends TestCase {
	public function test_planner_builds_update_response_and_redacted_audit_payload(): void {
		$plan = ( new OfflineConflictResolutionPlanner() )->plan(
			$this->resolution_request( 'manager_adjust' ),
			$this->current_conflict_row(),
			'2026-06-06T18:05:00Z'
		);

		$update   = $plan->conflict_update_row();
		$response = $plan->response_payload();
		$audit    = $plan->audit_payload();

		$this->assert_same( 'conflict-main-01', $update['conflict_id'] );
		$this->assert_same( 'resolved', $update['status'] );
		$this->assert_same( 13, $update['row_version'] );
		$this->assert_same( 12, $update['previous_row_version'] );
		$this->assert_same( 12, $update['expected_conflict_version'] );
		$this->assert_same( 'sold', $update['resolution_payload']['accepted_inventory_status'] );
		$this->assert_same( 'resolved', $response['status'] );
		$this->assert_same( 13, $response['row_version'] );
		$this->assert_same( 'offline_conflict_resolution_planned', $audit['action'] );
		$this->assert_same( 'open', $audit['previous_status'] );
		$this->assert_same( 'resolved', $audit['target_status'] );
		$this->assert_false( array_key_exists( 'resolution_payload', $audit ) );
		$this->assert_same( 64, strlen( $audit['resolution_payload_hash'] ) );
	}

	public function test_planner_maps_dismiss_and_retry_to_expected_statuses(): void {
		$planner = new OfflineConflictResolutionPlanner();

		$dismiss = $planner->plan(
			$this->resolution_request( 'dismiss', 'No customer impact after review.' ),
			$this->current_conflict_row( array( 'status' => 'assigned', 'resolution_options' => array( 'dismiss' ) ) ),
			'2026-06-06T18:05:00Z'
		);

		$retry = $planner->plan(
			$this->resolution_request( 'retry_operation', '', array(), 'resolution-retry-01' ),
			$this->current_conflict_row( array( 'status' => 'resolving', 'resolution_options' => array( 'retry_operation' ) ) ),
			'2026-06-06T18:05:00Z'
		);

		$this->assert_same( 'dismissed', $dismiss->conflict_update_row()['status'] );
		$this->assert_same( 'resolving', $retry->conflict_update_row()['status'] );
	}

	public function test_planner_rejects_stale_terminal_or_unavailable_actions(): void {
		$planner = new OfflineConflictResolutionPlanner();
		$request = $this->resolution_request( 'accept_device' );

		$this->assert_throws_invalid_argument(
			fn () => $planner->plan(
				$request,
				$this->current_conflict_row( array( 'row_version' => 11 ) ),
				'2026-06-06T18:05:00Z'
			)
		);

		$this->assert_throws_invalid_argument(
			fn () => $planner->plan(
				$request,
				$this->current_conflict_row( array( 'status' => 'resolved' ) ),
				'2026-06-06T18:05:00Z'
			)
		);

		$this->assert_throws_invalid_argument(
			fn () => $planner->plan(
				$request,
				$this->current_conflict_row( array( 'resolution_options' => array( 'accept_server' ) ) ),
				'2026-06-06T18:05:00Z'
			)
		);
	}

	public function test_planner_rejects_bad_current_rows_and_server_time(): void {
		$planner = new OfflineConflictResolutionPlanner();
		$request = $this->resolution_request( 'accept_device' );

		$this->assert_throws_invalid_argument(
			static fn () => $planner->plan( $request, array(), '2026-06-06T18:05:00Z' )
		);

		$this->assert_throws_invalid_argument(
			fn () => $planner->plan(
				$request,
				$this->current_conflict_row(),
				'2026-06-06T18:05:00-04:00'
			)
		);

		$this->assert_throws_invalid_argument(
			fn () => $planner->plan(
				$request,
				$this->current_conflict_row( array( 'conflict_id' => 'conflict-other-01' ) ),
				'2026-06-06T18:05:00Z'
			)
		);
	}

	/**
	 * @param array<string, mixed> $payload Resolution payload.
	 */
	private function resolution_request(
		string $action,
		string $note = 'Use staff verified scan outcome.',
		array $payload = array( 'accepted_inventory_status' => 'sold' ),
		string $resolution_id = 'resolution-main-01'
	): \TCGStorePlatform\Offline\OfflineConflictResolutionRequest {
		$result = ( new OfflineConflictResolutionRequestParser() )->parse(
			'conflict-main-01',
			array(
				'device_id'                 => 'device-main-01',
				'manager_id'                => 15,
				'resolution_action'         => $action,
				'resolution_note'           => $note,
				'expected_conflict_version' => 12,
				'resolved_at_utc'           => '2026-06-06T18:00:00Z',
				'resolution_payload'        => $payload,
				'schema_version'            => 1,
			),
			$resolution_id
		);

		$this->assert_true( $result->is_valid() );

		$request = $result->request();
		$this->assert_true( null !== $request );

		return $request;
	}

	/**
	 * @param array<string, mixed> $overrides Conflict row overrides.
	 * @return array<string, mixed>
	 */
	private function current_conflict_row( array $overrides = array() ): array {
		return array_merge(
			array(
				'conflict_id'        => 'conflict-main-01',
				'status'             => 'open',
				'entity_type'        => 'inventory',
				'entity_id'          => 'inv-1001',
				'conflict_type'      => 'double_sell',
				'row_version'        => 12,
				'resolution_options' => array( 'accept_server', 'accept_device', 'manager_adjust' ),
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
