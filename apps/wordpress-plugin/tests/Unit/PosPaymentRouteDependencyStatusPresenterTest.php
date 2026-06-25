<?php
/**
 * POS/payment route dependency status presenter tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\PosPaymentRouteDependencyFactory;
use TCGStorePlatform\Api\V1\PosPaymentRouteDependencyStatusPresenter;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentRouteDependencyStatusPresenterTest extends TestCase {
	public function test_health_payload_reports_blocked_default_dependencies(): void {
		$payload = ( new PosPaymentRouteDependencyStatusPresenter() )->health_payload();

		$this->assert_same( 'blocked', $payload['status'] );
		$this->assert_false( $payload['configured'] );
		$this->assert_same( 8, $payload['controller_handler_count'] );
		$this->assert_true( $payload['controller_handlers_configured'] );
		$this->assert_false( $payload['capability_permission_callbacks_configured'] );
		$this->assert_false( $payload['webhook_signature_verifier_configured'] );
		$this->assert_true( $payload['registrar_ready'] );
		$this->assert_true( $payload['bootstrapper_ready'] );
		$this->assert_true( $payload['route_registration_deferred'] );
		$this->assert_true( $payload['route_connected_reads_deferred'] );
		$this->assert_true( $payload['route_connected_writes_deferred'] );
		$this->assert_same( 'blocked', $payload['official_woocommerce_square_extension_status'] );
		$this->assert_false( $payload['official_woocommerce_square_extension_active'] );
		$this->assert_false( $payload['route_connected_reads_ready'] );
	}

	public function test_admin_summary_reports_counts_and_deferred_state(): void {
		$summary = ( new PosPaymentRouteDependencyStatusPresenter() )->admin_summary();

		$this->assert_same( 'blocked', $summary['status'] );
		$this->assert_contains( 'handlers 8 / 8', $summary['value'] );
		$this->assert_contains( 'permissions 0 / 8', $summary['value'] );
		$this->assert_contains( 'webhook verifier not ready', $summary['value'] );
		$this->assert_contains( 'fee handler deferred', $summary['value'] );
		$this->assert_contains( 'registrar ready', $summary['value'] );
		$this->assert_contains( 'bootstrapper ready', $summary['value'] );
		$this->assert_contains( 'routes deferred', $summary['value'] );
		$this->assert_contains( 'reads deferred', $summary['value'] );
		$this->assert_contains( 'writes deferred', $summary['value'] );
		$this->assert_contains( 'Square extension blocked', $summary['value'] );
	}

	public function test_health_payload_reports_ready_when_every_dependency_is_injected(): void {
		$payload = ( new PosPaymentRouteDependencyStatusPresenter(
			new PosPaymentRouteDependencyFactory(
				null,
				$this->handlers_for_all_routes(),
				static fn (): bool => true,
				static fn (): bool => true
			)
		) )->health_payload();

		$this->assert_same( 'ready', $payload['status'] );
		$this->assert_true( $payload['configured'] );
		$this->assert_same( 8, $payload['controller_handler_count'] );
		$this->assert_same( 8, $payload['permission_callback_count'] );
		$this->assert_true( $payload['route_registration_deferred'] );
		$this->assert_true( $payload['route_connected_reads_deferred'] );
		$this->assert_true( $payload['route_connected_writes_deferred'] );
		$this->assert_false( $payload['route_connected_reads_ready'] );
		$this->assert_false( $payload['route_connected_writes_ready'] );
	}

	/**
	 * @return array<string, callable(): array<string, mixed>>
	 */
	private function handlers_for_all_routes(): array {
		return array_fill_keys(
			array(
				'ingest_pos_event',
				'get_pos_event_status',
				'run_pos_reconciliation',
				'list_pos_reconciliation_conflicts',
				'resolve_pos_reconciliation_conflict',
				'receive_payment_provider_webhook',
				'list_payment_fee_snapshots',
				'create_payment_fee_snapshot',
			),
			static fn (): array => array( 'status' => 'ready' )
		);
	}
}
