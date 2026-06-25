<?php
/**
 * Square inventory batch sync readiness diagnostics.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Square;

final class SquareInventoryBatchSyncReadinessPlanner {
	public function __construct(
		private ?SquareInventoryBatchSyncPlanner $batch_planner = null
	) {
		$this->batch_planner = $this->batch_planner ?? new SquareInventoryBatchSyncPlanner();
	}

	/**
	 * @param array<string, mixed> $context Square request planning context.
	 * @param list<array<string, mixed>>|null $inventory_rows Optional probe rows.
	 * @return array<string, mixed>
	 */
	public function plan( array $context = array(), ?array $inventory_rows = null ): array {
		$probe_inventory_rows_used = null === $inventory_rows;
		$context                   = array_merge(
			array(
				'environment'        => 'sandbox',
				'square_location_id' => 'L-STAGING-BATCH-READINESS',
				'occurred_at'        => '2026-06-07T00:00:00Z',
			),
			$context
		);
		$inventory_rows            = $inventory_rows ?? $this->probe_inventory_rows();
		$batch_plan                = $this->batch_planner->plan( $inventory_rows, $context );
		$planning_ready            = 'ready' === ( $batch_plan['status'] ?? '' )
			&& (int) ( $batch_plan['ready_count'] ?? 0 ) > 0
			&& 0 === (int) ( $batch_plan['blocked_count'] ?? 0 );

		return array_merge(
			array(
				'status'                              => $planning_ready ? 'ready' : 'blocked',
				'action'                              => 'square_inventory_batch_sync_readiness',
				'batch_sync_planning_ready'           => $planning_ready,
				'batch_planner_ready'                 => method_exists( $this->batch_planner, 'plan' ),
				'probe_inventory_rows_used'           => $probe_inventory_rows_used,
				'probe_row_count'                     => count( $inventory_rows ),
				'environment'                         => $this->string_value( $batch_plan['environment'] ?? $context['environment'] ?? 'sandbox' ),
				'batch_status'                        => $this->string_value( $batch_plan['status'] ?? 'blocked' ),
				'row_count'                           => (int) ( $batch_plan['row_count'] ?? 0 ),
				'ready_count'                         => (int) ( $batch_plan['ready_count'] ?? 0 ),
				'skipped_count'                       => (int) ( $batch_plan['skipped_count'] ?? 0 ),
				'blocked_count'                       => (int) ( $batch_plan['blocked_count'] ?? 0 ),
				'catalog_request_count'               => (int) ( $batch_plan['catalog_request_count'] ?? 0 ),
				'inventory_request_count'             => (int) ( $batch_plan['inventory_request_count'] ?? 0 ),
				'catalog_object_count'                => (int) ( $batch_plan['catalog_object_count'] ?? 0 ),
				'inventory_change_count'              => (int) ( $batch_plan['inventory_change_count'] ?? 0 ),
				'operation_count'                     => (int) ( $batch_plan['operation_count'] ?? 0 ),
				'idempotency_key_count'               => count( $this->list_values( $batch_plan['idempotency_keys'] ?? array() ) ),
				'external_ids'                        => $this->external_ids( $batch_plan['external_ids'] ?? array() ),
				'row_results'                         => is_array( $batch_plan['row_results'] ?? null )
					? $batch_plan['row_results']
					: array(),
				'configuration_issues'                => $this->list_values( $batch_plan['configuration_issues'] ?? array() ),
				'block_reasons'                       => $this->block_reasons( $planning_ready, $batch_plan ),
				'network_request_deferred'            => true,
				'provider_inventory_write_deferred'   => true,
				'production_network_request_deferred' => true,
				'production_provider_write_deferred'  => true,
				'payment_capture_deferred'            => true,
				'source_of_truth'                     => 'tcg_store_platform',
				'batch_plan'                          => $batch_plan,
			),
			SquarePaymentDelegationPolicy::audit_payload()
		);
	}

	/**
	 * @param array<string, mixed> $context Square request planning context.
	 * @param list<array<string, mixed>>|null $inventory_rows Optional probe rows.
	 * @return array{value:string,status:string}
	 */
	public function admin_summary( array $context = array(), ?array $inventory_rows = null ): array {
		$plan = $this->plan( $context, $inventory_rows );

		if ( 'ready' === $plan['status'] ) {
			return array(
				'value'  => sprintf(
					'sandbox batch ready; %d rows; %d Square operation plans; payments delegated',
					(int) ( $plan['ready_count'] ?? 0 ),
					(int) ( $plan['operation_count'] ?? 0 )
				),
				'status' => 'ok',
			);
		}

		$issues = $this->list_values( $plan['configuration_issues'] ?? $plan['block_reasons'] ?? array() );

		return array(
			'value'  => array() === $issues
				? 'batch inventory sync blocked; payments delegated'
				: 'batch inventory sync blocked: ' . implode( ', ', array_slice( $issues, 0, 3 ) ),
			'status' => 'blocked',
		);
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function probe_inventory_rows(): array {
		return array(
			$this->probe_inventory_row( 0, 'square-batch-probe-charizard', 'Square Batch Probe Charizard', 'SQUARE-BATCH-PROBE-004' ),
			$this->probe_inventory_row( 1, 'square-batch-probe-pikachu', 'Square Batch Probe Pikachu', 'SQUARE-BATCH-PROBE-025' ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function probe_inventory_row( int $inventory_id, string $public_id, string $card_name, string $sku ): array {
		return array(
			'inventory_id'           => $inventory_id,
			'public_id'              => $public_id,
			'game'                   => 'pokemon',
			'card_name'              => $card_name,
			'set_name'               => 'Staging',
			'set_code'               => 'STG',
			'card_number'            => (string) $inventory_id,
			'rarity'                 => 'Probe',
			'finish'                 => 'Normal',
			'condition_code'         => 'NM',
			'raw_or_graded'          => 'raw',
			'barcode'                => $sku,
			'sku'                    => $sku,
			'sale_price_minor_units' => 100 + $inventory_id,
			'sale_currency'          => 'USD',
			'status'                 => 'available',
			'pos_visibility'         => 'visible',
			'row_version'            => 1,
		);
	}

	/**
	 * @param array<string, mixed> $batch_plan Batch plan.
	 * @return list<string>
	 */
	private function block_reasons( bool $planning_ready, array $batch_plan ): array {
		$reasons = $this->list_values( $batch_plan['configuration_issues'] ?? array() );

		if ( ! $planning_ready ) {
			$reasons[] = 'square_inventory_batch_sync_planning_not_ready';
		}

		return array_values( array_unique( $reasons ) );
	}

	/**
	 * @param mixed $external_ids External IDs payload.
	 * @return array{catalog_object_ids:list<string>,skus:list<string>}
	 */
	private function external_ids( mixed $external_ids ): array {
		if ( ! is_array( $external_ids ) ) {
			return array(
				'catalog_object_ids' => array(),
				'skus'               => array(),
			);
		}

		return array(
			'catalog_object_ids' => $this->list_values( $external_ids['catalog_object_ids'] ?? array() ),
			'skus'               => $this->list_values( $external_ids['skus'] ?? array() ),
		);
	}

	private function string_value( mixed $value ): string {
		return substr( trim( (string) ( is_array( $value ) || is_object( $value ) ? '' : $value ) ), 0, 191 );
	}

	/**
	 * @return list<string>
	 */
	private function list_values( mixed $values ): array {
		if ( ! is_array( $values ) ) {
			return array();
		}

		return array_values(
			array_filter(
				array_map(
					static fn ( mixed $value ): string => is_array( $value ) || is_object( $value )
						? ''
						: trim( (string) $value ),
					$values
				),
				static fn ( string $value ): bool => '' !== $value
			)
		);
	}
}
