<?php
/**
 * Settings-backed offline device pairing authorizer factory.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use TCGStorePlatform\Settings\OfflinePairingAuthorizationSettings;
use TCGStorePlatform\Settings\Settings;
use Throwable;

final class OfflineDevicePairingAuthorizerFactory {
	private mixed $settings_provider;
	private mixed $server_time_provider;

	/**
	 * @param callable(): array<string, mixed>|null $settings_provider Settings provider.
	 * @param callable(): string|null               $server_time_provider Optional UTC clock.
	 */
	public function __construct(
		?callable $settings_provider = null,
		?callable $server_time_provider = null
	) {
		$this->settings_provider    = $settings_provider ?? static fn (): array => Settings::all();
		$this->server_time_provider = $server_time_provider;
	}

	public function authorizer(): OfflineDevicePairingAuthorizer {
		return new OfflineDevicePairingAuthorizer(
			$this->policy(),
			is_callable( $this->server_time_provider ) ? $this->server_time_provider : null
		);
	}

	public function permission_callback(
		?OfflineDevicePairingRequestParser $parser = null
	): OfflineDevicePairingPermissionCallbackAdapter {
		return new OfflineDevicePairingPermissionCallbackAdapter( $parser, $this->authorizer() );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function policy(): array {
		return OfflinePairingAuthorizationSettings::policy( $this->settings() );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function settings(): array {
		if ( ! is_callable( $this->settings_provider ) ) {
			return array();
		}

		try {
			$settings = call_user_func( $this->settings_provider );
		} catch ( Throwable ) {
			return array();
		}

		return is_array( $settings ) ? $settings : array();
	}
}
