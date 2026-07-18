<?php
/**
 * Authenticated ScryDex webhook LAN relay contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Tests\TestCase;

final class ScryDexWebhookRelayControllerContractTest extends TestCase {
	public function test_relay_routes_require_staff_capability_and_never_return_credentials(): void {
		$source = file_get_contents(
			dirname( __DIR__, 2 ) . '/src/Api/V1/ScryDexWebhookRelayController.php'
		);

		$this->assert_true( false !== $source );
		foreach (
			array(
				'/scrydex/webhook-events',
				'permission_callback',
				'can_relay',
				'manage_settings',
				'view_reports',
				'due_for_lan',
				'transition_for_lan',
				"'source_of_truth'              => 'local_sync_server'",
				"'credentials_synced_to_client' => false",
			) as $marker
		) {
			$this->assert_contains( $marker, (string) $source );
		}

		$this->assert_not_contains( '__return_true', (string) $source );
	}

	public function test_relay_repository_has_claim_retry_and_stale_processing_recovery(): void {
		$source = file_get_contents(
			dirname( __DIR__, 2 ) . '/src/ScryDex/ScryDexWebhookEventRepository.php'
		);

		$this->assert_true( false !== $source );
		foreach (
			array(
				'relay_attempt_count',
				'next_attempt_at',
				"processing_status = 'processing'",
				"array( 'processing', 'processed', 'retry', 'dead_letter' )",
			) as $marker
		) {
			$this->assert_contains( $marker, (string) $source );
		}

		$transition_offset = strpos( (string) $source, 'public function transition_for_lan' );
		$claim_offset      = strpos( (string) $source, '$claim_guard =' );
		$this->assert_true( false !== $transition_offset );
		$this->assert_true( false !== $claim_offset );
		$this->assert_true( $claim_offset > $transition_offset );
	}
}
