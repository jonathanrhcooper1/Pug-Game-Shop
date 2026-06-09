<?php
/**
 * Fail-closed offline REST controller scaffold.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class OfflineController {
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
	public function register_offline_device( mixed $request ): array {
		return $this->dispatch( 'register_offline_device', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function pull_offline_changes( mixed $request ): array {
		return $this->dispatch( 'pull_offline_changes', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function push_offline_operations( mixed $request ): array {
		return $this->dispatch( 'push_offline_operations', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function list_offline_conflicts( mixed $request ): array {
		return $this->dispatch( 'list_offline_conflicts', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function resolve_offline_conflict( mixed $request ): array {
		return $this->dispatch( 'resolve_offline_conflict', $request );
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
			'status'      => 'disabled',
			'status_code' => 501,
			'code'        => 'offline_route_disabled',
			'callback'    => $callback,
			'message'     => 'Offline route registration is disabled until route verification passes.',
		);
	}
}
