<?php
/**
 * Offline device registration orchestration service.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use Throwable;

final class OfflineDeviceRegistrationService {
	/**
	 * Repository registration callback.
	 *
	 * @var callable|null
	 */
	private $repository_register;

	public function __construct(
		private ?OfflineDevicePairingRequestParser $pairing_parser = null,
		private ?OfflineDeviceRegistrationCredentialIssuer $credential_issuer = null,
		private ?OfflineDeviceRegistrationPlanner $registration_planner = null,
		?callable $repository_register = null
	) {
		$this->pairing_parser       = $pairing_parser ?? new OfflineDevicePairingRequestParser();
		$this->credential_issuer    = $credential_issuer ?? new OfflineDeviceRegistrationCredentialIssuer();
		$this->registration_planner = $registration_planner ?? new OfflineDeviceRegistrationPlanner();
		$this->repository_register  = $repository_register;
	}

	/**
	 * @param array<string, mixed> $payload Request body payload.
	 */
	public function register(
		array $payload,
		string $issued_at_utc = '',
		?int $token_ttl_seconds = null
	): OfflineDeviceRegistrationServiceResult {
		$parsed = $this->pairing_parser->parse( $payload );

		if ( ! $parsed->is_valid() || null === $parsed->request() ) {
			return OfflineDeviceRegistrationServiceResult::invalid( $parsed->errors() );
		}

		if ( ! is_callable( $this->repository_register ) ) {
			return OfflineDeviceRegistrationServiceResult::rejected(
				array( 'registration_repository_not_configured' ),
				null,
				null,
				null,
				503
			);
		}

		try {
			$credentials       = $this->credential_issuer->issue( $issued_at_utc, $token_ttl_seconds );
			$registration_plan = $this->registration_planner->plan(
				$parsed->request(),
				$credentials->device_id(),
				$credentials->device_token(),
				$credentials->device_token_hash(),
				$credentials->issued_at_utc(),
				$credentials->token_expires_at_utc()
			);
			$repository_result = ( $this->repository_register )( $registration_plan );
		} catch ( Throwable ) {
			return OfflineDeviceRegistrationServiceResult::rejected(
				array( 'registration_service_failed' )
			);
		}

		if ( ! $repository_result instanceof OfflineDeviceRegistrationRepositoryResult ) {
			return OfflineDeviceRegistrationServiceResult::rejected(
				array( 'registration_repository_result_invalid' ),
				$credentials,
				$registration_plan
			);
		}

		if ( $repository_result->is_inserted() ) {
			return OfflineDeviceRegistrationServiceResult::registered(
				$credentials,
				$registration_plan,
				$repository_result
			);
		}

		return OfflineDeviceRegistrationServiceResult::rejected(
			$repository_result->errors(),
			$credentials,
			$registration_plan,
			$repository_result,
			500
		);
	}
}
