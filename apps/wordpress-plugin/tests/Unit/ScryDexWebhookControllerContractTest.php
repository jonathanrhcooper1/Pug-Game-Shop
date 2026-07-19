<?php
/**
 * ScryDex webhook controller source contract tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Tests\TestCase;

final class ScryDexWebhookControllerContractTest extends TestCase {
	public function test_webhook_route_is_public_but_signed_and_enqueue_only(): void {
		$source = $this->source();

		foreach (
			array(
				'/scrydex/webhooks',
				'permission_callback',
				'__return_true',
				'X-Scrydex-Signature',
				'x_scrydex_signature',
				'ScryDexWebhookSignatureVerifier',
				'ScryDexWebhookPayloadParser',
				'ScryDexWebhookSyncDispatcher',
				'ScryDexWebhookEventRepository',
				'scrydex_webhook_signature_invalid',
				'scrydex_webhook_payload_invalid',
				'scrydex_webhook_accepted',
				'targeted_expansion_sync',
				'full_catalog_polling_requested',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}
	}

	public function test_receiver_does_not_log_or_return_secret_values(): void {
		$source = $this->source();

		foreach (
			array(
				'credential_values_redacted',
				'payload_hash',
				'event_id',
				'event_name',
			) as $marker
		) {
			$this->assert_contains( $marker, $source );
		}

		$this->assert_not_contains( "'webhook_secret' =>", $source );
		$this->assert_not_contains( '"webhook_secret" =>', $source );
	}

	public function test_receiver_does_not_acknowledge_an_event_that_was_not_durably_logged(): void {
		$source = $this->source();

		$this->assert_contains( "array( 'logged', 'duplicate' )", $source );
		$this->assert_contains( 'scrydex_webhook_event_log_failed', $source );
		$this->assert_contains( 'return $this->response( $result, 503 )', $source );
	}

	private function source(): string {
		$path     = dirname( __DIR__, 2 ) . '/src/Api/V1/ScryDexWebhookController.php';
		$contents = file_get_contents( $path );

		if ( false === $contents ) {
			throw new \RuntimeException( 'Unable to read ScryDexWebhookController.php.' );
		}

		return $contents;
	}
}
