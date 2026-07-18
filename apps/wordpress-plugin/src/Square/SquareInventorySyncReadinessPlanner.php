<?php
/**
 * Square inventory sync readiness diagnostics.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Square;

final class SquareInventorySyncReadinessPlanner {
	public function __construct(
		private ?SquareInventoryProjectionPlanner $projection_planner = null,
		private ?SquareInventorySyncRequestPlanner $request_planner = null
	) {
		$this->projection_planner = $this->projection_planner ?? new SquareInventoryProjectionPlanner();
		$this->request_planner    = $this->request_planner ?? new SquareInventorySyncRequestPlanner();
	}

	/**
	 * @param array<string, mixed>      $context Square request planning context.
	 * @param array<string, mixed>|null $inventory_row Optional probe inventory row.
	 * @return array<string, mixed>
	 */
	public function plan( array $context = array(), ?array $inventory_row = null ): array {
		$probe_inventory_row_used = null === $inventory_row;
		$context                  = array_merge(
			array(
				'environment'        => 'sandbox',
				'square_location_id' => 'L-STAGING-PROBE',
				'occurred_at'        => '2026-06-07T00:00:00Z',
			),
			$context
		);
		$inventory_row            = $inventory_row ?? $this->probe_inventory_row();
		$projection_plan          = $this->projection_planner->plan_row( $inventory_row, $context );
		$sync_request_plan        = $this->request_planner->plan( $projection_plan, $context );
		$execution_result         = ( new SquareInventoryProjectionExecutor(
			false,
			null,
			null,
			$this->request_planner,
			$context
		) )->execute( $projection_plan );
		$execution_audit          = $execution_result->audit_payload();
		$planning_ready           = SquareInventoryProjectionPlan::READY === $projection_plan->status()
			&& $sync_request_plan->is_ready();
		$configuration_issues     = array_values(
			array_unique(
				array_merge(
					$projection_plan->errors(),
					$sync_request_plan->errors(),
					$execution_result->errors()
				)
			)
		);

		return array_merge(
			array(
				'status'                               => $planning_ready ? 'ready' : 'blocked',
				'action'                               => 'square_inventory_sync_readiness',
				'inventory_sync_planning_ready'        => $planning_ready,
				'projection_planner_ready'             => method_exists( $this->projection_planner, 'plan_row' ),
				'sync_request_planner_ready'           => method_exists( $this->request_planner, 'plan' ),
				'projection_executor_ready'            => method_exists( SquareInventoryProjectionExecutor::class, 'execute' ),
				'probe_inventory_row_used'             => $probe_inventory_row_used,
				'probe_public_id'                      => $this->string_value( $inventory_row['public_id'] ?? '' ),
				'environment'                          => (string) $sync_request_plan->environment(),
				'projection_status'                    => $projection_plan->status(),
				'projection_code'                      => $projection_plan->code(),
				'projection_operation_count'           => $projection_plan->operation_count(),
				'catalog_object_count'                 => count( $projection_plan->catalog_objects() ),
				'inventory_change_count'               => count( $projection_plan->inventory_changes() ),
				'requires_catalog_id_resolution'       => $projection_plan->requires_catalog_id_resolution(),
				'sync_request_status'                  => $sync_request_plan->status(),
				'sync_request_code'                    => $sync_request_plan->code(),
				'sync_request_ready'                   => $sync_request_plan->is_ready(),
				'sync_request_idempotency_keys'        => $sync_request_plan->idempotency_keys(),
				'sync_request_external_ids'            => $sync_request_plan->external_ids(),
				'sync_request_plan'                    => $sync_request_plan->request_plan(),
				'execution_status'                     => $execution_result->status(),
				'execution_enabled'                    => false,
				'catalog_writer_configured'            => false,
				'inventory_writer_configured'          => false,
				'execution_block_reasons'              => $execution_result->block_reasons(),
				'network_request_deferred'             => true,
				'provider_inventory_write_deferred'    => true,
				'square_catalog_write_deferred'        => true,
				'square_inventory_write_deferred'      => true,
				'production_network_request_deferred'  => true,
				'production_provider_write_deferred'   => true,
				'payment_capture_deferred'             => true,
				'woocommerce_gateway_capture_deferred' => true,
				'configuration_issues'                 => $configuration_issues,
				'block_reasons'                        => $this->block_reasons(
					$planning_ready,
					$sync_request_plan,
					$execution_result
				),
				'execution_audit'                      => $execution_audit,
			),
			SquarePaymentDelegationPolicy::audit_payload()
		);
	}

	/**
	 * @param array<string, mixed>      $context Square request planning context.
	 * @param array<string, mixed>|null $inventory_row Optional probe inventory row.
	 * @return array{value:string,status:string}
	 */
	public function admin_summary( array $context = array(), ?array $inventory_row = null ): array {
		$plan = $this->plan( $context, $inventory_row );

		if ( 'ready' === $plan['status'] ) {
			return array(
				'value'  => sprintf(
					'sandbox probe ready; %d Square operation plans; payments delegated',
					(int) ( $plan['projection_operation_count'] ?? 0 )
				),
				'status' => 'ok',
			);
		}

		$issues = $this->list_values( $plan['configuration_issues'] ?? $plan['block_reasons'] ?? array() );

		return array(
			'value'  => array() === $issues
				? 'inventory sync blocked; payments delegated'
				: 'inventory sync blocked: ' . implode( ', ', array_slice( $issues, 0, 3 ) ),
			'status' => 'blocked',
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function probe_inventory_row(): array {
		return array(
			'inventory_id'           => 0,
			'public_id'              => 'square-readiness-probe-card',
			'game'                   => 'pokemon',
			'card_name'              => 'Square Readiness Probe',
			'set_name'               => 'Staging',
			'set_code'               => 'STG',
			'card_number'            => '000',
			'rarity'                 => 'Probe',
			'finish'                 => 'Normal',
			'condition_code'         => 'NM',
			'raw_or_graded'          => 'raw',
			'barcode'                => 'SQUARE-PROBE-000',
			'sku'                    => 'SQUARE-PROBE-000',
			'sale_price_minor_units' => 100,
			'sale_currency'          => 'USD',
			'status'                 => 'available',
			'pos_visibility'         => 'visible',
			'row_version'            => 1,
		);
	}

	private function block_reasons(
		bool $planning_ready,
		SquareInventorySyncRequestPlan $sync_request_plan,
		SquareInventoryProjectionExecutionResult $execution_result
	): array {
		$reasons = $execution_result->block_reasons();

		if ( ! $planning_ready ) {
			$reasons[] = 'square_inventory_sync_planning_not_ready';
		}

		return array_values(
			array_unique(
				array_merge(
					$reasons,
					$sync_request_plan->errors(),
					$execution_result->errors()
				)
			)
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
