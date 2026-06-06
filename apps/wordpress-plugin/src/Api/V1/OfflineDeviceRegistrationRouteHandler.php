<?php
/**
 * Offline device registration route handler adapter.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Offline\OfflineDeviceRegistrationService;
use TCGStorePlatform\Offline\OfflineDeviceRegistrationServiceResult;

final class OfflineDeviceRegistrationRouteHandler {
	/**
	 * @var array<string, mixed>|null
	 */
	private ?array $last_audit_payload = null;

	public function __construct( private OfflineDeviceRegistrationService $service ) {
	}

	/**
	 * @return array<string, callable(OfflineRestRequestData): array<string, mixed>>
	 */
	public function handlers(): array {
		return array(
			'register_offline_device' => fn ( OfflineRestRequestData $data ): array => $this->register( $data ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function register( OfflineRestRequestData $data ): array {
		$result                   = $this->service->register( $data->body_params() );
		$this->last_audit_payload = $result->audit_payload();

		$response = array(
			'status'      => $result->status(),
			'status_code' => $result->status_code(),
			'code'        => $this->response_code( $result ),
			'callback'    => 'register_offline_device',
		);

		if ( $result->is_registered() ) {
			$response['data'] = $result->response_payload();
		}

		if ( array() !== $result->errors() ) {
			$response['errors'] = $result->errors();
		}

		return $response;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function last_audit_payload(): array {
		return $this->last_audit_payload ?? array();
	}

	private function response_code( OfflineDeviceRegistrationServiceResult $result ): string {
		if ( $result->is_registered() ) {
			return 'offline_device_registered';
		}

		if ( $result->is_invalid() ) {
			return 'offline_device_registration_invalid';
		}

		return 'offline_device_registration_rejected';
	}
}
