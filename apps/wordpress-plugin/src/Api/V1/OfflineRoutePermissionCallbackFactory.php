<?php
/**
 * Planned permission callback factory for offline REST route contracts.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Offline\OfflineDevicePairingPermissionCallbackAdapter;
use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionCallbackAdapter;
use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolver;

final class OfflineRoutePermissionCallbackFactory {
	private ?OfflineRegisteredDevicePermissionResolver $registered_device_resolver;
	private ?OfflineDevicePairingPermissionCallbackAdapter $pairing_callback;
	private mixed $manager_conflict_permission_callback;
	private mixed $server_time_provider;

	/**
	 * @param callable(): string|null $server_time_provider Optional UTC clock.
	 * @param callable(mixed=): bool|null $manager_conflict_permission_callback Optional manager permission callback.
	 */
	public function __construct(
		?OfflineRegisteredDevicePermissionResolver $registered_device_resolver = null,
		?callable $server_time_provider = null,
		?OfflineDevicePairingPermissionCallbackAdapter $pairing_callback = null,
		?callable $manager_conflict_permission_callback = null
	) {
		$this->registered_device_resolver           = $registered_device_resolver;
		$this->server_time_provider                 = $server_time_provider;
		$this->pairing_callback                     = $pairing_callback;
		$this->manager_conflict_permission_callback = $manager_conflict_permission_callback;
	}

	/**
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @return array<string, callable>
	 */
	public function callbacks_for_contracts( ?array $route_contracts = null ): array {
		$callbacks       = array();
		$route_contracts = $route_contracts ?? OfflineRouteContracts::route_contracts();

		foreach ( $route_contracts as $route_contract ) {
			$callback = $this->callback_for_route_contract( $route_contract );

			if ( null === $callback ) {
				continue;
			}

			$callbacks[ self::route_key( $route_contract ) ] = $callback;
		}

		return $callbacks;
	}

	/**
	 * @param array<string, mixed> $route_contract Planned route contract.
	 */
	public function callback_for_route_contract( array $route_contract ): ?callable {
		if ( 'pairing_code_plus_manager' === self::route_permission( $route_contract ) ) {
			if ( null === $this->pairing_callback || ! $this->pairing_callback->is_configured() ) {
				return null;
			}

			return $this->pairing_callback;
		}

		if ( 'resolve_conflicts' === self::route_permission( $route_contract ) ) {
			return is_callable( $this->manager_conflict_permission_callback )
				? $this->manager_conflict_permission_callback
				: null;
		}

		if ( 'registered_device' !== self::route_permission( $route_contract ) ) {
			return null;
		}

		if ( null === $this->registered_device_resolver ) {
			return null;
		}

		$required_scope = self::route_required_scope( $route_contract );

		if ( '' === $required_scope ) {
			return null;
		}

		return new OfflineRegisteredDevicePermissionCallbackAdapter(
			$this->registered_device_resolver,
			$required_scope,
			$this->server_time_provider
		);
	}

	/**
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @return array<string, string>
	 */
	public static function registered_device_scope_map( ?array $route_contracts = null ): array {
		$map             = array();
		$route_contracts = $route_contracts ?? OfflineRouteContracts::route_contracts();

		foreach ( $route_contracts as $route_contract ) {
			if ( 'registered_device' !== self::route_permission( $route_contract ) ) {
				continue;
			}

			$required_scope = self::route_required_scope( $route_contract );

			if ( '' === $required_scope ) {
				continue;
			}

			$map[ self::route_key( $route_contract ) ] = $required_scope;
		}

		return $map;
	}

	/**
	 * @param array<string, mixed> $route_contract Planned route contract.
	 */
	public static function route_key( array $route_contract ): string {
		return self::route_method( $route_contract ) . ' ' . self::route_path( $route_contract );
	}

	/**
	 * @param array<string, mixed> $route_contract Planned route contract.
	 */
	private static function route_method( array $route_contract ): string {
		return strtoupper( trim( (string) ( $route_contract['method'] ?? '' ) ) );
	}

	/**
	 * @param array<string, mixed> $route_contract Planned route contract.
	 */
	private static function route_path( array $route_contract ): string {
		return trim( (string) ( $route_contract['path'] ?? '' ) );
	}

	/**
	 * @param array<string, mixed> $route_contract Planned route contract.
	 */
	private static function route_permission( array $route_contract ): string {
		return strtolower( trim( (string) ( $route_contract['permission'] ?? '' ) ) );
	}

	/**
	 * @param array<string, mixed> $route_contract Planned route contract.
	 */
	private static function route_required_scope( array $route_contract ): string {
		return strtolower( trim( (string) ( $route_contract['required_scope'] ?? '' ) ) );
	}
}
