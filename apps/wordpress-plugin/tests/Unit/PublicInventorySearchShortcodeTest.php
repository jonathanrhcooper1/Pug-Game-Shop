<?php
/**
 * Public inventory search shortcode tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\PublicSite\InventorySearchShortcode;
use TCGStorePlatform\Tests\TestCase;

final class PublicInventorySearchShortcodeTest extends TestCase {
	public function test_shortcode_contract_registers_public_inventory_search(): void {
		$this->assert_same( 'tcg_inventory_search', InventorySearchShortcode::SHORTCODE );
		$this->assert_same( 'tcg-store-public-inventory', InventorySearchShortcode::STYLE_HANDLE );

		$contracts = InventorySearchShortcode::hook_contracts();
		$map       = array();

		foreach ( $contracts as $contract ) {
			$map[ $contract['type'] . ' ' . $contract['hook'] ] = $contract['callback'];
		}

		$this->assert_same( 'render_inventory_search', $map['shortcode tcg_inventory_search'] );
		$this->assert_same( 'enqueue_assets', $map['action wp_enqueue_scripts'] );
	}
}
