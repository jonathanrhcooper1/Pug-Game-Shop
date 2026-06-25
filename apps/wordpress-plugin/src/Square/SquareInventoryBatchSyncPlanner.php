<?php
/**
 * Batch Square inventory sync planning.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Square;

final class SquareInventoryBatchSyncPlanner {
	public function __construct(
		private ?SquareInventoryProjectionPlanner $projection_planner = null,
		private ?SquareInventorySyncRequestPlanner $request_planner = null
	) {
		$this->projection_planner = $this->projection_planner ?? new SquareInventoryProjectionPlanner();
		$this->request_planner    = $this->request_planner ?? new SquareInventorySyncRequestPlanner();
	}

	/**
	 * @param list<mixed>           $inventory_rows Inventory rows to project to Square.
	 * @param array<string, mixed>  $context Square request planning context.
	 * @return array<string, mixed>
	 */
	public function plan( array $inventory_rows, array $context = array() ): array {
		$context = array_merge(
			array(
				'environment'        => 'sandbox',
				'square_location_id' => 'L-STAGING-BATCH',
				'occurred_at'        => '2026-06-07T00:00:00Z',
			),
			$context
		);

		$row_results        = array();
		$idempotency_keys   = array();
		$catalog_object_ids = array();
		$skus               = array();
		$request_plans      = array();
		$issues             = array();
		$ready_count        = 0;
		$skipped_count      = 0;
		$blocked_count      = 0;
		$catalog_requests   = 0;
		$inventory_requests = 0;
		$catalog_objects    = 0;
		$inventory_changes  = 0;

		foreach ( $inventory_rows as $index => $inventory_row ) {
			if ( ! is_array( $inventory_row ) ) {
				++$blocked_count;
				$issues[]      = 'square_inventory_batch_row_invalid';
				$row_results[] = array(
					'row_index'            => (int) $index,
					'public_id'            => '',
					'status'               => 'blocked',
					'code'                 => 'square_inventory_batch_row_invalid',
					'projection_status'    => 'not_planned',
					'sync_request_status'  => 'not_planned',
					'operation_count'      => 0,
					'idempotency_keys'     => array(),
					'external_ids'         => array(
						'catalog_object_ids' => array(),
						'skus'               => array(),
					),
					'configuration_issues' => array( 'square_inventory_batch_row_invalid' ),
				);
				continue;
			}

			$projection_plan   = $this->projection_planner->plan_row( $inventory_row, $context );
			$sync_request_plan = $this->request_planner->plan( $projection_plan, $context );
			$row_status        = $this->row_status( $sync_request_plan );
			$external_ids      = $sync_request_plan->external_ids();
			$request_plan      = $sync_request_plan->request_plan();

			if ( 'ready' === $row_status ) {
				++$ready_count;
			} elseif ( 'skipped' === $row_status ) {
				++$skipped_count;
			} else {
				++$blocked_count;
			}

			if ( is_array( $request_plan['catalog_batch_upsert'] ?? null ) ) {
				++$catalog_requests;
			}

			if ( is_array( $request_plan['inventory_batch_change'] ?? null ) ) {
				++$inventory_requests;
			}

			$catalog_objects   += count( $projection_plan->catalog_objects() );
			$inventory_changes += count( $projection_plan->inventory_changes() );
			$idempotency_keys   = array_merge( $idempotency_keys, $sync_request_plan->idempotency_keys() );
			$catalog_object_ids = array_merge( $catalog_object_ids, $external_ids['catalog_object_ids'] );
			$skus               = array_merge( $skus, $external_ids['skus'] );
			$issues             = array_merge( $issues, $projection_plan->errors(), $sync_request_plan->errors() );
			$request_plans[]    = $request_plan;
			$row_results[]      = array(
				'row_index'            => (int) $index,
				'public_id'            => $this->string_value( $inventory_row['public_id'] ?? '' ),
				'status'               => $row_status,
				'code'                 => $sync_request_plan->code(),
				'projection_status'    => $projection_plan->status(),
				'projection_code'      => $projection_plan->code(),
				'sync_request_status'  => $sync_request_plan->status(),
				'sync_request_code'    => $sync_request_plan->code(),
				'operation_count'      => $projection_plan->operation_count(),
				'idempotency_keys'     => $sync_request_plan->idempotency_keys(),
				'external_ids'         => $external_ids,
				'configuration_issues' => array_values(
					array_unique(
						array_merge(
							$projection_plan->errors(),
							$sync_request_plan->errors()
						)
					)
				),
			);
		}

		return array_merge(
			array(
				'status'                              => $this->batch_status( $ready_count, $skipped_count, $blocked_count ),
				'action'                              => 'square_inventory_batch_sync_plan',
				'environment'                         => $this->string_value( $context['environment'] ?? 'sandbox' ),
				'row_count'                           => count( $inventory_rows ),
				'ready_count'                         => $ready_count,
				'skipped_count'                       => $skipped_count,
				'blocked_count'                       => $blocked_count,
				'catalog_request_count'               => $catalog_requests,
				'inventory_request_count'             => $inventory_requests,
				'catalog_object_count'                => $catalog_objects,
				'inventory_change_count'              => $inventory_changes,
				'operation_count'                     => $catalog_objects + $inventory_changes,
				'idempotency_keys'                    => array_values( array_unique( $idempotency_keys ) ),
				'external_ids'                        => array(
					'catalog_object_ids' => array_values( array_unique( $catalog_object_ids ) ),
					'skus'               => array_values( array_unique( $skus ) ),
				),
				'request_plans'                       => $request_plans,
				'row_results'                         => $row_results,
				'configuration_issues'                => array_values( array_unique( $issues ) ),
				'network_request_deferred'            => true,
				'provider_inventory_write_deferred'   => true,
				'production_network_request_deferred' => true,
				'production_provider_write_deferred'  => true,
				'payment_capture_deferred'            => true,
				'source_of_truth'                     => 'tcg_store_platform',
			),
			SquarePaymentDelegationPolicy::audit_payload()
		);
	}

	private function row_status( SquareInventorySyncRequestPlan $sync_request_plan ): string {
		if ( $sync_request_plan->is_ready() ) {
			return 'ready';
		}

		if ( $sync_request_plan->is_skipped() ) {
			return 'skipped';
		}

		return 'blocked';
	}

	private function batch_status( int $ready_count, int $skipped_count, int $blocked_count ): string {
		if ( $blocked_count > 0 ) {
			return 'blocked';
		}

		if ( $ready_count > 0 ) {
			return 'ready';
		}

		return $skipped_count > 0 ? 'skipped' : 'empty';
	}

	private function string_value( mixed $value ): string {
		return substr( trim( (string) ( is_array( $value ) || is_object( $value ) ? '' : $value ) ), 0, 191 );
	}
}
