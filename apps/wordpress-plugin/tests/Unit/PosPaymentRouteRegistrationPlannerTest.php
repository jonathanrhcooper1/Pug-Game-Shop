<?php
/**
 * POS/payment route registration planner tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Api\V1\PosPaymentCapabilityPermissionCallbackAdapter;
use TCGStorePlatform\Api\V1\PosPaymentController;
use TCGStorePlatform\Api\V1\PosPaymentRouteContracts;
use TCGStorePlatform\Api\V1\PosPaymentRoutePermissionCallbackFactory;
use TCGStorePlatform\Api\V1\PosPaymentRouteRegistrationPlanner;
use TCGStorePlatform\Api\V1\PosPaymentWebhookPermissionCallbackAdapter;
use TCGStorePlatform\Tests\TestCase;

final class PosPaymentRouteRegistrationPlannerTest extends TestCase {
	public function test_pos_payment_routes_remain_disabled_without_callback_factory(): void {
		$planner = new PosPaymentRouteRegistrationPlanner();
		$plans   = $planner->planned_registration_args();

		$this->assert_same( 8, count( $plans ) );
		$this->assert_same( array(), $planner->enabled_registration_args() );

		foreach ( $plans as $plan ) {
			$this->assert_false( $plan['should_register'] );
			$this->assert_false( $plan['permission_callback_ready'] );
			$this->assert_false( $plan['controller_callback_ready'] );
			$this->assert_same( null, $plan['controller_callback'] );
			$this->assert_same( '__return_false', $plan['permission_callback'] );
			$this->assert_true( $plan['route_registration_deferred'] );
			$this->assert_true( in_array( 'route_disabled_by_default', $plan['registration_block_reasons'], true ) );
			$this->assert_true( in_array( 'route_registration_deferred', $plan['registration_block_reasons'], true ) );
			$this->assert_true( in_array( 'permission_callback_not_ready', $plan['registration_block_reasons'], true ) );
			$this->assert_true( in_array( 'controller_callback_not_ready', $plan['registration_block_reasons'], true ) );
		}
	}

	public function test_planner_attaches_capability_permission_callbacks_as_planned_metadata(): void {
		$plans = $this->planner_with_permissions()->planned_registration_args();
		$event = $plans['POST /pos/events'];
		$fees  = $plans['GET /payments/fee-snapshots'];

		$this->assert_true( $event['permission_callback'] instanceof PosPaymentCapabilityPermissionCallbackAdapter );
		$this->assert_true( $fees['permission_callback'] instanceof PosPaymentCapabilityPermissionCallbackAdapter );
		$this->assert_same( 'manage_pos', $event['permission_callback']->capability() );
		$this->assert_same( 'manage_settings', $fees['permission_callback']->capability() );
		$this->assert_true( $event['permission_callback_ready'] );
		$this->assert_true( $fees['permission_callback_ready'] );
		$this->assert_false( $event['should_register'] );
		$this->assert_true( in_array( 'route_registration_deferred', $event['registration_block_reasons'], true ) );
		$this->assert_false( in_array( 'permission_callback_not_ready', $event['registration_block_reasons'], true ) );
	}

	public function test_webhook_route_requires_configured_signature_verifier(): void {
		$without_verifier = $this->planner_with_permissions()->planned_registration_args();
		$locked_webhook   = $without_verifier['POST /payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)'];

		$this->assert_same( '__return_false', $locked_webhook['permission_callback'] );
		$this->assert_false( $locked_webhook['permission_callback_ready'] );

		$with_verifier = ( new PosPaymentRouteRegistrationPlanner(
			new PosPaymentRoutePermissionCallbackFactory(
				static fn (): bool => true,
				static fn ( mixed $request ): bool => is_array( $request )
					&& 'valid-test-signature' === ( $request['signature'] ?? '' )
			)
		) )->planned_registration_args();
		$ready_webhook = $with_verifier['POST /payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)'];

		$this->assert_true( $ready_webhook['permission_callback'] instanceof PosPaymentWebhookPermissionCallbackAdapter );
		$this->assert_true( $ready_webhook['permission_callback_ready'] );
		$this->assert_true( in_array( 'webhook_registration_deferred', $ready_webhook['registration_block_reasons'], true ) );
	}

	public function test_planner_requires_injected_handlers_for_controller_readiness(): void {
		$plans = ( new PosPaymentRouteRegistrationPlanner( null, new PosPaymentController() ) )->planned_registration_args();

		foreach ( $plans as $plan ) {
			$this->assert_false( $plan['controller_callback_ready'] );
			$this->assert_same( null, $plan['controller_callback'] );
			$this->assert_true( in_array( 'controller_callback_not_ready', $plan['registration_block_reasons'], true ) );
		}
	}

	public function test_planner_tracks_injected_handler_readiness_without_enabling_routes(): void {
		$plans = $this->planner_with_every_handler()->planned_registration_args();

		foreach ( $plans as $plan ) {
			$this->assert_true( $plan['controller_callback_ready'] );
			$this->assert_true( is_callable( $plan['controller_callback'] ) );
			$this->assert_false( $plan['should_register'] );
			$this->assert_true( in_array( 'route_disabled_by_default', $plan['registration_block_reasons'], true ) );
			$this->assert_false( in_array( 'controller_callback_not_ready', $plan['registration_block_reasons'], true ) );
		}
	}

	public function test_future_read_only_route_can_register_when_route_registration_deferral_is_cleared(): void {
		$registrations = $this->planner_with_every_handler()->enabled_registration_args( $this->future_enabled_fee_review_route() );

		$this->assert_same( 1, count( $registrations ) );
		$this->assert_same( 'tcg-store/v1', $registrations[0]['namespace'] );
		$this->assert_same( '/payments/fee-snapshots', $registrations[0]['path'] );
		$this->assert_same( 'GET', $registrations[0]['methods'] );
		$this->assert_true( is_callable( $registrations[0]['controller_callback'] ) );
		$this->assert_true( $registrations[0]['permission_callback'] instanceof PosPaymentCapabilityPermissionCallbackAdapter );
		$this->assert_same( array(), $registrations[0]['registration_block_reasons'] );
	}

	public function test_future_write_route_stays_blocked_while_connected_writes_are_deferred(): void {
		$plans = $this->planner_with_every_handler()->planned_registration_args( $this->future_enabled_pos_ingest_route() );
		$plan  = $plans['POST /pos/events'];

		$this->assert_false( $plan['should_register'] );
		$this->assert_true( in_array( 'route_connected_writes_deferred', $plan['registration_block_reasons'], true ) );
	}

	public function test_future_write_route_can_register_after_registration_and_write_deferrals_are_cleared(): void {
		$plans = $this->planner_with_every_handler()->planned_registration_args(
			$this->future_enabled_pos_ingest_route(
				array(
					'route_connected_writes_deferred' => false,
				)
			)
		);
		$plan  = $plans['POST /pos/events'];

		$this->assert_true( $plan['should_register'] );
		$this->assert_same( array(), $plan['registration_block_reasons'] );
	}

	public function test_future_webhook_route_requires_webhook_deferral_to_be_cleared(): void {
		$plans = $this->planner_with_every_handler(
			static fn (): bool => true,
			static fn (): bool => true
		)->planned_registration_args(
			$this->future_enabled_webhook_route(
				array(
					'route_connected_writes_deferred' => false,
				)
			)
		);
		$plan  = $plans['POST /payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)'];

		$this->assert_false( $plan['should_register'] );
		$this->assert_true( in_array( 'webhook_registration_deferred', $plan['registration_block_reasons'], true ) );

		$ready = $this->planner_with_every_handler(
			static fn (): bool => true,
			static fn (): bool => true
		)->planned_registration_args(
			$this->future_enabled_webhook_route(
				array(
					'route_connected_writes_deferred' => false,
					'webhook_registration_deferred'   => false,
				)
			)
		);

		$this->assert_true( $ready['POST /payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)']['should_register'] );
	}

	public function test_planner_never_uses_public_permission_bypass(): void {
		$plans = $this->planner_with_every_handler()->planned_registration_args();

		foreach ( $plans as $plan ) {
			if ( is_string( $plan['permission_callback'] ) ) {
				$this->assert_not_contains( '__return_true', $plan['permission_callback'] );
			}
		}
	}

	private function planner_with_permissions(): PosPaymentRouteRegistrationPlanner {
		return new PosPaymentRouteRegistrationPlanner(
			new PosPaymentRoutePermissionCallbackFactory(
				static fn (): bool => true
			)
		);
	}

	private function planner_with_every_handler(
		?callable $capability_checker = null,
		?callable $webhook_signature_verifier = null
	): PosPaymentRouteRegistrationPlanner {
		return new PosPaymentRouteRegistrationPlanner(
			new PosPaymentRoutePermissionCallbackFactory(
				$capability_checker ?? static fn (): bool => true,
				$webhook_signature_verifier
			),
			new PosPaymentController( null, $this->handlers_for_all_routes() )
		);
	}

	/**
	 * @return array<string, callable(): array<string, string>>
	 */
	private function handlers_for_all_routes(): array {
		$handlers = array();

		foreach ( PosPaymentRouteContracts::route_contracts() as $route ) {
			$handlers[ $route['callback'] ] = static fn (): array => array( 'status' => 'ready' );
		}

		return $handlers;
	}

	/**
	 * @param array<string, mixed> $overrides Route overrides.
	 * @return list<array<string, mixed>>
	 */
	private function future_enabled_fee_review_route( array $overrides = array() ): array {
		return $this->future_enabled_route( '/payments/fee-snapshots', 'GET', $overrides );
	}

	/**
	 * @param array<string, mixed> $overrides Route overrides.
	 * @return list<array<string, mixed>>
	 */
	private function future_enabled_pos_ingest_route( array $overrides = array() ): array {
		return $this->future_enabled_route( '/pos/events', 'POST', $overrides );
	}

	/**
	 * @param array<string, mixed> $overrides Route overrides.
	 * @return list<array<string, mixed>>
	 */
	private function future_enabled_webhook_route( array $overrides = array() ): array {
		return $this->future_enabled_route( '/payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)', 'POST', $overrides );
	}

	/**
	 * @param array<string, mixed> $overrides Route overrides.
	 * @return list<array<string, mixed>>
	 */
	private function future_enabled_route( string $path, string $method, array $overrides = array() ): array {
		$routes = PosPaymentRouteContracts::route_contracts();

		foreach ( $routes as $index => $route ) {
			$routes[ $index ]['live_enabled_by_default']     = $path === $route['path'] && $method === $route['method'];
			$routes[ $index ]['route_registration_deferred'] = ! $routes[ $index ]['live_enabled_by_default'];

			if ( $routes[ $index ]['live_enabled_by_default'] ) {
				$routes[ $index ] = array_merge( $routes[ $index ], $overrides );
			}
		}

		return $routes;
	}
}
