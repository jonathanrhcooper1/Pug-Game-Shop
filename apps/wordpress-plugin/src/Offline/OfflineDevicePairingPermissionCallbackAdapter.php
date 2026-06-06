<?php
/**
 * Planned REST permission callback adapter for offline device pairing.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use Throwable;

final class OfflineDevicePairingPermissionCallbackAdapter {
	private OfflineDevicePairingRequestParser $parser;
	private mixed $authorizer;

	/**
	 * @var array<string, mixed>|null
	 */
	private ?array $last_audit_payload = null;

	/**
	 * @param callable(OfflineDevicePairingRequest, array<string, mixed>): bool|null $authorizer Pairing authorizer.
	 */
	public function __construct(
		?OfflineDevicePairingRequestParser $parser = null,
		?callable $authorizer = null
	) {
		$this->parser     = $parser ?? new OfflineDevicePairingRequestParser();
		$this->authorizer = $authorizer;
	}

	public function __invoke( mixed $request ): bool {
		return $this->authorize( $request );
	}

	public function authorize( mixed $request ): bool {
		$body   = $this->body_from_request( $request );
		$result = $this->parser->parse( $body );

		if ( ! $result->is_valid() || null === $result->request() ) {
			$this->last_audit_payload = $this->audit_payload( 'invalid', $result->errors(), null );

			return false;
		}

		$pairing_request = $result->request();

		if ( ! is_callable( $this->authorizer ) ) {
			$this->last_audit_payload = $this->audit_payload(
				'denied',
				array( 'pairing_authorizer_not_configured' ),
				$pairing_request
			);

			return false;
		}

		$errors = array();

		try {
			$authorized = true === call_user_func(
				$this->authorizer,
				$pairing_request,
				$this->request_context( $body )
			);
		} catch ( Throwable ) {
			$authorized = false;
			$errors[]   = 'pairing_authorizer_failed';
		}

		if ( ! $authorized && array() === $errors ) {
			$errors[] = 'pairing_authorization_denied';
		}

		$this->last_audit_payload = $this->audit_payload(
			$authorized ? 'authorized' : 'denied',
			$errors,
			$pairing_request
		);

		return $authorized;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function last_audit_payload(): array {
		return $this->last_audit_payload ?? array();
	}

	/**
	 * @return array<string, mixed>
	 */
	private function body_from_request( mixed $request ): array {
		if ( is_array( $request ) ) {
			return $this->body_from_array( $request );
		}

		if ( is_object( $request ) && method_exists( $request, 'get_json_params' ) ) {
			$body = $request->get_json_params();

			return is_array( $body ) ? $body : array();
		}

		if ( is_object( $request ) && method_exists( $request, 'get_body_params' ) ) {
			$body = $request->get_body_params();

			return is_array( $body ) ? $body : array();
		}

		return array();
	}

	/**
	 * @param array<string, mixed> $request Request or body payload.
	 * @return array<string, mixed>
	 */
	private function body_from_array( array $request ): array {
		if ( isset( $request['body'] ) && is_array( $request['body'] ) ) {
			return $request['body'];
		}

		if ( isset( $request['body_params'] ) && is_array( $request['body_params'] ) ) {
			return $request['body_params'];
		}

		return $request;
	}

	/**
	 * @param array<string, mixed> $body Request body.
	 * @return array<string, mixed>
	 */
	private function request_context( array $body ): array {
		return array(
			'body_param_count' => count( $body ),
		);
	}

	/**
	 * @param list<string> $errors Authorization errors.
	 * @return array<string, mixed>
	 */
	private function audit_payload(
		string $status,
		array $errors,
		?OfflineDevicePairingRequest $request
	): array {
		$payload = array(
			'action'                => 'offline_device_pairing_permission_callback',
			'status'                => $status,
			'errors'                => array_values( array_unique( $errors ) ),
			'authorizer_configured' => is_callable( $this->authorizer ),
		);

		if ( null === $request ) {
			return $payload;
		}

		$payload['pairing_code_fingerprint'] = substr( hash( 'sha256', $request->pairing_code() ), 0, 12 );
		$payload['device_mode']              = $request->device_mode();
		$payload['location_id']              = $request->location_id();
		$payload['manager_id']               = $request->manager_id();
		$payload['app_version']              = $request->app_version();
		$payload['platform']                 = $request->platform();
		$payload['requested_scopes']         = $request->requested_scopes();
		$payload['schema_version']           = $request->schema_version();

		return $payload;
	}
}
