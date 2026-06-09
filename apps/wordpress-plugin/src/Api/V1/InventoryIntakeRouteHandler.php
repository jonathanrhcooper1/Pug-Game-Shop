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
use TCGStorePlatform\Inventory\InventoryExternalMappingRepository;
use TCGStorePlatform\Square\SquareInventoryProjectionPlanner;
use TCGStorePlatform\WooCommerce\InventoryProductProjectionExecutor;
use TCGStorePlatform\WooCommerce\InventoryProductProjectionPlanner;
use TCGStorePlatform\WooCommerce\InventoryProductWriteRequestPlanner;
use TCGStorePlatform\WooCommerce\WooCommerceInventoryProductWriter;

final class InventoryIntakeRouteHandler {
	public function __construct(
		private InventoryIntakeRepository $repository,
		private ?InventoryIntakeParser $parser = null,
		private ?InventoryIntakePersistencePlanner $persistence_planner = null,
		private string $table_prefix = 'wp_',
		private ?InventoryProductProjectionPlanner $woocommerce_projection_planner = null,
		private ?SquareInventoryProjectionPlanner $square_projection_planner = null,
		private ?InventoryProductWriteRequestPlanner $woocommerce_write_request_planner = null,
		private array $woocommerce_write_request_context = array(),
		private ?InventoryProductProjectionExecutor $woocommerce_projection_executor = null,
		private ?InventoryExternalMappingRepository $external_mapping_repository = null
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
					'projections' => $this->projection_contracts( $plan, $result, $data ),
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

	private function woocommerce_projection_executor( array $context ): InventoryProductProjectionExecutor {
		return $this->woocommerce_projection_executor ?? new InventoryProductProjectionExecutor(
			true,
			new WooCommerceInventoryProductWriter(),
			$this->woocommerce_write_request_planner(),
			$context
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function projection_contracts(
		InventoryIntakePersistencePlan $plan,
		InventoryIntakeRepositoryResult $result,
		OfflineRestRequestData $data
	): array {
		$row = array_merge(
			$plan->insert_row(),
			array(
				'inventory_id' => $result->insert_id(),
				'quantity'     => 1,
			)
		);
		$execution_context = $this->woocommerce_projection_context( $row, $data );

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
		$sync        = $this->woocommerce_sync_contract( $data, $woocommerce, $execution_context, $result->insert_id() );

		return array(
			'action'                                     => 'inventory_external_projection_plans',
			'status'                                     => true === ( $sync['synced'] ?? false ) ? 'synced' : 'planned',
			'woocommerce_product_projection'             => $woocommerce->projection_contract(),
			'woocommerce_product_write_request'          => $wc_request->audit_payload(),
			'woocommerce_product_sync'                   => $sync,
			'square_inventory_projection'                => $square->projection_contract(),
			'woocommerce_projection_deferred'            => true !== ( $sync['synced'] ?? false ),
			'woocommerce_product_write_request_deferred' => true !== ( $sync['synced'] ?? false ),
			'square_inventory_projection_deferred'       => true,
			'network_request_deferred'                   => true,
			'operation_count'                            => $woocommerce->operation_count() + $square->operation_count(),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function woocommerce_projection_context( array $row, OfflineRestRequestData $data ): array {
		$body    = $data->body_params();
		$context = array_merge(
			$this->woocommerce_write_request_context,
			array(
				'environment'    => $this->environment_type(),
				'store_currency' => (string) ( $row['sale_currency'] ?? 'USD' ),
			)
		);

		$approval = trim( (string) ( $body['production_write_approval'] ?? $data->header( 'x-production-write-approval' ) ?? '' ) );
		if ( '' !== $approval ) {
			$context['production_write_approval'] = $approval;
		}

		return $context;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function woocommerce_sync_contract(
		OfflineRestRequestData $data,
		\TCGStorePlatform\WooCommerce\InventoryProductProjectionPlan $woocommerce,
		array $context,
		int $inventory_id
	): array {
		if ( ! $this->truthy( $data->body_params()['sync_woocommerce_product'] ?? false ) ) {
			return array(
				'action'                       => 'woocommerce_product_sync',
				'status'                       => 'deferred',
				'synced'                       => false,
				'requested'                    => false,
				'woocommerce_write_deferred'   => true,
				'payment_capture_deferred'     => true,
				'square_inventory_deferred'    => true,
				'source_of_truth'              => 'tcg_store_platform',
				'errors'                       => array(),
			);
		}

		$execution = $this->woocommerce_projection_executor( $context )->execute( $woocommerce );
		$audit     = $execution->audit_payload();
		$mapping   = null;

		if ( $execution->is_executed() && null !== $this->external_mapping_repository ) {
			$product_ids = $execution->product_ids();
			$product_id  = isset( $product_ids[0] ) ? (int) $product_ids[0] : 0;

			if ( $product_id > 0 ) {
				$mapping = $this->external_mapping_repository->mark_woocommerce_product_synced(
					$inventory_id,
					$product_id
				);
			}
		}

		return array(
			'action'                    => 'woocommerce_product_sync',
			'status'                    => $execution->status(),
			'synced'                    => $execution->is_executed() && true === ( $mapping['synced'] ?? false ),
			'requested'                 => true,
			'execution'                 => $audit,
			'mapping'                   => $mapping,
			'woocommerce_write_deferred' => ! $execution->is_executed(),
			'payment_capture_deferred'  => true,
			'square_inventory_deferred' => true,
			'source_of_truth'           => 'tcg_store_platform',
			'errors'                    => array_values(
				array_unique(
					array_merge(
						$execution->errors(),
						$execution->block_reasons(),
						is_array( $mapping ) ? ( $mapping['errors'] ?? array() ) : array()
					)
				)
			),
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

	private function truthy( mixed $value ): bool {
		if ( is_bool( $value ) ) {
			return $value;
		}

		return in_array( strtolower( trim( (string) $value ) ), array( '1', 'true', 'yes', 'on' ), true );
	}

	private function environment_type(): string {
		if ( function_exists( 'wp_get_environment_type' ) ) {
			return (string) wp_get_environment_type();
		}

		$environment_type = getenv( 'WP_ENVIRONMENT_TYPE' );

		return is_string( $environment_type ) && '' !== trim( $environment_type )
			? strtolower( trim( $environment_type ) )
			: 'production';
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
