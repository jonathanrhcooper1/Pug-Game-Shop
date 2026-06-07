<?php
/**
 * Staged offline device registration route handler factory.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Offline\OfflineDevicePairingAuthorizerFactory;
use TCGStorePlatform\Offline\OfflineDeviceRegistrationRepository;
use TCGStorePlatform\Offline\OfflineDeviceRegistrationService;
use Throwable;

final class OfflineDeviceRegistrationRouteHandlerFactory {
	/**
	 * @var callable|null
	 */
	private $database_provider;

	private bool $database_provider_failed = false;

	public function __construct(
		?callable $database_provider = null,
		private ?OfflineDevicePairingAuthorizerFactory $authorizer_factory = null
	) {
		$this->database_provider = $database_provider;
	}

	public function is_configured(): bool {
		return true === $this->readiness_summary()['configured'];
	}

	public function handler(): ?OfflineDeviceRegistrationRouteHandler {
		if ( ! $this->is_configured() || null === $this->authorizer_factory ) {
			return null;
		}

		$database = $this->database();

		if ( null === $database ) {
			return null;
		}

		$repository = new OfflineDeviceRegistrationRepository( $database );

		return new OfflineDeviceRegistrationRouteHandler(
			new OfflineDeviceRegistrationService(
				null,
				null,
				null,
				array( $repository, 'register' ),
				$this->authorizer_factory->authorizer()
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function readiness_summary(): array {
		$database       = $this->database();
		$database_ready = null !== $database;
		$policy_summary = $this->policy_summary();
		$policy_ready   = true === ( $policy_summary['configured'] ?? false );
		$issues         = array();

		if ( ! $database_ready ) {
			$issues[] = $this->database_provider_failed
				? 'database_provider_failed'
				: 'database_not_configured';
		}

		if ( null === $this->authorizer_factory ) {
			$issues[] = 'pairing_policy_provider_not_configured';
		} elseif ( ! $policy_ready ) {
			$issues[] = 'pairing_policy_not_configured';
		}

		return array(
			'configured'                    => $database_ready && $policy_ready,
			'database_configured'           => $database_ready,
			'repository_configured'         => $database_ready,
			'pairing_policy_configured'     => $policy_ready,
			'pairing_authorizer_configured' => $policy_ready,
			'configuration_issues'          => array_values( array_unique( $issues ) ),
			'policy_summary'                => $policy_summary,
		);
	}

	private function database(): ?\wpdb {
		$this->database_provider_failed = false;

		try {
			if ( is_callable( $this->database_provider ) ) {
				$database = ( $this->database_provider )();
			} else {
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

	/**
	 * @return array<string, mixed>
	 */
	private function policy_summary(): array {
		if ( null === $this->authorizer_factory ) {
			return array(
				'configured'                  => false,
				'pairing_code_hash_count'     => 0,
				'manager_count'               => 0,
				'location_count'              => 0,
				'configured_mode_count'       => 0,
				'configured_scope_count'      => 0,
				'expires_at_utc_configured'   => false,
				'policy_configuration_issues' => array( 'pairing_policy_provider_not_configured' ),
			);
		}

		return $this->authorizer_factory->policy_summary();
	}
}
