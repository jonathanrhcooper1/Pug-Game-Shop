<?php
/**
 * Registered offline device prepared query builder.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use DateTimeImmutable;
use DateTimeZone;
use Exception;

final class OfflineRegisteredDeviceLookupQueryBuilder {
	private const DEVICE_TABLE = 'tcg_offline_devices';
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

	public function build(
		OfflineRegisteredDeviceLookupPlan $lookup_plan,
		string $table_prefix
	): OfflineRegisteredDeviceLookupQueryPlan {
		$errors = array();

		if ( ! $lookup_plan->is_valid() ) {
			$errors[] = 'lookup_plan_invalid';
			$errors   = array_merge( $errors, $lookup_plan->errors() );
		}

		$table_prefix = trim( $table_prefix );
		if (
			'' === $table_prefix
			|| 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix )
		) {
			$errors[] = 'table_prefix_invalid';
		}

		$query_args = $lookup_plan->query_args();
		$where      = is_array( $query_args['where'] ?? null ) ? $query_args['where'] : array();

		$this->validate_query_contract( $query_args, $where, $errors );

		if ( array() !== $errors ) {
			return OfflineRegisteredDeviceLookupQueryPlan::rejected(
				$lookup_plan->token_fingerprint(),
				$errors
			);
		}

		$table_name       = $table_prefix . self::DEVICE_TABLE;
		$selected_columns = array_values( $query_args['selected_columns'] );
		$sql_template     = sprintf(
			'SELECT %s FROM `%s` WHERE `token_hash` = %%s '
				. 'AND `status` = %%s AND `revoked_at` IS NULL '
				. 'AND `token_expires_at` > %%s '
				. 'ORDER BY `offline_device_id` ASC LIMIT %%d',
			implode( ', ', array_map( array( $this, 'quote_identifier' ), $selected_columns ) ),
			$table_name
		);
		$prepare_args     = array(
			$where['token_hash'],
			$where['status'],
			$this->mysql_datetime_utc( $where['token_expires_after_utc'] ),
			(int) $query_args['limit'],
		);

		return OfflineRegisteredDeviceLookupQueryPlan::accepted(
			$lookup_plan->token_fingerprint(),
			$table_name,
			$selected_columns,
			$sql_template,
			$prepare_args,
			(string) $query_args['row_normalizer']
		);
	}

	/**
	 * @param array<string, mixed> $query_args Query args.
	 * @param array<string, mixed> $where Where args.
	 * @param list<string>         $errors Query planning errors.
	 */
	private function validate_query_contract( array $query_args, array $where, array &$errors ): void {
		if ( self::DEVICE_TABLE !== ( $query_args['table'] ?? '' ) ) {
			$errors[] = 'table_unsupported';
		}

		if ( self::SELECTED_COLUMNS !== ( $query_args['selected_columns'] ?? array() ) ) {
			$errors[] = 'selected_columns_unsupported';
		}

		if ( 1 !== ( $query_args['limit'] ?? null ) ) {
			$errors[] = 'limit_unsupported';
		}

		if (
			array( 'offline_device_id' => 'ASC' )
			!== ( $query_args['order_by'] ?? array() )
		) {
			$errors[] = 'order_by_unsupported';
		}

		if (
			OfflineRegisteredDeviceRowNormalizer::class
			!== ( $query_args['row_normalizer'] ?? '' )
		) {
			$errors[] = 'row_normalizer_unsupported';
		}

		if ( 'deferred_to_access_policy' !== ( $query_args['scope_check'] ?? '' ) ) {
			$errors[] = 'scope_check_unsupported';
		}

		if (
			! is_string( $where['token_hash'] ?? null )
			|| 1 !== preg_match( '/^[a-f0-9]{64}$/', (string) $where['token_hash'] )
		) {
			$errors[] = 'token_hash_invalid';
		}

		if ( 'active' !== ( $where['status'] ?? '' ) ) {
			$errors[] = 'status_filter_unsupported';
		}

		if ( true !== ( $where['revoked_at_is_null'] ?? null ) ) {
			$errors[] = 'revocation_filter_unsupported';
		}

		if (
			! is_string( $where['token_expires_after_utc'] ?? null )
			|| null === $this->mysql_datetime_utc( (string) $where['token_expires_after_utc'] )
		) {
			$errors[] = 'token_expiry_filter_invalid';
		}

		if (
			true !== ( $where['scope_check_is_deferred'] ?? null )
			|| ! is_string( $where['required_scope'] ?? null )
			|| '' === trim( (string) $where['required_scope'] )
		) {
			$errors[] = 'required_scope_filter_invalid';
		}
	}

	private function quote_identifier( string $identifier ): string {
		return '`' . $identifier . '`';
	}

	private function mysql_datetime_utc( string $value ): ?string {
		try {
			$date = new DateTimeImmutable( $value, new DateTimeZone( 'UTC' ) );
		} catch ( Exception ) {
			return null;
		}

		return $date->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s.u' );
	}
}
