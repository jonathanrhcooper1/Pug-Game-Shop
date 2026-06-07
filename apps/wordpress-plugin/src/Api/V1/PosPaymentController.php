<?php
/**
 * Fail-closed POS/payment REST controller scaffold.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class PosPaymentController {
	private OfflineRestRequestAdapter $request_adapter;

	/**
	 * @var array<string, callable(OfflineRestRequestData): array<string, mixed>>
	 */
	private array $handlers;

	/**
	 * @param array<string, callable(OfflineRestRequestData): array<string, mixed>> $handlers Route handlers.
	 */
	public function __construct( ?OfflineRestRequestAdapter $request_adapter = null, array $handlers = array() ) {
		$this->request_adapter = $request_adapter ?? new OfflineRestRequestAdapter();
		$this->handlers        = $handlers;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function ingest_pos_event( mixed $request ): array {
		return $this->dispatch( 'ingest_pos_event', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function get_pos_event_status( mixed $request ): array {
		return $this->dispatch( 'get_pos_event_status', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function run_pos_reconciliation( mixed $request ): array {
		return $this->dispatch( 'run_pos_reconciliation', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function list_pos_reconciliation_conflicts( mixed $request ): array {
		return $this->dispatch( 'list_pos_reconciliation_conflicts', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function resolve_pos_reconciliation_conflict( mixed $request ): array {
		return $this->dispatch( 'resolve_pos_reconciliation_conflict', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function receive_payment_provider_webhook( mixed $request ): array {
		return $this->dispatch( 'receive_payment_provider_webhook', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function list_payment_fee_snapshots( mixed $request ): array {
		return $this->dispatch( 'list_payment_fee_snapshots', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function create_payment_fee_snapshot( mixed $request ): array {
		return $this->dispatch( 'create_payment_fee_snapshot', $request );
	}

	public function has_handler( string $callback ): bool {
		return is_callable( $this->handlers[ $callback ] ?? null );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function dispatch( string $callback, mixed $request ): array {
		$handler = $this->handlers[ $callback ] ?? null;

		if ( is_callable( $handler ) ) {
			return $handler( $this->request_adapter->from_request( $request ) );
		}

		return $this->disabled_response( $callback, $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function disabled_response( string $callback, mixed $request ): array {
		unset( $request );

		return array(
			'status'                               => 'disabled',
			'status_code'                          => 501,
			'code'                                 => 'pos_payment_route_disabled',
			'callback'                             => $callback,
			'message'                              => 'POS/payment route registration is disabled until staging verification passes.',
			'route_registration_deferred'          => true,
			'route_connected_writes_deferred'      => true,
			'transaction_execution_deferred'       => true,
			'provider_capture_deferred'            => true,
			'provider_inventory_write_deferred'    => true,
			'webhook_registration_deferred'        => true,
			'woocommerce_gateway_capture_deferred' => true,
		);
	}
}
