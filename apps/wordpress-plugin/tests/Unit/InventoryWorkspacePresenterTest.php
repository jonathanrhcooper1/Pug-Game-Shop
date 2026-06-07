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
