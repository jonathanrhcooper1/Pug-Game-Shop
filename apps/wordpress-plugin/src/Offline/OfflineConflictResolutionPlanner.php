<?php
/**
 * Offline conflict resolution planner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use InvalidArgumentException;

final class OfflineConflictResolutionPlanner {
	private const MUTABLE_STATUSES  = array( 'open', 'assigned', 'resolving' );
	private const TERMINAL_ACTIONS  = array(
		'accept_server',
		'accept_device',
		'manager_adjust',
		'dismiss',
	);
	private const SUPPORTED_ACTIONS = array(
		'accept_server',
		'accept_device',
		'manager_adjust',
		'retry_operation',
		'dismiss',
	);

	/**
	 * @param array<string, mixed> $current_conflict_row Current conflict row.
	 */
	public function plan(
		OfflineConflictResolutionRequest $request,
		array $current_conflict_row,
		string $server_time_utc
	): OfflineConflictResolutionPlan {
		$server_time_utc = trim( $server_time_utc );

		if ( ! $this->is_utc_timestamp( $server_time_utc ) ) {
			throw new InvalidArgumentException( 'server_time_utc must be an ISO-8601 UTC timestamp.' );
		}

		$current = $this->current_conflict( $current_conflict_row );

		if ( $current['conflict_id'] !== $request->conflict_id() ) {
			throw new InvalidArgumentException( 'request conflict_id does not match current conflict row.' );
		}

		if ( $current['row_version'] !== $request->expected_conflict_version() ) {
			throw new InvalidArgumentException( 'expected_conflict_version does not match current conflict row.' );
		}

		if ( ! in_array( $current['status'], self::MUTABLE_STATUSES, true ) ) {
			throw new InvalidArgumentException( 'current conflict status is terminal.' );
		}

		if (
			! $this->action_is_available(
				$request->resolution_action(),
				$current_conflict_row['resolution_options'] ?? self::SUPPORTED_ACTIONS
			)
		) {
			throw new InvalidArgumentException( 'resolution_action is not available for current conflict row.' );
		}

		$target_status    = $this->target_status( $request->resolution_action() );
		$next_row_version = $current['row_version'] + 1;
		$payload_hash     = $this->payload_hash( $request->resolution_payload() );

		$conflict_update_row = array(
			'conflict_id'               => $request->conflict_id(),
			'resolution_id'             => $request->resolution_id(),
			'status'                    => $target_status,
			'resolution_action'         => $request->resolution_action(),
			'resolution_note'           => $request->resolution_note(),
			'resolution_payload'        => $request->resolution_payload(),
			'resolved_by_manager_id'    => $request->manager_id(),
			'resolved_by_device_id'     => $request->device_id(),
			'resolved_at_utc'           => $request->resolved_at_utc(),
			'updated_at_utc'            => $server_time_utc,
			'row_version'               => $next_row_version,
			'previous_row_version'      => $current['row_version'],
			'expected_conflict_version' => $request->expected_conflict_version(),
		);

		$response_payload = array(
			'conflict_id'       => $request->conflict_id(),
			'resolution_id'     => $request->resolution_id(),
			'status'            => $target_status,
			'row_version'       => $next_row_version,
			'resolution_action' => $request->resolution_action(),
			'resolved_at_utc'   => $request->resolved_at_utc(),
			'server_time_utc'   => $server_time_utc,
			'schema_version'    => $request->schema_version(),
		);

		$audit_payload = array(
			'action'                  => 'offline_conflict_resolution_planned',
			'conflict_id'             => $request->conflict_id(),
			'resolution_id'           => $request->resolution_id(),
			'entity_type'             => $current['entity_type'],
			'entity_id'               => $current['entity_id'],
			'conflict_type'           => $current['conflict_type'],
			'previous_status'         => $current['status'],
			'target_status'           => $target_status,
			'previous_row_version'    => $current['row_version'],
			'next_row_version'        => $next_row_version,
			'manager_id'              => $request->manager_id(),
			'device_id'               => $request->device_id(),
			'resolution_action'       => $request->resolution_action(),
			'resolution_payload_hash' => $payload_hash,
			'resolved_at_utc'         => $request->resolved_at_utc(),
			'server_time_utc'         => $server_time_utc,
		);

		return new OfflineConflictResolutionPlan( $conflict_update_row, $response_payload, $audit_payload );
	}

	/**
	 * @param array<string, mixed> $current_conflict_row Current conflict row.
	 * @return array<string, mixed>
	 */
	private function current_conflict( array $current_conflict_row ): array {
		$conflict_id   = trim( (string) ( $current_conflict_row['conflict_id'] ?? '' ) );
		$status        = strtolower( trim( (string) ( $current_conflict_row['status'] ?? '' ) ) );
		$entity_type   = strtolower( trim( (string) ( $current_conflict_row['entity_type'] ?? '' ) ) );
		$entity_id     = trim( (string) ( $current_conflict_row['entity_id'] ?? '' ) );
		$conflict_type = strtolower( trim( (string) ( $current_conflict_row['conflict_type'] ?? '' ) ) );
		$row_version   = $this->positive_int( $current_conflict_row['row_version'] ?? null );

		if ( ! $this->is_public_id( $conflict_id ) ) {
			throw new InvalidArgumentException( 'current conflict row has an invalid conflict_id.' );
		}

		if ( '' === $status ) {
			throw new InvalidArgumentException( 'current conflict row status is required.' );
		}

		if ( '' === $entity_type || ! $this->is_entity_id( $entity_type ) ) {
			throw new InvalidArgumentException( 'current conflict row has an invalid entity_type.' );
		}

		if ( '' === $entity_id || ! $this->is_entity_id( $entity_id ) ) {
			throw new InvalidArgumentException( 'current conflict row has an invalid entity_id.' );
		}

		if ( '' === $conflict_type || ! $this->is_entity_id( $conflict_type ) ) {
			throw new InvalidArgumentException( 'current conflict row has an invalid conflict_type.' );
		}

		if ( null === $row_version ) {
			throw new InvalidArgumentException( 'current conflict row has an invalid row_version.' );
		}

		return array(
			'conflict_id'   => $conflict_id,
			'status'        => $status,
			'entity_type'   => $entity_type,
			'entity_id'     => $entity_id,
			'conflict_type' => $conflict_type,
			'row_version'   => $row_version,
		);
	}

	private function action_is_available( string $action, mixed $resolution_options ): bool {
		if ( ! in_array( $action, self::SUPPORTED_ACTIONS, true ) || ! is_array( $resolution_options ) ) {
			return false;
		}

		$options = array();

		foreach ( array_values( $resolution_options ) as $option ) {
			$option = strtolower( trim( (string) $option ) );

			if ( in_array( $option, self::SUPPORTED_ACTIONS, true ) && ! in_array( $option, $options, true ) ) {
				$options[] = $option;
			}
		}

		return in_array( $action, $options, true );
	}

	private function target_status( string $action ): string {
		if ( 'retry_operation' === $action ) {
			return 'resolving';
		}

		if ( 'dismiss' === $action ) {
			return 'dismissed';
		}

		if ( in_array( $action, self::TERMINAL_ACTIONS, true ) ) {
			return 'resolved';
		}

		throw new InvalidArgumentException( 'resolution_action is unsupported.' );
	}

	/**
	 * @param array<string, mixed> $payload Resolution payload.
	 */
	private function payload_hash( array $payload ): string {
		$normalized = $this->sort_recursive( $payload );
		$json       = (string) json_encode( $normalized );

		return hash( 'sha256', $json );
	}

	/**
	 * @param array<string, mixed> $payload Payload to sort.
	 * @return array<string, mixed>
	 */
	private function sort_recursive( array $payload ): array {
		ksort( $payload );

		foreach ( $payload as $key => $value ) {
			if ( is_array( $value ) ) {
				$payload[ $key ] = $this->sort_recursive( $value );
			}
		}

		return $payload;
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

	private function is_entity_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{1,128}$/', $value );
	}

	private function is_utc_timestamp( string $value ): bool {
		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $value );
	}
}
