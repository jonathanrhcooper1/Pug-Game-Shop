<?php
/**
 * Offline conflict resolution SQL template builder.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use DateTimeImmutable;
use DateTimeZone;
use Exception;

final class OfflineConflictResolutionQueryBuilder {
	private const CONFLICT_TABLE   = 'tcg_sync_conflicts';
	private const MUTABLE_STATUSES = array( 'open', 'assigned', 'resolving' );
	private const TARGET_STATUSES  = array( 'resolved', 'dismissed', 'resolving' );
	private const ACTIONS          = array(
		'accept_server',
		'accept_device',
		'manager_adjust',
		'retry_operation',
		'dismiss',
	);

	public function build(
		OfflineConflictResolutionPlan $resolution_plan,
		string $table_prefix
	): OfflineConflictResolutionQueryPlan {
		$errors       = array();
		$table_prefix = trim( $table_prefix );

		if ( '' === $table_prefix || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix ) ) {
			$errors[] = 'table_prefix_invalid';
		}

		$row                  = $resolution_plan->conflict_update_row();
		$conflict_id          = trim( (string) ( $row['conflict_id'] ?? '' ) );
		$resolution_id        = trim( (string) ( $row['resolution_id'] ?? '' ) );
		$target_status        = strtolower( trim( (string) ( $row['status'] ?? '' ) ) );
		$resolution_action    = strtolower( trim( (string) ( $row['resolution_action'] ?? '' ) ) );
		$resolution_note      = $this->normalize_text( (string) ( $row['resolution_note'] ?? '' ) );
		$resolved_device_id   = trim( (string) ( $row['resolved_by_device_id'] ?? '' ) );
		$manager_id           = $this->positive_int( $row['resolved_by_manager_id'] ?? null );
		$expected_row_version = $this->positive_int( $row['expected_conflict_version'] ?? null );
		$previous_row_version = $this->positive_int( $row['previous_row_version'] ?? null );
		$next_row_version     = $this->positive_int( $row['row_version'] ?? null );
		$resolved_at          = $this->mysql_datetime_utc( (string) ( $row['resolved_at_utc'] ?? '' ) );
		$updated_at           = $this->mysql_datetime_utc( (string) ( $row['updated_at_utc'] ?? '' ) );
		$resolution_payload   = $row['resolution_payload'] ?? array();
		$resolution_json      = null;

		if ( ! $this->is_public_id( $conflict_id ) ) {
			$errors[] = 'conflict_id_invalid';
		}

		if ( ! $this->is_public_id( $resolution_id ) ) {
			$errors[] = 'resolution_id_invalid';
		}

		if ( ! $this->is_public_id( $resolved_device_id ) ) {
			$errors[] = 'resolved_by_device_id_invalid';
		}

		if ( ! in_array( $target_status, self::TARGET_STATUSES, true ) ) {
			$errors[] = 'status_invalid';
		}

		if ( ! in_array( $resolution_action, self::ACTIONS, true ) ) {
			$errors[] = 'resolution_action_invalid';
		}

		if ( null === $manager_id ) {
			$errors[] = 'resolved_by_manager_id_invalid';
		}

		if ( null === $expected_row_version ) {
			$errors[] = 'expected_conflict_version_invalid';
		}

		if ( null === $previous_row_version ) {
			$errors[] = 'previous_row_version_invalid';
		}

		if ( null === $next_row_version ) {
			$errors[] = 'row_version_invalid';
		}

		if (
			null !== $expected_row_version
			&& null !== $previous_row_version
			&& $expected_row_version !== $previous_row_version
		) {
			$errors[] = 'previous_row_version_mismatch';
		}

		if (
			null !== $expected_row_version
			&& null !== $next_row_version
			&& $next_row_version !== $expected_row_version + 1
		) {
			$errors[] = 'row_version_increment_invalid';
		}

		if ( null === $resolved_at ) {
			$errors[] = 'resolved_at_invalid';
		}

		if ( null === $updated_at ) {
			$errors[] = 'updated_at_invalid';
		}

		if ( ! is_array( $resolution_payload ) ) {
			$errors[]           = 'resolution_payload_invalid';
			$resolution_payload = array();
			$resolution_json    = null;
		} else {
			$resolution_json = $this->encoded_resolution_payload(
				$resolution_id,
				$resolved_device_id,
				$resolution_note,
				$resolution_payload
			);

			if ( null === $resolution_json ) {
				$errors[] = 'resolution_payload_json_invalid';
			}
		}

		if ( array() !== $errors ) {
			return OfflineConflictResolutionQueryPlan::rejected( $errors );
		}

		$table_name   = $table_prefix . self::CONFLICT_TABLE;
		$sql_template = sprintf(
			'UPDATE `%s` SET `status` = %%s, `resolution_action` = %%s, '
				. '`resolution_payload_json` = %%s, `manager_user_id` = %%d, '
				. '`resolved_at` = %%s, `updated_at` = %%s, `row_version` = %%d '
				. 'WHERE `conflict_id` = %%s AND `row_version` = %%d '
				. 'AND `status` IN (%%s, %%s, %%s) LIMIT %%d',
			$table_name
		);
		$prepare_args = array(
			$target_status,
			$resolution_action,
			$resolution_json,
			$manager_id,
			$resolved_at,
			$updated_at,
			$next_row_version,
			$conflict_id,
			$expected_row_version,
			self::MUTABLE_STATUSES[0],
			self::MUTABLE_STATUSES[1],
			self::MUTABLE_STATUSES[2],
			1,
		);

		return OfflineConflictResolutionQueryPlan::accepted(
			$table_name,
			$sql_template,
			$prepare_args,
			$conflict_id,
			$resolution_id,
			$target_status,
			$resolution_action,
			$manager_id ?? 0,
			$expected_row_version ?? 0,
			$next_row_version ?? 0
		);
	}

	/**
	 * @param array<string, mixed> $payload Resolution payload.
	 */
	private function encoded_resolution_payload(
		string $resolution_id,
		string $resolved_device_id,
		string $resolution_note,
		array $payload
	): ?string {
		$encoded = json_encode(
			array(
				'resolution_id'         => $resolution_id,
				'resolved_by_device_id' => $resolved_device_id,
				'resolution_note'       => $resolution_note,
				'payload'               => $payload,
			)
		);

		return false === $encoded ? null : $encoded;
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

	private function is_utc_timestamp( string $value ): bool {
		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $value );
	}

	private function mysql_datetime_utc( string $value ): ?string {
		if ( ! $this->is_utc_timestamp( $value ) ) {
			return null;
		}

		try {
			$date = new DateTimeImmutable( $value, new DateTimeZone( 'UTC' ) );
		} catch ( Exception ) {
			return null;
		}

		return $date->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s.u' );
	}

	private function normalize_text( string $value ): string {
		return trim( (string) preg_replace( '/\s+/', ' ', $value ) );
	}
}
