<?php
/**
 * Fail-closed offline REST controller scaffold.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class OfflineController {
	/**
	 * @return array<string, mixed>
	 */
	public function register_offline_device( mixed $request ): array {
		return $this->disabled_response( 'register_offline_device', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function pull_offline_changes( mixed $request ): array {
		return $this->disabled_response( 'pull_offline_changes', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function push_offline_operations( mixed $request ): array {
		return $this->disabled_response( 'push_offline_operations', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function list_offline_conflicts( mixed $request ): array {
		return $this->disabled_response( 'list_offline_conflicts', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function resolve_offline_conflict( mixed $request ): array {
		return $this->disabled_response( 'resolve_offline_conflict', $request );
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
			'message'     => 'Offline route registration is disabled until staging verification passes.',
		);
	}
}
