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

	/**
	 * Pairing authorization callback.
	 *
	 * @var callable|null
	 */
	private $pairing_authorizer;

	public function __construct(
		private ?OfflineDevicePairingRequestParser $pairing_parser = null,
		private ?OfflineDeviceRegistrationCredentialIssuer $credential_issuer = null,
		private ?OfflineDeviceRegistrationPlanner $registration_planner = null,
		?callable $repository_register = null,
		?callable $pairing_authorizer = null
	) {
		$this->pairing_parser       = $pairing_parser ?? new OfflineDevicePairingRequestParser();
		$this->credential_issuer    = $credential_issuer ?? new OfflineDeviceRegistrationCredentialIssuer();
		$this->registration_planner = $registration_planner ?? new OfflineDeviceRegistrationPlanner();
		$this->repository_register  = $repository_register;
		$this->pairing_authorizer   = $pairing_authorizer;
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

		$pairing_authorization = array();
		$authorization_errors  = $this->authorize_pairing_request(
			$parsed->request(),
			$payload,
			$pairing_authorization
		);

		if ( array() !== $authorization_errors ) {
			return OfflineDeviceRegistrationServiceResult::rejected(
				$authorization_errors,
				null,
				null,
				null,
				403,
				$pairing_authorization
			);
		}

		if ( ! is_callable( $this->repository_register ) ) {
			return OfflineDeviceRegistrationServiceResult::rejected(
				array( 'registration_repository_not_configured' ),
				null,
				null,
				null,
				503,
				$pairing_authorization
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
				array( 'registration_service_failed' ),
				null,
				null,
				null,
				500,
				$pairing_authorization
			);
		}

		if ( ! $repository_result instanceof OfflineDeviceRegistrationRepositoryResult ) {
			return OfflineDeviceRegistrationServiceResult::rejected(
				array( 'registration_repository_result_invalid' ),
				$credentials,
				$registration_plan,
				null,
				500,
				$pairing_authorization
			);
		}

		if ( $repository_result->is_inserted() ) {
			return OfflineDeviceRegistrationServiceResult::registered(
				$credentials,
				$registration_plan,
				$repository_result,
				$pairing_authorization
			);
		}

		return OfflineDeviceRegistrationServiceResult::rejected(
			$repository_result->errors(),
			$credentials,
			$registration_plan,
			$repository_result,
			500,
			$pairing_authorization
		);
	}

	/**
	 * @param array<string, mixed> $payload Request body payload.
	 * @param array<string, mixed> $pairing_authorization Secret-free authorization audit payload.
	 * @return list<string>
	 */
	private function authorize_pairing_request(
		OfflineDevicePairingRequest $request,
		array $payload,
		array &$pairing_authorization
	): array {
		if ( ! is_callable( $this->pairing_authorizer ) ) {
			return array();
		}

		$errors = array();

		try {
			$authorized = true === call_user_func(
				$this->pairing_authorizer,
				$request,
				array( 'body_param_count' => count( $payload ) )
			);
		} catch ( Throwable ) {
			return array( 'pairing_authorizer_failed' );
		}

		if (
			is_object( $this->pairing_authorizer )
			&& method_exists( $this->pairing_authorizer, 'last_result' )
		) {
			$result = $this->pairing_authorizer->last_result();

			if ( $result instanceof OfflineDevicePairingAuthorizationResult ) {
				$pairing_authorization = $result->audit_payload();
				$errors                = $result->errors();
			}
		}

		if ( $authorized ) {
			return array();
		}

		if ( array() !== $errors ) {
			return $errors;
		}

		return array( 'pairing_authorization_denied' );
	}
}
