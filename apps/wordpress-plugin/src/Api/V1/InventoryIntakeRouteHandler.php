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
		$row               = array_merge(
			$plan->insert_row(),
			array(
				'inventory_id' => $result->insert_id(),
				'quantity'     => 1,
			)
		);
		$execution_context = $this->woocommerce_projection_context( $row, $data );
		$group_rows        = $this->inventory_rows_for_product_group( $row );
		if ( array() === $group_rows ) {
			$group_rows = array( $row );
		}

		$woocommerce = $this->woocommerce_projection_planner()->plan_group( $group_rows, $execution_context );
		$square      = $this->square_projection_planner()->plan_row( $row );
		$wc_request  = $this->woocommerce_write_request_planner()->plan(
			$woocommerce,
			$this->woocommerce_write_request_context
		);
		$sync        = $this->woocommerce_sync_contract( $data, $woocommerce, $execution_context, $this->inventory_ids( $group_rows ) );

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
			'grouped_product'                            => true,
			'group_row_count'                            => count( $group_rows ),
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
		array $inventory_ids
	): array {
		if ( ! $this->truthy( $data->body_params()['sync_woocommerce_product'] ?? false ) ) {
			return array(
				'action'                     => 'woocommerce_product_sync',
				'status'                     => 'deferred',
				'synced'                     => false,
				'requested'                  => false,
				'woocommerce_write_deferred' => true,
				'payment_capture_deferred'   => true,
				'square_inventory_deferred'  => true,
				'source_of_truth'            => 'tcg_store_platform',
				'errors'                     => array(),
			);
		}

		$execution = $this->woocommerce_projection_executor( $context )->execute( $woocommerce );
		$audit     = $execution->audit_payload();
		$mapping   = null;

		if ( $execution->is_executed() && null !== $this->external_mapping_repository ) {
			$product_ids = $execution->product_ids();
			$product_id  = isset( $product_ids[0] ) ? (int) $product_ids[0] : 0;

			if ( $product_id > 0 ) {
				$mapping = $this->external_mapping_repository->mark_woocommerce_product_synced_for_inventory_ids(
					$inventory_ids,
					$product_id
				);
			}
		}

		return array(
			'action'                     => 'woocommerce_product_sync',
			'status'                     => $execution->status(),
			'synced'                     => $execution->is_executed() && true === ( $mapping['synced'] ?? false ),
			'requested'                  => true,
			'execution'                  => $audit,
			'mapping'                    => $mapping,
			'grouped_product'            => true,
			'group_row_count'            => count( $inventory_ids ),
			'woocommerce_write_deferred' => ! $execution->is_executed(),
			'payment_capture_deferred'   => true,
			'square_inventory_deferred'  => true,
			'source_of_truth'            => 'tcg_store_platform',
			'errors'                     => array_values(
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

	/**
	 * @param array<string, mixed> $seed_row Inventory row used to identify grouped card copies.
	 * @return list<array<string, mixed>>
	 */
	private function inventory_rows_for_product_group( array $seed_row ): array {
		$database = $this->database();
		if ( null === $database ) {
			return array();
		}

		$table_name = $this->inventory_items_table_name( $database );
		if ( '' === $table_name ) {
			return array();
		}

		$where = $this->inventory_product_group_where( $database, $seed_row );
		if ( null === $where ) {
			return array();
		}

		$sql  = "SELECT * FROM `{$table_name}` WHERE {$where} ORDER BY `condition_code` ASC, `variant` ASC, `finish` ASC, `sale_price` ASC, `inventory_id` ASC"; // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		$rows = $database->get_results( $sql, ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return is_array( $rows ) ? array_values( array_filter( $rows, 'is_array' ) ) : array();
	}

	/**
	 * @param array<string, mixed> $seed_row Inventory row used to identify grouped card copies.
	 */
	private function inventory_product_group_where( \wpdb $database, array $seed_row ): ?string {
		$reference_id = self::absolute_int( $seed_row['reference_card_id'] ?? 0 );
		if ( $reference_id > 0 ) {
			$sql = $database->prepare( '`reference_card_id` = %d', array( $reference_id ) );

			return is_string( $sql ) ? $sql : null;
		}

		$provider_name    = $this->safe_sql_text( $seed_row['provider_name'] ?? '' );
		$provider_card_id = $this->safe_sql_text( $seed_row['provider_card_id'] ?? '' );
		if ( '' !== $provider_name && '' !== $provider_card_id ) {
			$sql = $database->prepare(
				'`provider_name` = %s AND `provider_card_id` = %s',
				array(
					$provider_name,
					$provider_card_id,
				)
			);

			return is_string( $sql ) ? $sql : null;
		}

		$game           = $this->safe_sql_text( $seed_row['game'] ?? '' );
		$card_name      = $this->safe_sql_text( $seed_row['card_name'] ?? '' );
		$set_code       = $this->safe_sql_text( $seed_row['set_code'] ?? '' );
		$printed_number = $this->safe_sql_text( $seed_row['printed_number'] ?? ( $seed_row['card_number'] ?? '' ) );

		if ( '' === $game || '' === $card_name || ( '' === $set_code && '' === $printed_number ) ) {
			return null;
		}

		$sql = $database->prepare(
			'`game` = %s AND `card_name` = %s AND (`set_code` = %s OR `set_name` = %s) AND (`printed_number` = %s OR `card_number` = %s)',
			array(
				$game,
				$card_name,
				$set_code,
				$set_code,
				$printed_number,
				$printed_number,
			)
		);

		return is_string( $sql ) ? $sql : null;
	}

	/**
	 * @param list<array<string, mixed>> $rows Inventory rows.
	 * @return list<int>
	 */
	private function inventory_ids( array $rows ): array {
		return array_values(
			array_filter(
				array_map(
					static fn ( array $row ): int => self::absolute_int( $row['inventory_id'] ?? 0 ),
					$rows
				),
				static fn ( int $inventory_id ): bool => $inventory_id > 0
			)
		);
	}

	private function database(): ?\wpdb {
		global $wpdb;

		return $wpdb instanceof \wpdb ? $wpdb : null;
	}

	private function inventory_items_table_name( \wpdb $database ): string {
		$prefix = (string) ( $database->prefix ?? '' );

		if ( '' === $prefix || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $prefix ) ) {
			return '';
		}

		return $prefix . 'tcg_inventory_items';
	}

	private function safe_sql_text( mixed $value ): string {
		return substr( trim( (string) ( is_array( $value ) || is_object( $value ) ? '' : $value ) ), 0, 191 );
	}

	private static function absolute_int( mixed $value ): int {
		if ( is_array( $value ) || is_object( $value ) ) {
			return 0;
		}

		return abs( (int) $value );
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
