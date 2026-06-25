<?php
/**
 * POS/payment route permission callback factory tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use RuntimeException;
use TCGStorePlatform\Api\V1\PosPaymentCapabilityPermissionCallbackAdapter;
use TCGStorePlatform\Api\V1\PosPaymentRoutePermissionCallbackFactory;
use TCGStorePlatform\Api\V1\PosPaymentWebhookPermissionCallbackAdapter;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentRoutePermissionCallbackFactoryTest extends TestCase {
	public function test_capability_map_matches_planned_pos_payment_route_contracts(): void {
		$this->assert_same(
			array(
				'POST /pos/events'                                             => 'manage_pos',
				'GET /pos/events/(?P<provider_event_id>[a-zA-Z0-9:_-]+)'       => 'manage_pos',
				'POST /pos/reconciliation/run'                                 => 'manage_pos',
				'GET /pos/reconciliation/conflicts'                            => 'resolve_conflicts',
				'POST /pos/reconciliation/conflicts/(?P<conflict_id>\d+)/resolve' => 'resolve_conflicts',
				'GET /payments/fee-snapshots'                                  => 'manage_settings',
				'POST /payments/fee-snapshots'                                 => 'manage_settings',
			),
			PosPaymentRoutePermissionCallbackFactory::capability_map()
		);
	}

	public function test_webhook_route_keys_are_kept_separate_from_capability_permissions(): void {
		$this->assert_same(
			array( 'POST /payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)' ),
			PosPaymentRoutePermissionCallbackFactory::webhook_route_keys()
		);
	}

	public function test_factory_returns_no_callbacks_without_configured_checkers(): void {
		$factory = new PosPaymentRoutePermissionCallbackFactory();

		$this->assert_same( array(), $factory->callbacks_for_contracts() );
	}

	public function test_factory_builds_capability_callbacks_with_injected_checker(): void {
		$factory   = new PosPaymentRoutePermissionCallbackFactory(
			static fn ( string $capability ): bool => 'manage_pos' === $capability
		);
		$callbacks = $factory->callbacks_for_contracts();

		$this->assert_same( 7, count( $callbacks ) );
		$this->assert_true( $callbacks['POST /pos/events'] instanceof PosPaymentCapabilityPermissionCallbackAdapter );
		$this->assert_same( 'manage_pos', $callbacks['POST /pos/events']->capability() );
		$this->assert_true( $callbacks['POST /pos/events']->authorize() );
		$this->assert_false( $callbacks['GET /payments/fee-snapshots']->authorize() );
		$this->assert_same( 'denied', $callbacks['GET /payments/fee-snapshots']->last_audit_payload()['status'] );
		$this->assert_true(
			in_array(
				'capability_denied',
				$callbacks['GET /payments/fee-snapshots']->last_audit_payload()['errors'],
				true
			)
		);
		$this->assert_false( isset( $callbacks['POST /payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)'] ) );
	}

	public function test_factory_adds_webhook_callback_only_when_verifier_is_configured(): void {
		$factory   = new PosPaymentRoutePermissionCallbackFactory(
			static fn (): bool => true,
			static fn ( mixed $request ): bool => is_array( $request )
				&& 'valid-test-signature' === ( $request['signature'] ?? '' )
		);
		$callbacks = $factory->callbacks_for_contracts();
		$webhook   = $callbacks['POST /payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)'];

		$this->assert_same( 8, count( $callbacks ) );
		$this->assert_true( $webhook instanceof PosPaymentWebhookPermissionCallbackAdapter );
		$this->assert_true( $webhook->authorize( array( 'signature' => 'valid-test-signature' ) ) );
		$this->assert_false( $webhook->authorize( array( 'signature' => 'invalid-test-signature' ) ) );
		$this->assert_true( in_array( 'webhook_signature_invalid', $webhook->last_audit_payload()['errors'], true ) );
	}

	public function test_callbacks_fail_closed_when_checkers_throw(): void {
		$capability = new PosPaymentCapabilityPermissionCallbackAdapter(
			'manage_pos',
			static function (): bool {
				throw new RuntimeException( 'capability checker failed' );
			}
		);
		$webhook    = new PosPaymentWebhookPermissionCallbackAdapter(
			static function (): bool {
				throw new RuntimeException( 'webhook verifier failed' );
			}
		);

		$this->assert_false( $capability->authorize() );
		$this->assert_true( in_array( 'capability_checker_failed', $capability->last_audit_payload()['errors'], true ) );
		$this->assert_false( $webhook->authorize( array() ) );
		$this->assert_true( in_array( 'webhook_signature_verifier_failed', $webhook->last_audit_payload()['errors'], true ) );
	}
}
