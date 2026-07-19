<?php
/**
 * Registered offline device repository lookup planner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineRegisteredDeviceLookupPlanner {
	private const DEVICE_TABLE     = 'tcg_offline_devices';
	private const LOCK_INTENT      = 'optimistic_last_seen_update';
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
	private const SELECTED_COLUMNS = array(
		'offline_device_id',
		'public_id',
		'location_id',
		'manager_user_id',
		'device_label',
		'device_mode',
		'status',
		'token_hash',
		'token_expires_at',
		'revoked_at',
		'last_seen_at',
		'issued_at',
		'created_at',
		'updated_at',
		'scopes_json',
		'capabilities_json',
		'app_version',
		'platform',
		'row_version',
	);

	public function plan(
		OfflineDeviceTokenLookupPlan $token_lookup_plan,
		string $required_scope,
		string $server_time_utc
	): OfflineRegisteredDeviceLookupPlan {
		$required_scope  = strtolower( trim( $required_scope ) );
		$server_time_utc = trim( $server_time_utc );
		$errors          = array();

		if ( ! $token_lookup_plan->is_valid() ) {
			$errors = array_merge( $errors, $token_lookup_plan->errors() );
		}

		if ( ! in_array( $required_scope, self::SUPPORTED_SCOPES, true ) ) {
			$errors[] = 'required_scope_unsupported';
		}

		if ( ! $this->is_utc_timestamp( $server_time_utc ) ) {
			$errors[] = 'server_time_utc_invalid';
		}

		if ( array() !== $errors ) {
			return OfflineRegisteredDeviceLookupPlan::rejected(
				$token_lookup_plan->token_fingerprint(),
				$errors
			);
		}

		$lookup_filters = array(
			'token_hash'              => $token_lookup_plan->token_hash(),
			'status'                  => 'active',
			'revoked_at_is_null'      => true,
			'token_expires_after_utc' => $server_time_utc,
			'required_scope'          => $required_scope,
			'scope_check_is_deferred' => true,
		);
		$query_args     = array(
			'table'            => self::DEVICE_TABLE,
			'selected_columns' => self::SELECTED_COLUMNS,
			'where'            => $lookup_filters,
			'limit'            => 1,
			'order_by'         => array(
				'offline_device_id' => 'ASC',
			),
			'lock_intent'      => self::LOCK_INTENT,
			'scope_check'      => 'deferred_to_access_policy',
			'row_normalizer'   => OfflineRegisteredDeviceRowNormalizer::class,
		);

		return OfflineRegisteredDeviceLookupPlan::accepted(
			$token_lookup_plan->token_fingerprint(),
			$lookup_filters,
			$query_args
		);
	}

	private function is_utc_timestamp( string $value ): bool {
		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $value );
	}
}
