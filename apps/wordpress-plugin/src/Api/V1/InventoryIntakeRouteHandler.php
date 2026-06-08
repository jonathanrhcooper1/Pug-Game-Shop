<?php
/**
 * Explicit staged inventory intake write handler.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Inventory\InventoryIntakeParser;
use TCGStorePlatform\Inventory\InventoryIntakePersistencePlanner;
use TCGStorePlatform\Inventory\InventoryIntakePersistencePlan;
use TCGStorePlatform\Inventory\InventoryIntakeRepositoryResult;
use TCGStorePlatform\Inventory\InventoryIntakeRepository;
use TCGStorePlatform\Square\SquareInventoryProjectionPlanner;
use TCGStorePlatform\WooCommerce\InventoryProductProjectionPlanner;
use TCGStorePlatform\WooCommerce\InventoryProductWriteRequestPlanner;

final class InventoryIntakeRouteHandler {
	public function __construct(
		private InventoryIntakeRepository $repository,
		private ?InventoryIntakeParser $parser = null,
		private ?InventoryIntakePersistencePlanner $persistence_planner = null,
		private string $table_prefix = 'wp_',
		private ?InventoryProductProjectionPlanner $woocommerce_projection_planner = null,
		private ?SquareInventoryProjectionPlanner $square_projection_planner = null,
		private ?InventoryProductWriteRequestPlanner $woocommerce_write_request_planner = null,
		private array $woocommerce_write_request_context = array()
	) {
	}

	/**
	 * @return array<string, mixed>
	 */
	public function create_inventory_item( OfflineRestRequestData $data ): array {
		$validation = $this->parser()->parse(
			$data->body_params(),
			$data->idempotency_key(),
			$this->actor_user_id( $data )
		);

		if ( ! $validation->is_valid() || null === $validation->request() ) {
			return $this->rejected(
				'inventory_intake_request_invalid',
				$validation->errors()
			);
		}

		$plan = $this->persistence_planner()->plan(
			$validation->request(),
			$this->table_prefix
		);

		if ( ! $plan->is_valid() ) {
			return $this->rejected(
				'inventory_intake_persistence_plan_invalid',
				$plan->errors(),
				array(
					'persistence' => $plan->audit_payload(),
				)
			);
		}

		$result = $this->repository->create( $plan );

		if ( ! $result->is_inserted() ) {
			return $this->rejected(
				'inventory_intake_repository_rejected',
				$result->errors(),
				array(
					'persistence' => $plan->audit_payload(),
					'repository'  => $result->audit_payload(),
				),
				500
			);
		}

		return array(
			'status'      => 'created',
			'status_code' => 201,
			'code'        => 'inventory_item_created',
			'callback'    => 'create_inventory_item',
			'data'        => $result->response_payload(),
			'meta'        => array_merge(
				$this->ready_meta(),
				array(
					'persistence' => $plan->audit_payload(),
					'repository'  => $result->audit_payload(),
					'projections' => $this->projection_contracts( $plan, $result ),
				)
			),
		);
	}

	private function parser(): InventoryIntakeParser {
		return $this->parser ?? new InventoryIntakeParser();
	}

	private function persistence_planner(): InventoryIntakePersistencePlanner {
		return $this->persistence_planner ?? new InventoryIntakePersistencePlanner();
	}

	private function woocommerce_projection_planner(): InventoryProductProjectionPlanner {
		return $this->woocommerce_projection_planner ?? new InventoryProductProjectionPlanner();
	}

	private function square_projection_planner(): SquareInventoryProjectionPlanner {
		return $this->square_projection_planner ?? new SquareInventoryProjectionPlanner();
	}

	private function woocommerce_write_request_planner(): InventoryProductWriteRequestPlanner {
		return $this->woocommerce_write_request_planner ?? new InventoryProductWriteRequestPlanner();
	}

	/**
	 * @return array<string, mixed>
	 */
	private function projection_contracts(
		InventoryIntakePersistencePlan $plan,
		InventoryIntakeRepositoryResult $result
	): array {
		$row = array_merge(
			$plan->insert_row(),
			array(
				'inventory_id' => $result->insert_id(),
				'quantity'     => 1,
			)
		);

		$woocommerce = $this->woocommerce_projection_planner()->plan_row(
			$row,
			array(
				'store_currency' => (string) ( $row['sale_currency'] ?? 'USD' ),
			)
		);
		$square      = $this->square_projection_planner()->plan_row( $row );
		$wc_request  = $this->woocommerce_write_request_planner()->plan(
			$woocommerce,
			$this->woocommerce_write_request_context
		);

		return array(
			'action'                                     => 'inventory_external_projection_plans',
			'status'                                     => 'planned',
			'woocommerce_product_projection'             => $woocommerce->projection_contract(),
			'woocommerce_product_write_request'          => $wc_request->audit_payload(),
			'square_inventory_projection'                => $square->projection_contract(),
			'woocommerce_projection_deferred'            => true,
			'woocommerce_product_write_request_deferred' => true,
			'square_inventory_projection_deferred'       => true,
			'network_request_deferred'                   => true,
			'operation_count'                            => $woocommerce->operation_count() + $square->operation_count(),
		);
	}

	private function actor_user_id( OfflineRestRequestData $data ): ?int {
		$body  = $data->body_params();
		$value = $body['actor_user_id'] ?? ( $body['staff_user_id'] ?? null );

		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		return null;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function ready_meta(): array {
		return array(
			'route_connected_writes_enabled'             => true,
			'route_connected_writes_deferred'            => false,
			'inventory_repository_deferred'              => false,
			'route_registration_deferred'                => true,
			'default_route_registration_deferred'        => true,
			'route_still_gated'                          => true,
			'woocommerce_projection_deferred'            => true,
			'woocommerce_product_write_request_deferred' => true,
			'square_inventory_projection_deferred'       => true,
			'external_projection_planning_deferred'      => false,
			'label_print_deferred'                       => true,
		);
	}

	/**
	 * @param list<string>         $errors Validation/planning/repository errors.
	 * @param array<string, mixed> $extra_meta Extra diagnostic metadata.
	 * @return array<string, mixed>
	 */
	private function rejected(
		string $code,
		array $errors,
		array $extra_meta = array(),
		int $status_code = 400
	): array {
		return array(
			'status'      => 'invalid',
			'status_code' => $status_code,
			'code'        => $code,
			'callback'    => 'create_inventory_item',
			'errors'      => array_values( array_unique( $errors ) ),
			'meta'        => array_merge(
				array(
					'route_connected_writes_enabled'       => true,
					'route_connected_writes_deferred'      => true,
					'inventory_repository_deferred'        => true,
					'route_registration_deferred'          => true,
					'default_route_registration_deferred'  => true,
					'route_still_gated'                    => true,
					'woocommerce_projection_deferred'      => true,
					'woocommerce_product_write_request_deferred' => true,
					'square_inventory_projection_deferred' => true,
					'external_projection_planning_deferred' => true,
					'label_print_deferred'                 => true,
				),
				$extra_meta
			),
		);
	}
}
