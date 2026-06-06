<?php
/**
 * Offline conflict list response presenter.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use InvalidArgumentException;

final class OfflineConflictListResponsePresenter {
	private const SUPPORTED_STATUSES     = array( 'open', 'assigned', 'resolving', 'resolved', 'dismissed' );
	private const SUPPORTED_ENTITY_TYPES = array(
		'inventory',
		'event',
		'customer_credit',
		'buylist',
		'kiosk_cart',
		'device',
	);
	private const SUPPORTED_SEVERITIES   = array( 'info', 'warning', 'blocking' );
	private const SUPPORTED_ACTIONS      = array(
		'accept_server',
		'accept_device',
		'manager_adjust',
		'retry_operation',
		'dismiss',
	);

	/**
	 * @param list<array<string, mixed>> $conflict_rows Repository conflict rows.
	 * @return array<string, mixed>
	 */
	public function present(
		OfflineConflictListRequest $request,
		array $conflict_rows,
		?string $next_cursor,
		bool $has_more,
		string $server_time_utc
	): array {
		if ( ! $this->is_utc_timestamp( $server_time_utc ) ) {
			throw new InvalidArgumentException( 'server_time_utc must be an ISO-8601 UTC timestamp.' );
		}

		$cursor = $this->cursor( $next_cursor );

		return array(
			'device_id'       => $request->device_id(),
			'schema_version'  => $request->schema_version(),
			'server_time_utc' => $server_time_utc,
			'cursor'          => $cursor,
			'has_more'        => $has_more,
			'filters'         => array(
				'statuses'         => $request->statuses(),
				'entity_types'     => $request->entity_types(),
				'include_resolved' => $request->include_resolved(),
			),
			'conflicts'       => $this->conflicts( $conflict_rows ),
		);
	}

	/**
	 * @param list<array<string, mixed>> $conflict_rows Repository conflict rows.
	 * @return list<array<string, mixed>>
	 */
	private function conflicts( array $conflict_rows ): array {
		$presented = array();

		foreach ( array_values( $conflict_rows ) as $index => $row ) {
			if ( ! is_array( $row ) ) {
				throw new InvalidArgumentException( "Offline conflict row {$index} must be an object." );
			}

			$presented[] = $this->conflict( $row, $index );
		}

		return $presented;
	}

	/**
	 * @param array<string, mixed> $row Repository conflict row.
	 * @return array<string, mixed>
	 */
	private function conflict( array $row, int $index ): array {
		$conflict_id        = trim( (string) ( $row['conflict_id'] ?? '' ) );
		$status             = strtolower( trim( (string) ( $row['status'] ?? '' ) ) );
		$entity_type        = strtolower( trim( (string) ( $row['entity_type'] ?? '' ) ) );
		$entity_id          = trim( (string) ( $row['entity_id'] ?? '' ) );
		$conflict_type      = strtolower( trim( (string) ( $row['conflict_type'] ?? '' ) ) );
		$severity           = strtolower( trim( (string) ( $row['severity'] ?? 'warning' ) ) );
		$summary            = $this->normalize_text( (string) ( $row['summary'] ?? '' ) );
		$detected_at_utc    = trim( (string) ( $row['detected_at_utc'] ?? '' ) );
		$updated_at_utc     = trim( (string) ( $row['updated_at_utc'] ?? $detected_at_utc ) );
		$row_version        = $this->positive_int( $row['row_version'] ?? null );
		$server_row_version = $this->optional_non_negative_int(
			$row['server_row_version'] ?? null,
			'server_row_version',
			$index
		);
		$device_row_version = $this->optional_non_negative_int(
			$row['device_row_version'] ?? null,
			'device_row_version',
			$index
		);
		$server_payload     = $row['server_payload'] ?? array();
		$device_payload     = $row['device_payload'] ?? array();
		$resolution_options = $this->resolution_options( $row['resolution_options'] ?? self::SUPPORTED_ACTIONS, $index );

		if ( '' === $conflict_id || ! $this->is_public_id( $conflict_id ) ) {
			throw new InvalidArgumentException( "Offline conflict row {$index} has an invalid conflict_id." );
		}

		if ( ! in_array( $status, self::SUPPORTED_STATUSES, true ) ) {
			throw new InvalidArgumentException( "Offline conflict row {$index} has an unsupported status." );
		}

		if ( ! in_array( $entity_type, self::SUPPORTED_ENTITY_TYPES, true ) ) {
			throw new InvalidArgumentException( "Offline conflict row {$index} has an unsupported entity_type." );
		}

		if ( '' === $entity_id || ! $this->is_entity_id( $entity_id ) ) {
			throw new InvalidArgumentException( "Offline conflict row {$index} has an invalid entity_id." );
		}

		if ( '' === $conflict_type || ! $this->is_entity_id( $conflict_type ) ) {
			throw new InvalidArgumentException( "Offline conflict row {$index} has an invalid conflict_type." );
		}

		if ( ! in_array( $severity, self::SUPPORTED_SEVERITIES, true ) ) {
			throw new InvalidArgumentException( "Offline conflict row {$index} has an unsupported severity." );
		}

		if ( '' === $summary ) {
			throw new InvalidArgumentException( "Offline conflict row {$index} summary is required." );
		}

		if ( null === $row_version ) {
			throw new InvalidArgumentException( "Offline conflict row {$index} has an invalid row_version." );
		}

		if ( ! $this->is_utc_timestamp( $detected_at_utc ) ) {
			throw new InvalidArgumentException( "Offline conflict row {$index} has an invalid detected_at_utc." );
		}

		if ( ! $this->is_utc_timestamp( $updated_at_utc ) ) {
			throw new InvalidArgumentException( "Offline conflict row {$index} has an invalid updated_at_utc." );
		}

		if ( ! is_array( $server_payload ) ) {
			throw new InvalidArgumentException( "Offline conflict row {$index} server_payload must be an object." );
		}

		if ( ! is_array( $device_payload ) ) {
			throw new InvalidArgumentException( "Offline conflict row {$index} device_payload must be an object." );
		}

		return array(
			'conflict_id'        => $conflict_id,
			'status'             => $status,
			'entity_type'        => $entity_type,
			'entity_id'          => $entity_id,
			'conflict_type'      => $conflict_type,
			'severity'           => $severity,
			'summary'            => $summary,
			'row_version'        => $row_version,
			'server_row_version' => $server_row_version,
			'device_row_version' => $device_row_version,
			'detected_at_utc'    => $detected_at_utc,
			'updated_at_utc'     => $updated_at_utc,
			'server_payload'     => $server_payload,
			'device_payload'     => $device_payload,
			'resolution_options' => $resolution_options,
		);
	}

	/**
	 * @return list<string>
	 */
	private function resolution_options( mixed $payload, int $row_index ): array {
		if ( ! is_array( $payload ) || array() === $payload ) {
			throw new InvalidArgumentException( "Offline conflict row {$row_index} resolution_options must be a non-empty list." );
		}

		$options = array();

		foreach ( array_values( $payload ) as $option_index => $option ) {
			$option = strtolower( trim( (string) $option ) );

			if ( ! in_array( $option, self::SUPPORTED_ACTIONS, true ) ) {
				throw new InvalidArgumentException( "Offline conflict row {$row_index} resolution option {$option_index} is unsupported." );
			}

			if ( ! in_array( $option, $options, true ) ) {
				$options[] = $option;
			}
		}

		return $options;
	}

	private function cursor( ?string $value ): string {
		if ( null === $value || '' === trim( $value ) ) {
			return '';
		}

		$cursor = trim( $value );

		if ( ! $this->is_cursor( $cursor ) ) {
			throw new InvalidArgumentException( 'Offline conflict response cursor is invalid.' );
		}

		return $cursor;
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

	private function optional_non_negative_int( mixed $value, string $field, int $index ): ?int {
		if ( null === $value || '' === $value ) {
			return null;
		}

		if ( is_int( $value ) && $value >= 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return (int) $value;
		}

		throw new InvalidArgumentException( "Offline conflict row {$index} has an invalid {$field}." );
	}

	private function is_public_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{8,128}$/', $value );
	}

	private function is_entity_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{1,128}$/', $value );
	}

	private function is_cursor( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{1,256}$/', $value );
	}

	private function is_utc_timestamp( string $value ): bool {
		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $value );
	}

	private function normalize_text( string $value ): string {
		return trim( (string) preg_replace( '/\s+/', ' ', $value ) );
	}
}
