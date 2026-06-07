<?php
/**
 * Planned permission callback factory for inventory REST route contracts.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class InventoryRoutePermissionCallbackFactory {
	/**
	 * @var array<string, string>
	 */
	private const CAPABILITY_PERMISSIONS = array(
		'view_inventory'           => 'view_inventory',
		'create_inventory'         => 'create_inventory',
		'edit_inventory'           => 'edit_inventory',
		'edit_prices'              => 'edit_prices',
		'view_reports'             => 'view_reports',
		'manage_inventory_imports' => 'manage_settings',
	);

	/**
	 * @var array<string, string>
	 */
	private const PUBLIC_READ_PERMISSIONS = array(
		'public_visibility_or_view_inventory' => 'view_inventory',
		'public_filtered_response'            => 'view_inventory',
		'public_rate_limited'                 => 'view_inventory',
		'public_or_staff_inventory_fields'    => 'view_inventory',
	);

	private mixed $capability_checker;
	private bool $public_read_routes_enabled;
	private ?InventoryPublicReadRateLimitPolicy $public_read_rate_limit_policy;

	/**
	 * @param callable(string): bool|null $capability_checker Capability checker.
	 */
	public function __construct(
		?callable $capability_checker = null,
		bool $public_read_routes_enabled = false,
		?InventoryPublicReadRateLimitPolicy $public_read_rate_limit_policy = null
	) {
		$this->capability_checker            = $capability_checker;
		$this->public_read_routes_enabled    = $public_read_routes_enabled;
		$this->public_read_rate_limit_policy = $public_read_rate_limit_policy;
	}

	/**
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @return array<string, callable>
	 */
	public function callbacks_for_contracts( ?array $route_contracts = null ): array {
		$callbacks       = array();
		$route_contracts = $route_contracts ?? InventoryRouteContracts::route_contracts();

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
		$permission = self::route_permission( $route_contract );

		if ( isset( self::PUBLIC_READ_PERMISSIONS[ $permission ] ) ) {
			$callback = new InventoryPublicReadPermissionCallbackAdapter(
				$permission,
				$this->public_read_routes_enabled,
				$this->capability_checker,
				self::PUBLIC_READ_PERMISSIONS[ $permission ],
				$this->public_read_rate_limit_policy
			);

			return $callback->is_configured() ? $callback : null;
		}

		if ( ! isset( self::CAPABILITY_PERMISSIONS[ $permission ] ) ) {
			return null;
		}

		$callback = new InventoryCapabilityPermissionCallbackAdapter(
			$permission,
			self::CAPABILITY_PERMISSIONS[ $permission ],
			$this->capability_checker
		);

		return $callback->is_configured() ? $callback : null;
	}

	public function public_rate_limiter_configured(): bool {
		return null !== $this->public_read_rate_limit_policy
			&& $this->public_read_rate_limit_policy->is_configured();
	}

	/**
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @return array<string, string>
	 */
	public static function capability_map( ?array $route_contracts = null ): array {
		$map             = array();
		$route_contracts = $route_contracts ?? InventoryRouteContracts::route_contracts();

		foreach ( $route_contracts as $route_contract ) {
			$permission = self::route_permission( $route_contract );

			if ( isset( self::CAPABILITY_PERMISSIONS[ $permission ] ) ) {
				$map[ self::route_key( $route_contract ) ] = self::CAPABILITY_PERMISSIONS[ $permission ];
			}
		}

		return $map;
	}

	/**
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @return list<string>
	 */
	public static function public_read_route_keys( ?array $route_contracts = null ): array {
		$route_keys      = array();
		$route_contracts = $route_contracts ?? InventoryRouteContracts::route_contracts();

		foreach ( $route_contracts as $route_contract ) {
			if ( isset( self::PUBLIC_READ_PERMISSIONS[ self::route_permission( $route_contract ) ] ) ) {
				$route_keys[] = self::route_key( $route_contract );
			}
		}

		return $route_keys;
	}

	/**
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @return list<string>
	 */
	public static function public_rate_limited_route_keys( ?array $route_contracts = null ): array {
		$route_keys      = array();
		$route_contracts = $route_contracts ?? InventoryRouteContracts::route_contracts();

		foreach ( $route_contracts as $route_contract ) {
			if ( 'public_rate_limited' === self::route_permission( $route_contract ) ) {
				$route_keys[] = self::route_key( $route_contract );
			}
		}

		return $route_keys;
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
}
