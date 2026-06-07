<?php
/**
 * Plan-only offline device pairing authorizer.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use DateTimeImmutable;
use Throwable;

final class OfflineDevicePairingAuthorizer {
	private const SUPPORTED_SCOPES = array(
		'offline_pull',
		'offline_push',
		'inventory',
		'kiosk',
		'customer_credit',
		'events',
		'buylist',
		'conflicts',
	);

	private mixed $server_time_provider;
	private ?OfflineDevicePairingAuthorizationResult $last_result = null;

	/**
	 * @param array<string, mixed> $policy Pairing authorization policy.
	 * @param callable(): string|null $server_time_provider Optional UTC clock.
	 */
	public function __construct(
		private array $policy,
		?callable $server_time_provider = null
	) {
		$this->server_time_provider = $server_time_provider;
	}

	/**
	 * @param array<string, mixed> $context Request context.
	 */
	public function __invoke( OfflineDevicePairingRequest $request, array $context = array() ): bool {
		$this->last_result = $this->authorize( $request, $context );

		return $this->last_result->is_authorized();
	}

	/**
	 * @param array<string, mixed> $context Request context.
	 */
	public function authorize(
		OfflineDevicePairingRequest $request,
		array $context = array()
	): OfflineDevicePairingAuthorizationResult {
		$errors              = array();
		$denied_scopes       = array();
		$pairing_code_hash   = hash( 'sha256', $request->pairing_code() );
		$pairing_code_hashes = $this->pairing_code_hashes( $errors );
		$manager_ids         = $this->positive_int_list( $this->policy['manager_ids'] ?? null );
		$location_ids        = $this->positive_int_list( $this->policy['location_ids'] ?? null );
		$allowed_scopes      = $this->allowed_scopes_for_mode( $request->device_mode(), $errors );
		$expires_at_utc      = trim( (string) ( $this->policy['expires_at_utc'] ?? '' ) );
		$now_utc             = $this->now_utc( $errors );

		if ( array() === $pairing_code_hashes ) {
			$errors[] = 'pairing_code_policy_not_configured';
		} elseif ( ! $this->hash_is_allowed( $pairing_code_hash, $pairing_code_hashes ) ) {
			$errors[] = 'pairing_code_denied';
		}

		if ( array() === $manager_ids ) {
			$errors[] = 'manager_policy_not_configured';
		} elseif ( ! in_array( $request->manager_id(), $manager_ids, true ) ) {
			$errors[] = 'manager_not_allowed';
		}

		if ( array() === $location_ids ) {
			$errors[] = 'location_policy_not_configured';
		} elseif ( ! in_array( $request->location_id(), $location_ids, true ) ) {
			$errors[] = 'location_not_allowed';
		}

		foreach ( $request->requested_scopes() as $scope ) {
			if ( ! in_array( $scope, $allowed_scopes, true ) ) {
				$denied_scopes[] = $scope;
			}
		}

		if ( array() !== $denied_scopes ) {
			$errors[] = 'requested_scope_not_allowed';
		}

		if ( '' === $expires_at_utc ) {
			$errors[] = 'pairing_code_expiry_not_configured';
		} elseif ( ! $this->is_utc_timestamp( $expires_at_utc ) ) {
			$errors[] = 'pairing_code_expiry_invalid';
		} elseif (
			$this->is_utc_timestamp( $now_utc )
			&& ! $this->pairing_code_is_active( $now_utc, $expires_at_utc )
		) {
			$errors[] = 'pairing_code_expired';
		}

		$audit_payload = $this->audit_payload(
			$request,
			$pairing_code_hash,
			$pairing_code_hashes,
			$manager_ids,
			$location_ids,
			$allowed_scopes,
			array_values( array_unique( $denied_scopes ) ),
			$expires_at_utc,
			$now_utc,
			$context
		);

		$result = array() === $errors
			? OfflineDevicePairingAuthorizationResult::authorized( $audit_payload )
			: OfflineDevicePairingAuthorizationResult::denied( $errors, $audit_payload );

		$this->last_result = $result;

		return $result;
	}

	public function last_result(): ?OfflineDevicePairingAuthorizationResult {
		return $this->last_result;
	}

	/**
	 * @param list<string> $errors Authorization errors.
	 * @return list<string>
	 */
	private function pairing_code_hashes( array &$errors ): array {
		$hashes = $this->policy['pairing_code_hashes'] ?? array();

		if ( ! is_array( $hashes ) ) {
			$errors[] = 'pairing_code_policy_invalid';

			return array();
		}

		return array_values(
			array_filter(
				array_map(
					static function ( mixed $hash ): string {
						$hash = strtolower( trim( (string) $hash ) );

						return 1 === preg_match( '/^[a-f0-9]{64}$/', $hash ) ? $hash : '';
					},
					$hashes
				),
				static fn ( string $hash ): bool => '' !== $hash
			)
		);
	}

	/**
	 * @return list<int>
	 */
	private function positive_int_list( mixed $values ): array {
		if ( ! is_array( $values ) ) {
			return array();
		}

		$parsed = array();

		foreach ( array_values( $values ) as $value ) {
			if ( is_int( $value ) && $value > 0 ) {
				$parsed[] = $value;
				continue;
			}

			if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
				$parsed[] = (int) $value;
			}
		}

		return array_values( array_unique( $parsed ) );
	}

	/**
	 * @param list<string> $errors Authorization errors.
	 * @return list<string>
	 */
	private function allowed_scopes_for_mode( string $device_mode, array &$errors ): array {
		$scope_map = $this->policy['allowed_scopes_by_mode'] ?? array();

		if (
			! is_array( $scope_map )
			|| ! isset( $scope_map[ $device_mode ] )
			|| ! is_array( $scope_map[ $device_mode ] )
		) {
			$errors[] = 'scope_policy_not_configured';

			return array();
		}

		$allowed_scopes = array();

		foreach ( array_values( $scope_map[ $device_mode ] ) as $scope ) {
			$scope = strtolower( trim( (string) $scope ) );

			if (
				in_array( $scope, self::SUPPORTED_SCOPES, true )
				&& ! in_array( $scope, $allowed_scopes, true )
			) {
				$allowed_scopes[] = $scope;
			}
		}

		if ( array() === $allowed_scopes ) {
			$errors[] = 'scope_policy_not_configured';
		}

		return $allowed_scopes;
	}

	/**
	 * @param list<string> $errors Authorization errors.
	 */
	private function now_utc( array &$errors ): string {
		if ( ! is_callable( $this->server_time_provider ) ) {
			return gmdate( 'Y-m-d\TH:i:s\Z' );
		}

		try {
			return trim( (string) call_user_func( $this->server_time_provider ) );
		} catch ( Throwable ) {
			$errors[] = 'server_time_provider_failed';

			return '';
		}
	}

	/**
	 * @param list<string> $allowed_hashes Allowed SHA-256 pairing-code hashes.
	 */
	private function hash_is_allowed( string $pairing_code_hash, array $allowed_hashes ): bool {
		foreach ( $allowed_hashes as $allowed_hash ) {
			if ( hash_equals( $allowed_hash, $pairing_code_hash ) ) {
				return true;
			}
		}

		return false;
	}

	private function pairing_code_is_active( string $now_utc, string $expires_at_utc ): bool {
		$now        = new DateTimeImmutable( $now_utc );
		$expires_at = new DateTimeImmutable( $expires_at_utc );

		return $expires_at > $now;
	}

	/**
	 * @param list<string> $pairing_code_hashes Allowed pairing-code hashes.
	 * @param list<int> $manager_ids Allowed managers.
	 * @param list<int> $location_ids Allowed locations.
	 * @param list<string> $allowed_scopes Allowed scopes for mode.
	 * @param list<string> $denied_scopes Denied requested scopes.
	 * @param array<string, mixed> $context Request context.
	 * @return array<string, mixed>
	 */
	private function audit_payload(
		OfflineDevicePairingRequest $request,
		string $pairing_code_hash,
		array $pairing_code_hashes,
		array $manager_ids,
		array $location_ids,
		array $allowed_scopes,
		array $denied_scopes,
		string $expires_at_utc,
		string $now_utc,
		array $context
	): array {
		return array(
			'action'                   => 'offline_device_pairing_authorization',
			'pairing_code_fingerprint' => substr( $pairing_code_hash, 0, 12 ),
			'device_mode'              => $request->device_mode(),
			'location_id'              => $request->location_id(),
			'manager_id'               => $request->manager_id(),
			'requested_scopes'         => $request->requested_scopes(),
			'denied_scopes'            => $denied_scopes,
			'policy'                   => array(
				'pairing_code_hash_count' => count( $pairing_code_hashes ),
				'manager_count'           => count( $manager_ids ),
				'location_count'          => count( $location_ids ),
				'allowed_scope_count'     => count( $allowed_scopes ),
				'expires_at_utc'          => $this->is_utc_timestamp( $expires_at_utc ) ? $expires_at_utc : '',
			),
			'now_utc'                  => $now_utc,
			'request_context'          => array(
				'body_param_count' => (int) ( $context['body_param_count'] ?? 0 ),
			),
		);
	}

	private function is_utc_timestamp( string $value ): bool {
		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $value );
	}
}
