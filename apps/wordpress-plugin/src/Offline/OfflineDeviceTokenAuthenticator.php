<?php
/**
 * Offline device bearer-token authenticator.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineDeviceTokenAuthenticator {
	private OfflineDeviceAccessPolicy $policy;
	private OfflineDeviceTokenLookupPlanner $lookup_planner;

	public function __construct(
		?OfflineDeviceAccessPolicy $policy = null,
		?OfflineDeviceTokenLookupPlanner $lookup_planner = null
	) {
		$this->policy         = $policy ?? new OfflineDeviceAccessPolicy();
		$this->lookup_planner = $lookup_planner ?? new OfflineDeviceTokenLookupPlanner();
	}

	/**
	 * @param array<string, mixed> $headers REST request headers.
	 * @param array<string, mixed> $device_row Stored device row.
	 */
	public function authenticate(
		array $headers,
		array $device_row,
		string $required_scope,
		string $now_utc
	): OfflineDeviceAccessDecision {
		$lookup_plan       = $this->lookup_planner->plan( $headers );
		$errors            = $lookup_plan->errors();
		$offline_device_id = $this->positive_int( $device_row['offline_device_id'] ?? null );

		if ( null === $offline_device_id ) {
			$errors[] = 'offline_device_id_invalid';
		}

		if ( array() !== $errors ) {
			return OfflineDeviceAccessDecision::rejected( array_values( array_unique( $errors ) ) );
		}

		$stored_token_hash = strtolower( trim( (string) ( $device_row['token_hash'] ?? '' ) ) );

		if ( 1 !== preg_match( '/^[a-f0-9]{64}$/', $stored_token_hash ) ) {
			return OfflineDeviceAccessDecision::rejected( array( 'device_token_hash_invalid' ) );
		}

		if ( ! hash_equals( $stored_token_hash, $lookup_plan->token_hash() ) ) {
			return OfflineDeviceAccessDecision::rejected( array( 'device_token_mismatch' ) );
		}

		$decision = $this->policy->authorize( $device_row, $required_scope, $now_utc );

		if ( ! $decision->is_allowed() ) {
			return $decision;
		}

		$context                         = $decision->context();
		$context['offline_device_id']    = $offline_device_id;
		$context['auth_type']            = 'device_bearer';
		$context['token_verified']       = true;
		$context['authenticated_at_utc'] = trim( $now_utc );

		return OfflineDeviceAccessDecision::accepted( $context );
	}

	public static function token_hash( string $device_token ): string {
		return OfflineDeviceTokenLookupPlanner::token_hash( $device_token );
	}

	private function positive_int( mixed $value ): ?int {
		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		return null;
	}
}
