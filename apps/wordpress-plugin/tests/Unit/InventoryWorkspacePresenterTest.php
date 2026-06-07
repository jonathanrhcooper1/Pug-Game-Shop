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

		$this->assert_same( 9, count( $rows ) );
		$this->assert_same( 'Disabled', $index['Feature flag']['value'] );
		$this->assert_same( 'blocked', $index['Feature flag']['status'] );
		$this->assert_same( '0 / 16 registerable', $index['Live routes']['value'] );
		$this->assert_same( 'blocked', $index['Live routes']['status'] );
		$this->assert_contains( 'inventory_pricing_feature_disabled', $index['Live routes']['notes'] );
		$this->assert_same( 'Factory ready', $index['Search']['value'] );
		$this->assert_same( 'deferred', $index['Search']['status'] );
		$this->assert_same( 'Factory ready', $index['Create']['value'] );
		$this->assert_same( 'deferred', $index['Create']['status'] );
		$this->assert_same( 'Deferred', $index['WooCommerce projection']['value'] );
		$this->assert_same( 'Deferred', $index['Square projection']['value'] );
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

		$this->assert_same( 4, count( $rows ) );
		$this->assert_same( 'Deferred', $index['Route execution']['value'] );
		$this->assert_same( 'pending', $index['Route execution']['status'] );
		$this->assert_same( 'Pending', $index['Repository writes']['value'] );
		$this->assert_same( 'pending', $index['Repository writes']['status'] );
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
		$this->assert_same( 'updated_desc', $panel['query']['sort'] );
		$this->assert_same( 50, $panel['query']['page_size'] );
		$this->assert_true( in_array( 'available', $panel['status_options'], true ) );
		$this->assert_true( in_array( 100, $panel['page_sizes'], true ) );
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
