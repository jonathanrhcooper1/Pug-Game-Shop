<?php
/**
 * Staged registered-device permission resolver factory.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use Throwable;

final class OfflineRegisteredDevicePermissionResolverFactory {
	/**
	 * @var callable|null
	 */
	private $database_provider;

	private bool $database_provider_failed = false;

	public function __construct( ?callable $database_provider = null ) {
		$this->database_provider = $database_provider;
	}

	public function is_configured(): bool {
		return true === $this->readiness_summary()['configured'];
	}

	public function resolver(): ?OfflineRegisteredDevicePermissionResolver {
		$database = $this->database();

		if ( null === $database ) {
			return null;
		}

		return new OfflineRegisteredDevicePermissionResolver(
			new OfflineRegisteredDeviceRepository( $database ),
			null,
			new OfflineDeviceSessionUpdateRepository( $database )
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function readiness_summary(): array {
		$database_ready = null !== $this->database();
		$issues         = array();

		if ( ! $database_ready ) {
			$issues[] = $this->database_provider_failed
				? 'database_provider_failed'
				: 'database_not_configured';
		}

		return array(
			'configured'                              => $database_ready,
			'database_configured'                     => $database_ready,
			'registered_device_repository_configured' => $database_ready,
			'session_update_repository_configured'    => $database_ready,
			'permission_resolver_configured'          => $database_ready,
			'configuration_issues'                    => array_values( array_unique( $issues ) ),
		);
	}

	private function database(): ?\wpdb {
		$this->database_provider_failed = false;

		try {
			if ( is_callable( $this->database_provider ) ) {
				$database = ( $this->database_provider )();
			} else {
				if ( ! defined( 'ABSPATH' ) ) {
					return null;
				}

				global $wpdb;
				$database = $wpdb ?? null;
			}
		} catch ( Throwable ) {
			$this->database_provider_failed = true;

			return null;
		}

		if ( ! class_exists( 'wpdb' ) || ! $database instanceof \wpdb ) {
			return null;
		}

		return $database;
	}
}
