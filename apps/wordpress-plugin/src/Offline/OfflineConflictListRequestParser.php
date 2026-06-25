<?php
/**
 * Offline conflict list request parser.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineConflictListRequestParser {
	private const DEFAULT_PAGE_SIZE        = 50;
	private const MAX_PAGE_SIZE            = 200;
	private const SUPPORTED_SCHEMA_VERSION = 1;
	private const DEFAULT_STATUSES         = array( 'open', 'assigned', 'resolving' );
	private const SUPPORTED_STATUSES       = array( 'open', 'assigned', 'resolving', 'resolved', 'dismissed' );
	private const SUPPORTED_ENTITY_TYPES   = array(
		'inventory',
		'event',
		'customer_credit',
		'buylist',
		'kiosk_cart',
		'device',
	);

	/**
	 * @param array<string, mixed> $payload Query or request body.
	 */
	public function parse( array $payload ): OfflineConflictListRequestValidationResult {
		$errors           = array();
		$device_id        = trim( (string) ( $payload['device_id'] ?? '' ) );
		$include_resolved = $this->optional_bool(
			$payload['include_resolved'] ?? false,
			'include_resolved',
			$errors
		);
		$status_defaults  = $include_resolved ? self::SUPPORTED_STATUSES : self::DEFAULT_STATUSES;
		$statuses         = $this->parse_list(
			$payload['statuses'] ?? $status_defaults,
			'statuses',
			self::SUPPORTED_STATUSES,
			$errors
		);
		$entity_types     = $this->parse_list(
			$payload['entity_types'] ?? self::SUPPORTED_ENTITY_TYPES,
			'entity_types',
			self::SUPPORTED_ENTITY_TYPES,
			$errors
		);
		$cursor           = $this->optional_cursor( $payload['cursor'] ?? null, $errors );
		$page_size        = $this->page_size( $payload['page_size'] ?? self::DEFAULT_PAGE_SIZE, $errors );
		$schema_version   = $this->required_positive_int(
			$payload['schema_version'] ?? null,
			'schema_version',
			$errors
		);

		if ( '' === $device_id ) {
			$errors[] = 'device_id_required';
		} elseif ( ! $this->is_public_id( $device_id ) ) {
			$errors[] = 'device_id_invalid';
		}

		if ( null !== $schema_version && self::SUPPORTED_SCHEMA_VERSION !== $schema_version ) {
			$errors[] = 'schema_version_unsupported';
		}

		if ( $errors ) {
			return OfflineConflictListRequestValidationResult::rejected( array_values( array_unique( $errors ) ) );
		}

		return OfflineConflictListRequestValidationResult::accepted(
			new OfflineConflictListRequest(
				$device_id,
				$statuses,
				$entity_types,
				$cursor,
				$page_size,
				$include_resolved,
				$schema_version ?? 0
			)
		);
	}

	/**
	 * @param list<string> $supported Supported values.
	 * @param list<string> $errors Validation errors.
	 * @return list<string>
	 */
	private function parse_list( mixed $payload, string $field, array $supported, array &$errors ): array {
		if ( is_string( $payload ) ) {
			$payload = array_map( 'trim', explode( ',', $payload ) );
		}

		if ( ! is_array( $payload ) || array() === $payload ) {
			$errors[] = $field . '_required';

			return array();
		}

		$values = array();

		foreach ( array_values( $payload ) as $index => $value ) {
			$value = strtolower( trim( (string) $value ) );

			if ( '' === $value ) {
				$errors[] = "{$field}_{$index}_required";
				continue;
			}

			if ( ! in_array( $value, $supported, true ) ) {
				$errors[] = "{$field}_{$index}_unsupported";
				continue;
			}

			if ( ! in_array( $value, $values, true ) ) {
				$values[] = $value;
			}
		}

		return $values;
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	private function optional_bool( mixed $value, string $field, array &$errors ): bool {
		if ( is_bool( $value ) ) {
			return $value;
		}

		if ( is_string( $value ) ) {
			$normalized = strtolower( trim( $value ) );

			if ( in_array( $normalized, array( '1', 'true' ), true ) ) {
				return true;
			}

			if ( in_array( $normalized, array( '0', 'false' ), true ) ) {
				return false;
			}
		}

		$errors[] = $field . '_invalid';

		return false;
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	private function optional_cursor( mixed $value, array &$errors ): ?string {
		if ( null === $value || '' === $value ) {
			return null;
		}

		if ( ! is_string( $value ) || ! $this->is_cursor( trim( $value ) ) ) {
			$errors[] = 'cursor_invalid';

			return null;
		}

		return trim( $value );
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	private function page_size( mixed $value, array &$errors ): int {
		$parsed = $this->positive_int( $value );

		if ( null === $parsed || $parsed > self::MAX_PAGE_SIZE ) {
			$errors[] = 'page_size_invalid';

			return self::DEFAULT_PAGE_SIZE;
		}

		return $parsed;
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

	private function is_cursor( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{1,256}$/', $value );
	}
}
