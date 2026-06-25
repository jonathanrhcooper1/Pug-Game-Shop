<?php
/**
 * Parsed offline device pairing request.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineDevicePairingRequest {
	/**
	 * @param array<string, bool> $capabilities Device hardware capabilities.
	 * @param list<string>        $requested_scopes Requested device scopes.
	 */
	public function __construct(
		private string $pairing_code,
		private string $installation_id,
		private string $device_label,
		private string $device_mode,
		private int $location_id,
		private int $manager_id,
		private string $app_version,
		private string $platform,
		private array $capabilities,
		private array $requested_scopes,
		private int $schema_version
	) {
		$this->pairing_code    = strtoupper( trim( $pairing_code ) );
		$this->installation_id = trim( $installation_id );
		$this->device_label    = trim( $device_label );
		$this->device_mode     = strtolower( trim( $device_mode ) );
		$this->app_version     = trim( $app_version );
		$this->platform        = strtolower( trim( $platform ) );
	}

	public function pairing_code(): string {
		return $this->pairing_code;
	}

	public function installation_id(): string {
		return $this->installation_id;
	}

	public function device_label(): string {
		return $this->device_label;
	}

	public function device_mode(): string {
		return $this->device_mode;
	}

	public function location_id(): int {
		return $this->location_id;
	}

	public function manager_id(): int {
		return $this->manager_id;
	}

	public function app_version(): string {
		return $this->app_version;
	}

	public function platform(): string {
		return $this->platform;
	}

	/**
	 * @return array<string, bool>
	 */
	public function capabilities(): array {
		return $this->capabilities;
	}

	/**
	 * @return list<string>
	 */
	public function requested_scopes(): array {
		return $this->requested_scopes;
	}

	public function schema_version(): int {
		return $this->schema_version;
	}
}
