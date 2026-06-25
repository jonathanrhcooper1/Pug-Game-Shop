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

	public function is_policy_configured(): bool {
		return true === $this->policy_summary()['configured'];
	}

	/**
	 * @return array<string, mixed>
	 */
	public function policy_summary(): array {
		$policy        = $this->policy();
		$scope_counts  = $this->scope_counts( $policy['allowed_scopes_by_mode'] ?? array() );
		$block_reasons = array();

		if ( array() === ( $policy['pairing_code_hashes'] ?? array() ) ) {
			$block_reasons[] = 'pairing_code_hashes_not_configured';
		}

		if ( array() === ( $policy['manager_ids'] ?? array() ) ) {
			$block_reasons[] = 'manager_policy_not_configured';
		}

		if ( array() === ( $policy['location_ids'] ?? array() ) ) {
			$block_reasons[] = 'location_policy_not_configured';
		}

		if ( 0 === $scope_counts['configured_mode_count'] ) {
			$block_reasons[] = 'scope_policy_not_configured';
		}

		if ( '' === ( $policy['expires_at_utc'] ?? '' ) ) {
			$block_reasons[] = 'pairing_code_expiry_not_configured';
		}

		return array(
			'configured'                  => array() === $block_reasons,
			'pairing_code_hash_count'     => count( $policy['pairing_code_hashes'] ?? array() ),
			'manager_count'               => count( $policy['manager_ids'] ?? array() ),
			'location_count'              => count( $policy['location_ids'] ?? array() ),
			'configured_mode_count'       => $scope_counts['configured_mode_count'],
			'configured_scope_count'      => $scope_counts['configured_scope_count'],
			'expires_at_utc_configured'   => '' !== ( $policy['expires_at_utc'] ?? '' ),
			'policy_configuration_issues' => $block_reasons,
		);
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

	/**
	 * @return array{configured_mode_count:int,configured_scope_count:int}
	 */
	private function scope_counts( mixed $scope_map ): array {
		if ( ! is_array( $scope_map ) ) {
			return array(
				'configured_mode_count'  => 0,
				'configured_scope_count' => 0,
			);
		}

		$configured_modes       = 0;
		$configured_scope_count = 0;

		foreach ( $scope_map as $scopes ) {
			if ( ! is_array( $scopes ) || array() === $scopes ) {
				continue;
			}

			++$configured_modes;
			$configured_scope_count += count( $scopes );
		}

		return array(
			'configured_mode_count'  => $configured_modes,
			'configured_scope_count' => $configured_scope_count,
		);
	}
}
