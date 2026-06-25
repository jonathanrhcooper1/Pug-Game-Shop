<?php
/**
 * Planned permission callback factory for POS/payment REST route contracts.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class PosPaymentRoutePermissionCallbackFactory {
	/**
	 * @var array<string, true>
	 */
	private const CAPABILITY_PERMISSIONS = array(
		'manage_pos'        => true,
		'resolve_conflicts' => true,
		'manage_settings'   => true,
	);

	private mixed $capability_checker;
	private mixed $webhook_signature_verifier;

	/**
	 * @param callable(string): bool|null $capability_checker Capability checker.
	 * @param callable(mixed): bool|null  $webhook_signature_verifier Webhook signature verifier.
	 */
	public function __construct(
		?callable $capability_checker = null,
		?callable $webhook_signature_verifier = null
	) {
		$this->capability_checker         = $capability_checker;
		$this->webhook_signature_verifier = $webhook_signature_verifier;
	}

	/**
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @return array<string, callable>
	 */
	public function callbacks_for_contracts( ?array $route_contracts = null ): array {
		$callbacks       = array();
		$route_contracts = $route_contracts ?? PosPaymentRouteContracts::route_contracts();

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

		if ( 'signed_provider_webhook' === $permission ) {
			$callback = new PosPaymentWebhookPermissionCallbackAdapter( $this->webhook_signature_verifier );

			return $callback->is_configured() ? $callback : null;
		}

		if ( ! isset( self::CAPABILITY_PERMISSIONS[ $permission ] ) ) {
			return null;
		}

		$callback = new PosPaymentCapabilityPermissionCallbackAdapter( $permission, $this->capability_checker );

		return $callback->is_configured() ? $callback : null;
	}

	/**
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @return array<string, string>
	 */
	public static function capability_map( ?array $route_contracts = null ): array {
		$map             = array();
		$route_contracts = $route_contracts ?? PosPaymentRouteContracts::route_contracts();

		foreach ( $route_contracts as $route_contract ) {
			$permission = self::route_permission( $route_contract );

			if ( isset( self::CAPABILITY_PERMISSIONS[ $permission ] ) ) {
				$map[ self::route_key( $route_contract ) ] = $permission;
			}
		}

		return $map;
	}

	/**
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @return list<string>
	 */
	public static function webhook_route_keys( ?array $route_contracts = null ): array {
		$route_keys      = array();
		$route_contracts = $route_contracts ?? PosPaymentRouteContracts::route_contracts();

		foreach ( $route_contracts as $route_contract ) {
			if ( 'signed_provider_webhook' === self::route_permission( $route_contract ) ) {
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
