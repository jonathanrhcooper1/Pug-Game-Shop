<?php
/**
 * Offline push canonical mutation repository tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Offline\OfflinePushBatchResolver;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationPlan;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationPlanner;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationQueryBuilder;
use TCGStorePlatform\Offline\OfflinePushCanonicalMutationRepository;
use TCGStorePlatform\Offline\OfflinePushPayload;
use TCGStorePlatform\Offline\OfflinePushPayloadParser;
use TCGStorePlatform\Tests\TestCase;

final class OfflinePushCanonicalMutationRepositoryTest extends TestCase {
	public function test_repository_stages_canonical_mutation_execution_as_deferred(): void {
		$query_plan = ( new OfflinePushCanonicalMutationQueryBuilder() )->build(
			$this->canonical_plan(),
			'wp_'
		);
		$result     = ( new OfflinePushCanonicalMutationRepository() )->stage( $query_plan );
		$audit      = $result->audit_payload();

		$this->assert_true( $result->is_deferred() );
		$this->assert_false( $result->is_rejected() );
		$this->assert_same( 'deferred', $result->status() );
		$this->assert_same( 0, $result->rows_affected() );
		$this->assert_same( 3, $result->mutation_query_count() );
		$this->assert_same( 10, $result->prepare_arg_count() );
		$this->assert_same(
			array( 'op-inventory-0001', 'op-event-0001', 'op-credit-redemption-01' ),
			$result->mutation_operation_ids()
		);
		$this->assert_same( 'inventory_status_guarded_update', $result->mutation_results()[0]['query_kind'] );
		$this->assert_same( 6, $result->mutation_results()[0]['prepare_arg_count'] );
		$this->assert_same( 'deferred', $result->mutation_results()[0]['execution_status'] );
		$this->assert_same( 0, $result->mutation_results()[0]['rows_affected'] );
		$this->assert_true( $result->mutation_results()[0]['inventory_write_execution_deferred'] );
		$this->assert_true( $result->mutation_results()[0]['canonical_mutation_repository_deferred'] );
		$this->assert_same( 'offline_push_canonical_mutation_repository', $audit['action'] );
		$this->assert_same( 'offline_push_canonical_mutation_sql_planned', $audit['query']['action'] );
		$this->assert_same( 3, $audit['mutation_query_count'] );
		$this->assert_same( 10, $audit['prepare_arg_count'] );
		$this->assert_same( 0, $audit['rows_affected'] );
		$this->assert_true( $audit['explicit_execution_required'] );
		$this->assert_true( $audit['canonical_mutation_repository_deferred'] );
		$this->assert_true( $audit['route_connected_writes_deferred'] );
		$this->assert_true( $audit['topdeck_worker_deferred'] );
		$this->assert_same( array(), $audit['errors'] );
	}

	public function test_repository_accepts_empty_valid_plans_as_deferred_without_results(): void {
		$query_plan = ( new OfflinePushCanonicalMutationQueryBuilder() )->build(
			$this->skipped_plan(),
			'wp_'
		);
		$result     = ( new OfflinePushCanonicalMutationRepository() )->stage( $query_plan );

		$this->assert_true( $result->is_deferred() );
		$this->assert_same( 0, $result->mutation_query_count() );
		$this->assert_same( 0, $result->prepare_arg_count() );
		$this->assert_same( array(), $result->mutation_operation_ids() );
		$this->assert_same( array(), $result->mutation_results() );
		$this->assert_same( array(), $result->errors() );
	}

	public function test_repository_rejects_invalid_query_plan_before_execution(): void {
		$query_plan = ( new OfflinePushCanonicalMutationQueryBuilder() )->build(
			$this->canonical_plan(),
			'wp-bad_'
		);
		$result     = ( new OfflinePushCanonicalMutationRepository() )->stage( $query_plan );
		$audit      = $result->audit_payload();

		$this->assert_true( $result->is_rejected() );
		$this->assert_false( $result->is_deferred() );
		$this->assert_same( 'rejected', $result->status() );
		$this->assert_same( 0, $result->rows_affected() );
		$this->assert_same( 0, $result->mutation_query_count() );
		$this->assert_same( 0, $result->prepare_arg_count() );
		$this->assert_same( array(), $result->mutation_results() );
		$this->assert_true( in_array( 'table_prefix_invalid', $result->errors(), true ) );
		$this->assert_true( $audit['is_rejected'] );
		$this->assert_true( $audit['canonical_mutation_repository_deferred'] );
		$this->assert_same( array( 'table_prefix_invalid' ), $audit['errors'] );
	}

	private function canonical_plan(): \TCGStorePlatform\Offline\OfflinePushCanonicalMutationPlan {
		$payload    = $this->push_payload();
		$resolution = ( new OfflinePushBatchResolver() )->resolve(
			$payload,
			array(
				'op-inventory-0001'       => array(
					'inventory' => array(
						'status'     => 'available',
						'rowVersion' => 4,
					),
				),
				'op-event-0001'           => array(
					'event' => array(
						'seatsRemaining'  => 3,
						'registrationMode' => 'website_push_topdeck',
						'topDeckEnabled'   => true,
						'rowVersion'       => 9,
					),
				),
				'op-credit-redemption-01' => array(
					'customer' => array(
						'creditBalanceMinorUnits' => 5000,
						'rowVersion'              => 6,
					),
				),
			),
			'2026-06-06T20:00:00Z',
			array(
				'op-event-0001' => array(
					'paymentStatus' => 'paid',
				),
			)
		);

		return ( new OfflinePushCanonicalMutationPlanner() )->plan( $payload, $resolution );
	}

	private function skipped_plan(): OfflinePushCanonicalMutationPlan {
		$payload    = $this->push_payload( array( $this->inventory_operation_payload() ) );
		$resolution = ( new OfflinePushBatchResolver() )->resolve(
			$payload,
			array(
				'op-inventory-0001' => array(
					'inventory' => array(
						'status'     => 'sold',
						'rowVersion' => 4,
					),
				),
			),
			'2026-06-06T20:00:00Z'
		);

		return ( new OfflinePushCanonicalMutationPlanner() )->plan( $payload, $resolution );
	}

	/**
	 * @param list<array<string, mixed>>|null $operations Operation payloads.
	 */
	private function push_payload( ?array $operations = null ): OfflinePushPayload {
		$result = ( new OfflinePushPayloadParser() )->parse(
			array(
				'batch_id'   => 'body-batch-ignored',
				'device_id'  => 'device-main-01',
				'operations' => $operations ?? array(
					$this->inventory_operation_payload(),
					$this->event_operation_payload(),
					$this->credit_operation_payload(),
				),
			),
			'batch-main-01'
		);

		$this->assert_true( $result->is_valid() );

		$payload = $result->payload();
		$this->assert_true( null !== $payload );

		return $payload;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function inventory_operation_payload(): array {
		return array(
			'client_operation_id' => 'op-inventory-0001',
			'device_id'           => 'device-main-01',
			'location_id'         => 3,
			'actor_id'            => 22,
			'operation_type'      => 'inventory_reservation',
			'entity_type'         => 'inventory',
			'entity_id'           => 'inv-1001',
			'base_row_version'    => 4,
			'occurred_at_local'   => '2026-06-06T10:15:00-04:00',
			'queued_at_utc'       => '2026-06-06T14:15:05Z',
			'payload'             => array( 'localStatus' => 'offline_pending_sync' ),
			'schema_version'      => 1,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function event_operation_payload(): array {
		return array(
			'client_operation_id' => 'op-event-0001',
			'device_id'           => 'device-main-01',
			'location_id'         => 3,
			'actor_id'            => 22,
			'operation_type'      => 'event_reservation',
			'entity_type'         => 'event',
			'entity_id'           => 'event-100',
			'base_row_version'    => 9,
			'occurred_at_local'   => '2026-06-06T11:15:00-04:00',
			'queued_at_utc'       => '2026-06-06T15:15:05Z',
			'payload'             => array(),
			'schema_version'      => 1,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function credit_operation_payload(): array {
		return array(
			'client_operation_id' => 'op-credit-redemption-01',
			'device_id'           => 'device-main-01',
			'location_id'         => 3,
			'actor_id'            => 22,
			'operation_type'      => 'credit_redemption',
			'entity_type'         => 'customer_credit',
			'entity_id'           => 'customer-100',
			'base_row_version'    => 6,
			'occurred_at_local'   => '2026-06-06T12:15:00-04:00',
			'queued_at_utc'       => '2026-06-06T16:15:05Z',
			'payload'             => array(
				'amountMinorUnits'        => 4500,
				'cachedBalanceMinorUnits' => 5000,
			),
			'schema_version'      => 1,
		);
	}
}
