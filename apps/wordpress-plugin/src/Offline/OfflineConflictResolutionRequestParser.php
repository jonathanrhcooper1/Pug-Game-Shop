<?php
/**
 * Offline conflict resolution request parser.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineConflictResolutionRequestParser {
	private const SUPPORTED_SCHEMA_VERSION = 1;
	private const SUPPORTED_ACTIONS        = array(
		'accept_server',
		'accept_device',
		'manager_adjust',
		'retry_operation',
		'dismiss',
	);

	/**
	 * @param array<string, mixed> $payload Request body.
	 */
	public function parse(
		string $route_conflict_id,
		array $payload,
		?string $idempotency_header = null
	): OfflineConflictResolutionValidationResult {
		$errors                    = array();
		$conflict_id               = trim( $route_conflict_id );
		$resolution_source         = $idempotency_header;
		$device_id                 = trim( (string) ( $payload['device_id'] ?? '' ) );
		$resolution_action         = strtolower( trim( (string) ( $payload['resolution_action'] ?? '' ) ) );
		$resolution_note           = $this->normalize_text( (string) ( $payload['resolution_note'] ?? '' ) );
		$resolved_at_utc           = trim( (string) ( $payload['resolved_at_utc'] ?? '' ) );
		$resolution_payload        = $payload['resolution_payload'] ?? array();
		$manager_id                = $this->required_positive_int(
			$payload['manager_id'] ?? null,
			'manager_id',
			$errors
		);
		$expected_conflict_version = $this->required_positive_int(
			$payload['expected_conflict_version'] ?? null,
			'expected_conflict_version',
			$errors
		);
		$schema_version            = $this->required_positive_int(
			$payload['schema_version'] ?? null,
			'schema_version',
			$errors
		);

		if ( null === $resolution_source || '' === trim( $resolution_source ) ) {
			$resolution_source = (string) ( $payload['resolution_id'] ?? ( $payload['idempotency_key'] ?? '' ) );
		}

		$resolution_id = trim( $resolution_source );

		if ( '' === $conflict_id ) {
			$errors[] = 'conflict_id_required';
		} elseif ( ! $this->is_public_id( $conflict_id ) ) {
			$errors[] = 'conflict_id_invalid';
		}

		if ( '' === $resolution_id ) {
			$errors[] = 'resolution_id_required';
		} elseif ( ! $this->is_public_id( $resolution_id ) ) {
			$errors[] = 'resolution_id_invalid';
		}

		if ( '' === $device_id ) {
			$errors[] = 'device_id_required';
		} elseif ( ! $this->is_public_id( $device_id ) ) {
			$errors[] = 'device_id_invalid';
		}

		if ( ! in_array( $resolution_action, self::SUPPORTED_ACTIONS, true ) ) {
			$errors[] = 'resolution_action_unsupported';
		}

		if ( ! $this->is_utc_timestamp( $resolved_at_utc ) ) {
			$errors[] = 'resolved_at_utc_invalid';
		}

		if ( null !== $schema_version && self::SUPPORTED_SCHEMA_VERSION !== $schema_version ) {
			$errors[] = 'schema_version_unsupported';
		}

		if ( ! is_array( $resolution_payload ) ) {
			$errors[]           = 'resolution_payload_must_be_object';
			$resolution_payload = array();
		}

		if ( in_array( $resolution_action, array( 'manager_adjust', 'dismiss' ), true ) && '' === $resolution_note ) {
			$errors[] = 'resolution_note_required';
		}

		if ( 'manager_adjust' === $resolution_action && array() === $resolution_payload ) {
			$errors[] = 'resolution_payload_required';
		}

		if ( $errors ) {
			return OfflineConflictResolutionValidationResult::rejected( array_values( array_unique( $errors ) ) );
		}

		return OfflineConflictResolutionValidationResult::accepted(
			new OfflineConflictResolutionRequest(
				$conflict_id,
				$resolution_id,
				$device_id,
				$manager_id ?? 0,
				$resolution_action,
				$resolution_note,
				$expected_conflict_version ?? 0,
				$resolved_at_utc,
				$resolution_payload,
				$schema_version ?? 0
			)
		);
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	private function required_positive_int( mixed $value, string $field, array &$errors ): ?int {
		$parsed = $this->positive_int( $value );

		if ( null === $parsed ) {
			$errors[] = null === $value || '' === $value ? $field . '_required' : $field . '_invalid';
		}

		return $parsed;
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

	private function normalize_text( string $value ): string {
		return trim( (string) preg_replace( '/\s+/', ' ', $value ) );
	}
}
