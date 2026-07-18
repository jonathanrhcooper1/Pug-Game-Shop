<?php
/**
 * ScryDex webhook sync dispatcher tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexWebhookSyncDispatcher;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexWebhookSyncDispatcherTest extends TestCase {
	public function test_dispatcher_fails_closed_when_wordpress_scheduler_is_unavailable(): void {
		$result = ( new ScryDexWebhookSyncDispatcher() )->dispatch(
			array(
				'event_id'      => 'evt_pkmn_prices_123',
				'event_name'    => 'pokemon.expansions.prices.raw_updated',
				'game'          => 'pokemon',
				'update_type'   => 'raw_prices',
				'expansion_ids' => array( 'base1' ),
			)
		);

		$this->assert_same( 'failed', $result['status'] );
		$this->assert_same( ScryDexWebhookSyncDispatcher::ACTION, $result['scheduler_action'] );
		$this->assert_true( $result['targeted_expansion_sync'] );
		$this->assert_false( $result['full_catalog_polling_requested'] );
		$this->assert_true( in_array( 'scrydex_webhook_dispatch_scheduler_unavailable', $result['errors'], true ) );
	}
}
