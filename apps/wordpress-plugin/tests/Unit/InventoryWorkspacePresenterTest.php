<?php
/**
 * Inventory admin workspace presenter tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Admin\InventoryWorkspacePresenter;
use TCGStorePlatform\Api\V1\InventoryRouteBootstrapStatusPresenter;
use TCGStorePlatform\Api\V1\InventoryRouteDependencyFactory;
use TCGStorePlatform\Api\V1\InventoryRouteDependencyStatusPresenter;
use TCGStorePlatform\Tests\TestCase;

final class InventoryWorkspacePresenterTest extends TestCase {
	public function test_readiness_rows_report_default_safe_inventory_state(): void {
		$presenter    = new InventoryWorkspacePresenter();
		$bootstrap    = ( new InventoryRouteBootstrapStatusPresenter() )->health_payload( false );
		$dependencies = ( new InventoryRouteDependencyStatusPresenter(
			new InventoryRouteDependencyFactory()
		) )->health_payload();

		$rows  = $presenter->readiness_rows( $bootstrap, $dependencies );
		$index = $this->rows_by_label( $rows );

		$this->assert_same( 11, count( $rows ) );
		$this->assert_same( 'Disabled', $index['Feature flag']['value'] );
		$this->assert_same( 'blocked', $index['Feature flag']['status'] );
		$this->assert_same( '0 / 16 registerable', $index['Live routes']['value'] );
		$this->assert_same( 'blocked', $index['Live routes']['status'] );
		$this->assert_contains( 'inventory_pricing_feature_disabled', $index['Live routes']['notes'] );
		$this->assert_same( 'Factory ready', $index['Search']['value'] );
		$this->assert_same( 'deferred', $index['Search']['status'] );
		$this->assert_same( 'Factory ready', $index['Create']['value'] );
		$this->assert_same( 'deferred', $index['Create']['status'] );
		$this->assert_same( 'Deferred', $index['Projection planning']['value'] );
		$this->assert_same( 'deferred', $index['Projection planning']['status'] );
		$this->assert_contains( 'waiting for staged inventory create handler', $index['Projection planning']['notes'] );
		$this->assert_same( 'Deferred', $index['WooCommerce projection']['value'] );
		$this->assert_contains( 'write request planner staged', $index['WooCommerce projection']['notes'] );
		$this->assert_same( 'Deferred', $index['Square projection']['value'] );
		$this->assert_contains( 'sync request planner staged', $index['Square projection']['notes'] );
		$this->assert_same( 'Delegated to WooCommerce Square', $index['Square payments']['value'] );
		$this->assert_same( 'ready', $index['Square payments']['status'] );
		$this->assert_contains( 'inventory only', $index['Square payments']['notes'] );
	}

	public function test_readiness_rows_surface_projection_planning_ready_state(): void {
		$presenter = new InventoryWorkspacePresenter();
		$rows      = $presenter->readiness_rows(
			array(
				'feature_enabled'          => true,
				'registerable_route_count' => 2,
				'planned_route_count'      => 16,
				'status'                   => 'ready',
			),
			array(
				'inventory_search_route_handler_factory_ready' => true,
				'inventory_search_route_handler_ready'   => true,
				'inventory_search_route_reads_deferred'  => false,
				'inventory_intake_route_handler_factory_ready' => true,
				'inventory_intake_route_handler_ready'   => true,
				'inventory_intake_route_writes_deferred' => false,
				'woocommerce_projection_planner_ready'   => true,
				'woocommerce_product_write_request_planner_ready' => true,
				'square_inventory_projection_planner_ready' => true,
				'square_inventory_sync_request_planner_ready' => true,
				'external_projection_planning_deferred'  => false,
				'public_read_routes_enabled'             => false,
				'public_read_permission_callbacks_configured' => false,
				'capability_permission_callbacks_configured' => true,
				'woocommerce_projection_deferred'        => true,
				'square_inventory_projection_deferred'   => true,
				'label_print_deferred'                   => true,
			)
		);
		$index     = $this->rows_by_label( $rows );

		$this->assert_same( 'Ready', $index['Projection planning']['value'] );
		$this->assert_same( 'ready', $index['Projection planning']['status'] );
		$this->assert_contains( 'contracts planned', $index['Projection planning']['notes'] );
		$this->assert_same( 'Deferred', $index['WooCommerce projection']['value'] );
		$this->assert_contains( 'write request planner staged', $index['WooCommerce projection']['notes'] );
		$this->assert_same( 'Deferred', $index['Square projection']['value'] );
		$this->assert_contains( 'sync request planner staged', $index['Square projection']['notes'] );
		$this->assert_same( 'Delegated to WooCommerce Square', $index['Square payments']['value'] );
	}

	public function test_route_rows_surface_planned_contract_lockout(): void {
		$presenter = new InventoryWorkspacePresenter();
		$bootstrap = ( new InventoryRouteBootstrapStatusPresenter() )->health_payload( false );
		$rows      = $presenter->route_rows( $bootstrap );
		$index     = $this->rows_by_label( $rows );

		$this->assert_same( 16, count( $rows ) );
		$this->assert_same( 'GET /inventory/search', $index['GET /inventory/search']['value'] );
		$this->assert_same( 'deferred', $index['GET /inventory/search']['status'] );
		$this->assert_contains( 'registration deferred', $index['GET /inventory/search']['notes'] );
		$this->assert_contains( 'reads deferred', $index['GET /inventory/search']['notes'] );
		$this->assert_same( 'POST /inventory', $index['POST /inventory']['value'] );
		$this->assert_contains( 'writes deferred', $index['POST /inventory']['notes'] );
	}

	public function test_checkpoint_rows_keep_live_execution_pending_by_default(): void {
		$presenter    = new InventoryWorkspacePresenter();
		$dependencies = ( new InventoryRouteDependencyStatusPresenter(
			new InventoryRouteDependencyFactory()
		) )->health_payload();
		$rows         = $presenter->checkpoint_rows( $dependencies );
		$index        = $this->rows_by_label( $rows );

		$this->assert_same( 5, count( $rows ) );
		$this->assert_same( 'Deferred', $index['Route execution']['value'] );
		$this->assert_same( 'pending', $index['Route execution']['status'] );
		$this->assert_same( 'Pending', $index['Repository writes']['value'] );
		$this->assert_same( 'pending', $index['Repository writes']['status'] );
		$this->assert_same( 'Pending', $index['Projection contracts']['value'] );
		$this->assert_same( 'pending', $index['Projection contracts']['status'] );
		$this->assert_contains( 'sandbox projection', $index['Square inventory sync']['notes'] );
	}

	public function test_search_panel_reports_locked_default_state_and_sanitizes_filters(): void {
		$presenter    = new InventoryWorkspacePresenter();
		$bootstrap    = ( new InventoryRouteBootstrapStatusPresenter() )->health_payload( false );
		$dependencies = ( new InventoryRouteDependencyStatusPresenter(
			new InventoryRouteDependencyFactory()
		) )->health_payload();
		$panel        = $presenter->search_panel(
			$bootstrap,
			$dependencies,
			array(
				'q'         => str_repeat( 'a', 140 ),
				'game'      => '../bad',
				'status'    => 'bad',
				'raw_or_graded' => 'sealed',
				'sort'      => 'bad',
				'page_size' => 999,
			)
		);

		$this->assert_false( $panel['ready'] );
		$this->assert_same( 'locked', $panel['status'] );
		$this->assert_same( '/tcg-store/v1/inventory/search', $panel['endpoint_path'] );
		$this->assert_contains( 'inventory_pricing feature flag disabled', $panel['notes'] );
		$this->assert_same( 120, strlen( $panel['query']['q'] ) );
		$this->assert_same( '', $panel['query']['game'] );
		$this->assert_same( '', $panel['query']['status'] );
		$this->assert_same( '', $panel['query']['raw_or_graded'] );
		$this->assert_same( 'relevance', $panel['query']['sort'] );
		$this->assert_same( 25, $panel['query']['page_size'] );
		$this->assert_same( 'staff', $panel['query']['visibility'] );
	}

	public function test_search_panel_reports_ready_staging_staff_route(): void {
		$presenter = new InventoryWorkspacePresenter();
		$panel     = $presenter->search_panel(
			array(
				'feature_enabled'            => true,
				'route_registration_summary' => array(
					'GET /inventory/search' => array(
						'should_register'                => true,
						'route_connected_reads_deferred' => false,
						'registration_block_reasons'     => array(),
					),
				),
			),
			array(
				'inventory_search_route_handler_ready'     => true,
				'inventory_search_route_reads_deferred'    => false,
				'inventory_intake_route_writes_deferred'   => true,
				'inventory_search_route_dependency_issues' => array(),
			),
			array(
				'q'         => 'pikachu',
				'game'      => 'pokemon',
				'status'    => 'available',
				'raw_or_graded' => 'graded',
				'sort'      => 'updated_desc',
				'page_size' => 50,
			)
		);

		$this->assert_true( $panel['ready'] );
		$this->assert_same( 'ready', $panel['status'] );
		$this->assert_contains( 'Staff search reads are enabled', $panel['notes'] );
		$this->assert_same( 'pikachu', $panel['query']['q'] );
		$this->assert_same( 'pokemon', $panel['query']['game'] );
		$this->assert_same( 'available', $panel['query']['status'] );
		$this->assert_same( 'graded', $panel['query']['raw_or_graded'] );
		$this->assert_same( 'updated_desc', $panel['query']['sort'] );
		$this->assert_same( 50, $panel['query']['page_size'] );
		$this->assert_true( in_array( 'available', $panel['status_options'], true ) );
		$this->assert_true( in_array( 'graded', $panel['raw_or_graded_options'], true ) );
		$this->assert_true( in_array( 100, $panel['page_sizes'], true ) );
	}

	public function test_square_mapping_panel_tracks_ready_review_and_duplicate_pos_rows(): void {
		$presenter = new InventoryWorkspacePresenter();
		$panel     = $presenter->square_mapping_panel(
			array(
				'ready' => true,
			)
		);
		$summary   = $presenter->square_mapping_summary(
			array(
				array(
					'inventory_id'                 => 42,
					'public_id'                   => 'inventory-ready',
					'card_name'                   => 'Charizard',
					'set_code'                    => 'BASE',
					'condition_code'              => 'LP',
					'barcode'                     => 'PUG-READY-001',
					'sku'                         => 'PUG-READY-001',
					'square_catalog_item_id'      => 'SQUARE-ITEM-1',
					'square_catalog_variation_id' => 'SQUARE-VARIATION-1',
					'status'                      => 'available',
					'pos_visibility'              => 'visible',
				),
				array(
					'public_id'      => 'inventory-missing-square',
					'card_name'      => 'Pikachu',
					'set_code'       => 'JGL',
					'condition_code' => 'NM',
					'barcode'        => 'PUG-MISSING-001',
					'status'         => 'available',
					'pos_visibility' => 'visible',
				),
				array(
					'public_id'                   => 'inventory-duplicate-a',
					'card_name'                   => 'Mew',
					'barcode'                     => 'PUG-DUP-001',
					'square_catalog_variation_id' => 'SQUARE-VARIATION-2',
					'status'                      => 'available',
					'pos_visibility'              => 'visible',
				),
				array(
					'public_id'                   => 'inventory-duplicate-b',
					'card_name'                   => 'Mewtwo',
					'barcode'                     => 'PUG-DUP-001',
					'square_catalog_variation_id' => 'SQUARE-VARIATION-3',
					'status'                      => 'available',
					'pos_visibility'              => 'visible',
				),
				array(
					'public_id'      => 'inventory-hidden',
					'card_name'      => 'Hidden Row',
					'barcode'        => 'PUG-HIDDEN-001',
					'status'         => 'available',
					'pos_visibility' => 'hidden',
				),
			)
		);

		$this->assert_true( $panel['ready'] );
		$this->assert_contains( 'Square POS mappings', $panel['status_label'] );
		$this->assert_same( 'tcg_store_platform', $summary['square_inventory_authority'] );
		$this->assert_same( 'pos_reconciliation_and_exception_detection', $summary['square_counts_used_for'] );
		$this->assert_same( 5, $summary['total_rows'] );
		$this->assert_same( 4, $summary['pos_visible_count'] );
		$this->assert_same( 1, $summary['pos_hidden_or_staff_only_count'] );
		$this->assert_same( 1, $summary['ready_count'] );
		$this->assert_same( 3, $summary['review_count'] );
		$this->assert_same( 1, $summary['duplicate_scan_identity_count'] );
		$this->assert_same( 42, $summary['ready_items'][0]['inventory_id'] );
		$this->assert_same( 'Charizard', $summary['ready_items'][0]['card_name'] );
		$this->assert_true(
			in_array( 'square_catalog_variation_id_required_for_inventory_pull', $summary['review_items'][0]['errors'], true )
		);
		$this->assert_true(
			in_array( 'duplicate_barcode_or_sku', $summary['review_items'][1]['errors'], true )
		);
	}

	public function test_lookup_panel_reports_locked_default_state_and_sanitizes_query(): void {
		$presenter    = new InventoryWorkspacePresenter();
		$bootstrap    = ( new InventoryRouteBootstrapStatusPresenter() )->health_payload( false );
		$dependencies = ( new InventoryRouteDependencyStatusPresenter(
			new InventoryRouteDependencyFactory()
		) )->health_payload();
		$panel        = $presenter->lookup_panel(
			$bootstrap,
			$dependencies,
			array(
				'q'         => str_repeat( 'z', 140 ),
				'game'      => '../bad',
				'page_size' => 999,
			)
		);

		$this->assert_false( $panel['ready'] );
		$this->assert_same( 'locked', $panel['status'] );
		$this->assert_same( '/tcg-store/v1/reference/search', $panel['endpoint_path'] );
		$this->assert_contains( 'inventory_pricing feature flag disabled', $panel['notes'] );
		$this->assert_same( 120, strlen( $panel['query']['q'] ) );
		$this->assert_same( 'pokemon', $panel['query']['game'] );
		$this->assert_same( 12, $panel['query']['page_size'] );
		$this->assert_true( in_array( 'NM', $panel['condition_options'], true ) );
		$this->assert_true( in_array( 25, $panel['quantity_options'], true ) );
		$this->assert_true( in_array( 50, $panel['page_sizes'], true ) );
	}

	public function test_lookup_panel_reports_ready_staging_reference_route(): void {
		$presenter = new InventoryWorkspacePresenter();
		$panel     = $presenter->lookup_panel(
			array(
				'feature_enabled'            => true,
				'route_registration_summary' => array(
					'GET /reference/search' => array(
						'should_register'                => true,
						'route_connected_reads_deferred' => false,
						'registration_block_reasons'     => array(),
					),
				),
			),
			array(
				'reference_search_handler_ready'          => true,
				'inventory_search_route_dependency_issues' => array(),
				'configuration_issues'                    => array(),
			),
			array(
				'q'         => 'charizard',
				'game'      => 'pokemon',
				'page_size' => 50,
			)
		);

		$this->assert_true( $panel['ready'] );
		$this->assert_same( 'ready', $panel['status'] );
		$this->assert_contains( 'Lookup reads the website reference catalog first', $panel['notes'] );
		$this->assert_same( 'charizard', $panel['query']['q'] );
		$this->assert_same( 'pokemon', $panel['query']['game'] );
		$this->assert_same( 50, $panel['query']['page_size'] );
	}

	public function test_intake_panel_reports_locked_default_state_and_sanitizes_form(): void {
		$presenter    = new InventoryWorkspacePresenter();
		$bootstrap    = ( new InventoryRouteBootstrapStatusPresenter() )->health_payload( false );
		$dependencies = ( new InventoryRouteDependencyStatusPresenter(
			new InventoryRouteDependencyFactory()
		) )->health_payload();
		$panel        = $presenter->intake_panel(
			$bootstrap,
			$dependencies,
			array(
				'game'                           => '../bad',
				'card_name'                      => str_repeat( 'a', 140 ),
				'set_code'                       => 'base',
				'provider_name'                   => '../bad',
				'provider_card_id'                => str_repeat( 'p', 140 ),
				'reference_card_id'               => 'bad',
				'reference_variant_id'            => '9',
				'status'                         => 'bad',
				'raw_or_graded'                  => 'bad',
				'condition_code'                 => 'bad',
				'location_id'                    => '-1',
				'sale_currency'                  => 'b1d',
				'minimum_sale_price_minor_units' => 'bad',
				'sale_price_minor_units'         => '200',
				'market_price_minor_units'       => '333',
				'front_image_remote_url'         => 'javascript:alert(1)',
				'back_image_remote_url'          => 'https://images.example.test/back.png',
				'intake_quantity'                => '999',
				'online_visibility'              => 'bad',
			)
		);

		$this->assert_false( $panel['ready'] );
		$this->assert_same( 'locked', $panel['status'] );
		$this->assert_same( '/tcg-store/v1/inventory', $panel['endpoint_path'] );
		$this->assert_same( 'POST', $panel['method'] );
		$this->assert_contains( 'inventory_pricing feature flag disabled', $panel['notes'] );
		$this->assert_same( 'staff', $panel['form']['source'] );
		$this->assert_same( 'pokemon', $panel['form']['game'] );
		$this->assert_same( 120, strlen( $panel['form']['card_name'] ) );
		$this->assert_same( 'BASE', $panel['form']['set_code'] );
		$this->assert_same( 'scrydex', $panel['form']['provider_name'] );
		$this->assert_same( 120, strlen( $panel['form']['provider_card_id'] ) );
		$this->assert_same( '', $panel['form']['reference_card_id'] );
		$this->assert_same( '9', $panel['form']['reference_variant_id'] );
		$this->assert_same( 'available', $panel['form']['status'] );
		$this->assert_same( 'raw', $panel['form']['raw_or_graded'] );
		$this->assert_same( 'NM', $panel['form']['condition_code'] );
		$this->assert_same( '', $panel['form']['location_id'] );
		$this->assert_same( 'USD', $panel['form']['sale_currency'] );
		$this->assert_same( 0, $panel['form']['minimum_sale_price_minor_units'] );
		$this->assert_same( 200, $panel['form']['sale_price_minor_units'] );
		$this->assert_same( 333, $panel['form']['market_price_minor_units'] );
		$this->assert_same( '', $panel['form']['front_image_remote_url'] );
		$this->assert_same( 'https://images.example.test/back.png', $panel['form']['back_image_remote_url'] );
		$this->assert_same( 100, $panel['form']['intake_quantity'] );
		$this->assert_same( 'hidden', $panel['form']['online_visibility'] );
	}

	public function test_intake_panel_reports_ready_staging_create_route(): void {
		$presenter = new InventoryWorkspacePresenter();
		$panel     = $presenter->intake_panel(
			array(
				'feature_enabled'            => true,
				'route_registration_summary' => array(
					'POST /inventory' => array(
						'should_register'                 => true,
						'route_connected_writes_deferred' => false,
						'woocommerce_projection_deferred' => true,
						'square_inventory_projection_deferred' => true,
						'label_print_deferred'            => true,
						'registration_block_reasons'      => array(),
					),
				),
			),
			array(
				'inventory_intake_route_handler_ready'     => true,
				'inventory_intake_route_writes_deferred'   => false,
				'inventory_intake_route_dependency_issues' => array(),
				'square_inventory_projection_deferred'     => true,
				'woocommerce_projection_deferred'          => true,
				'label_print_deferred'                     => true,
			),
			array(
				'game'                           => 'pokemon',
				'card_name'                      => 'Bulbasaur',
				'set_code'                       => 'BASE',
				'condition_code'                 => 'lp',
				'location_id'                    => '7',
				'minimum_sale_price_minor_units' => 100,
				'sale_price_minor_units'         => 250,
				'online_visibility'              => 'visible',
			)
		);

		$this->assert_true( $panel['ready'] );
		$this->assert_same( 'ready', $panel['status'] );
		$this->assert_contains( 'Staff intake writes are enabled', $panel['notes'] );
		$this->assert_same( 'Bulbasaur', $panel['form']['card_name'] );
		$this->assert_same( 'BASE', $panel['form']['set_code'] );
		$this->assert_same( 'LP', $panel['form']['condition_code'] );
		$this->assert_same( '7', $panel['form']['location_id'] );
		$this->assert_true( in_array( 'available', $panel['status_options'], true ) );
		$this->assert_true( in_array( 'visible', $panel['visibility_options'], true ) );
	}

	/**
	 * @param list<array{label:string,value:string,status:string,notes:string}> $rows Rows.
	 * @return array<string, array{label:string,value:string,status:string,notes:string}>
	 */
	private function rows_by_label( array $rows ): array {
		$index = array();

		foreach ( $rows as $row ) {
			$index[ $row['label'] ] = $row;
		}

		return $index;
	}
}
