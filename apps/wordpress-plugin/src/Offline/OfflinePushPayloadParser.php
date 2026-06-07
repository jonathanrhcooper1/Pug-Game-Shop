<?php
/**
 * Offline push request payload parser.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushPayloadParser {
	private const MAX_OPERATIONS           = 100;
	private const SUPPORTED_SCHEMA_VERSION = 1;
	private const OPERATION_ENTITY_MAP     = array(
		'inventory_reservation' => 'inventory',
		'event_reservation'     => 'event',
		'credit_redemption'     => 'customer_credit',
	);

	/**
	 * @param array<string, mixed> $payload Request body.
	 */
	public function parse( array $payload, ?string $idempotency_header = null ): OfflinePushPayloadValidationResult {
		$errors             = array();
		$batch_source       = $idempotency_header;
		$device_id          = trim( (string) ( $payload['device_id'] ?? '' ) );
		$operations_payload = $payload['operations'] ?? array();

		if ( null === $batch_source || '' === trim( $batch_source ) ) {
			$batch_source = (string) ( $payload['batch_id'] ?? ( $payload['idempotency_key'] ?? '' ) );
		}

		$batch_id = trim( $batch_source );

		if ( '' === $batch_id ) {
			$errors[] = 'batch_id_required';
		} elseif ( ! $this->is_public_id( $batch_id ) ) {
			$errors[] = 'batch_id_invalid';
		}

		if ( '' === $device_id ) {
			$errors[] = 'device_id_required';
		} elseif ( ! $this->is_public_id( $device_id ) ) {
			$errors[] = 'device_id_invalid';
		}

		if ( ! is_array( $operations_payload ) || array() === $operations_payload ) {
			$errors[]           = 'operations_required';
			$operations_payload = array();
		} elseif ( count( $operations_payload ) > self::MAX_OPERATIONS ) {
			$errors[] = 'operations_too_large';
		}

		$operations = $this->parse_operations( array_values( $operations_payload ), $device_id, $errors );

		if ( $errors ) {
			return OfflinePushPayloadValidationResult::rejected( array_values( array_unique( $errors ) ) );
		}

		return OfflinePushPayloadValidationResult::accepted(
			new OfflinePushPayload( $batch_id, $device_id, $operations )
		);
	}

	/**
	 * @param list<mixed>  $operations_payload Operation payloads.
	 * @param list<string> $errors Validation errors.
	 * @return list<OfflineOperationEnvelope>
	 */
	private function parse_operations( array $operations_payload, string $device_id, array &$errors ): array {
		$operations = array();
		$seen       = array();

		foreach ( $operations_payload as $index => $operation_payload ) {
			if ( ! is_array( $operation_payload ) ) {
				$errors[] = "operations_{$index}_must_be_object";
				continue;
			}

			$operation = $this->parse_operation( $operation_payload, $index, $device_id, $errors );

			if ( null === $operation ) {
				continue;
			}

			$client_operation_id = $operation->client_operation_id();

			if ( isset( $seen[ $client_operation_id ] ) ) {
				$errors[] = "operations_{$index}_client_operation_id_duplicate";
			}

			$seen[ $client_operation_id ] = true;
			$operations[]                 = $operation;
		}

		return $operations;
	}

	/**
	 * @param array<string, mixed> $operation Operation payload.
	 * @param list<string>        $errors Validation errors.
	 */
	private function parse_operation(
		array $operation,
		int $index,
		string $route_device_id,
		array &$errors
	): ?OfflineOperationEnvelope {
		$client_operation_id   = trim( (string) ( $operation['client_operation_id'] ?? '' ) );
		$device_id             = trim( (string) ( $operation['device_id'] ?? '' ) );
		$operation_type        = strtolower( trim( (string) ( $operation['operation_type'] ?? '' ) ) );
		$entity_type           = strtolower( trim( (string) ( $operation['entity_type'] ?? '' ) ) );
		$entity_id             = trim( (string) ( $operation['entity_id'] ?? '' ) );
		$occurred_at_local     = trim( (string) ( $operation['occurred_at_local'] ?? '' ) );
		$queued_at_utc         = trim( (string) ( $operation['queued_at_utc'] ?? '' ) );
		$payload               = $operation['payload'] ?? null;
		$authorization_context = $operation['authorization_context'] ?? array();
		$location_id           = $this->optional_positive_int(
			$operation['location_id'] ?? null,
			"operations_{$index}_location_id",
			$errors
		);
		$actor_id              = $this->optional_positive_int(
			$operation['actor_id'] ?? null,
			"operations_{$index}_actor_id",
			$errors
		);
		$base_row_version      = $this->optional_non_negative_int(
			$operation['base_row_version'] ?? null,
			"operations_{$index}_base_row_version",
			$errors
		);
		$schema_version        = $this->required_positive_int(
			$operation['schema_version'] ?? null,
			"operations_{$index}_schema_version",
			$errors
		);

		if ( '' === $client_operation_id ) {
			$errors[] = "operations_{$index}_client_operation_id_required";
		} elseif ( ! $this->is_public_id( $client_operation_id ) ) {
			$errors[] = "operations_{$index}_client_operation_id_invalid";
		}

		if ( '' === $device_id ) {
			$errors[] = "operations_{$index}_device_id_required";
		} elseif ( ! $this->is_public_id( $device_id ) ) {
			$errors[] = "operations_{$index}_device_id_invalid";
		} elseif ( '' !== $route_device_id && $device_id !== $route_device_id ) {
			$errors[] = "operations_{$index}_device_id_mismatch";
		}

		if ( ! array_key_exists( $operation_type, self::OPERATION_ENTITY_MAP ) ) {
			$errors[] = "operations_{$index}_operation_type_unsupported";
		} elseif ( self::OPERATION_ENTITY_MAP[ $operation_type ] !== $entity_type ) {
			$errors[] = "operations_{$index}_entity_type_mismatch";
		}

		if ( '' === $entity_type ) {
			$errors[] = "operations_{$index}_entity_type_required";
		}

		if ( '' === $entity_id ) {
			$errors[] = "operations_{$index}_entity_id_required";
		} elseif ( ! $this->is_entity_id( $entity_id ) ) {
			$errors[] = "operations_{$index}_entity_id_invalid";
		}

		if ( ! $this->is_iso8601_offset_timestamp( $occurred_at_local ) ) {
			$errors[] = "operations_{$index}_occurred_at_local_invalid";
		}

		if ( ! $this->is_utc_timestamp( $queued_at_utc ) ) {
			$errors[] = "operations_{$index}_queued_at_utc_invalid";
		}

		if ( null !== $schema_version && self::SUPPORTED_SCHEMA_VERSION !== $schema_version ) {
			$errors[] = "operations_{$index}_schema_version_unsupported";
		}

		if ( ! is_array( $payload ) ) {
			$errors[] = "operations_{$index}_payload_must_be_object";
			$payload  = array();
		}

		if ( ! is_array( $authorization_context ) ) {
			$errors[]              = "operations_{$index}_authorization_context_must_be_object";
			$authorization_context = array();
		}

		return new OfflineOperationEnvelope(
			$client_operation_id,
			$device_id,
			$location_id,
			$actor_id,
			$operation_type,
			$entity_type,
			$entity_id,
			$base_row_version,
			$occurred_at_local,
			$queued_at_utc,
			$payload,
			$authorization_context,
			$schema_version ?? 0
		);
	}

	private function is_public_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{8,128}$/', $value );
	}

	private function is_entity_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{1,128}$/', $value );
	}

	private function is_iso8601_offset_timestamp( string $value ): bool {
		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/', $value );
	}

	private function is_utc_timestamp( string $value ): bool {
		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $value );
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	private function optional_positive_int( mixed $value, string $field, array &$errors ): ?int {
		if ( null === $value || '' === $value ) {
			return null;
		}

		$parsed = $this->positive_int( $value );

		if ( null === $parsed ) {
			$errors[] = $field . '_invalid';
		}

		return $parsed;
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	private function optional_non_negative_int( mixed $value, string $field, array &$errors ): ?int {
		if ( null === $value || '' === $value ) {
			return null;
		}

		if ( is_int( $value ) && $value >= 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return (int) $value;
		}

		$errors[] = $field . '_invalid';

		return null;
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
}
