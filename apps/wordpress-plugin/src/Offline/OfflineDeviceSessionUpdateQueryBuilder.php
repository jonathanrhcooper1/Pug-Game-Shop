<?php
/**
 * Offline device session update query builder.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use DateTimeImmutable;
use DateTimeZone;
use Exception;

final class OfflineDeviceSessionUpdateQueryBuilder {
	private const DEVICE_TABLE = 'tcg_offline_devices';

	public function build(
		OfflineDeviceSessionPlan $session_plan,
		string $table_prefix
	): OfflineDeviceSessionUpdateQueryPlan {
		$errors       = array();
		$table_prefix = trim( $table_prefix );

		if (
			'' === $table_prefix
			|| 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix )
		) {
			$errors[] = 'table_prefix_invalid';
		}

		$update_row           = $session_plan->device_update_row();
		$offline_device_id    = $this->positive_int( $update_row['offline_device_id'] ?? null );
		$public_id            = trim( (string) ( $update_row['public_id'] ?? '' ) );
		$next_row_version     = $this->positive_int( $update_row['row_version'] ?? null );
		$expected_row_version = $this->positive_int( $update_row['expected_row_version'] ?? null );
		$previous_row_version = $this->positive_int( $update_row['previous_row_version'] ?? null );
		$last_seen_at         = $this->mysql_datetime_utc( (string) ( $update_row['last_seen_at'] ?? '' ) );
		$updated_at           = $this->mysql_datetime_utc( (string) ( $update_row['updated_at'] ?? '' ) );

		if ( null === $offline_device_id ) {
			$errors[] = 'offline_device_id_invalid';
		}

		if ( '' === $public_id || ! $this->is_public_id( $public_id ) ) {
			$errors[] = 'public_id_invalid';
		}

		if ( null === $next_row_version ) {
			$errors[] = 'row_version_invalid';
		}

		if ( null === $expected_row_version ) {
			$errors[] = 'expected_row_version_invalid';
		}

		if (
			null !== $next_row_version
			&& null !== $expected_row_version
			&& $next_row_version !== $expected_row_version + 1
		) {
			$errors[] = 'row_version_increment_invalid';
		}

		if (
			null !== $previous_row_version
			&& null !== $expected_row_version
			&& $previous_row_version !== $expected_row_version
		) {
			$errors[] = 'previous_row_version_mismatch';
		}

		if ( null === $last_seen_at ) {
			$errors[] = 'last_seen_at_invalid';
		}

		if ( null === $updated_at ) {
			$errors[] = 'updated_at_invalid';
		}

		if ( array() !== $errors ) {
			return OfflineDeviceSessionUpdateQueryPlan::rejected( $errors );
		}

		$table_name   = $table_prefix . self::DEVICE_TABLE;
		$sql_template = sprintf(
			'UPDATE `%s` SET `last_seen_at` = %%s, `updated_at` = %%s, '
				. '`row_version` = %%d WHERE `offline_device_id` = %%d '
				. 'AND `public_id` = %%s AND `row_version` = %%d LIMIT %%d',
			$table_name
		);
		$prepare_args = array(
			$last_seen_at,
			$updated_at,
			$next_row_version,
			$offline_device_id,
			$public_id,
			$expected_row_version,
			1,
		);

		return OfflineDeviceSessionUpdateQueryPlan::accepted(
			$table_name,
			$sql_template,
			$prepare_args,
			$offline_device_id,
			$public_id,
			$expected_row_version,
			$next_row_version
		);
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

	private function is_public_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{8,128}$/', $value );
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
