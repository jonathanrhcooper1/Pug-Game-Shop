<?php
/**
 * Offline pull request parser.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePullRequestParser {
	private const DEFAULT_PAGE_SIZE        = 100;
	private const MAX_PAGE_SIZE            = 500;
	private const SUPPORTED_SCHEMA_VERSION = 1;
	private const SUPPORTED_DOMAINS        = array(
		'branding',
		'inventory',
		'customer_credit',
		'events',
		'conflicts',
	);

	/**
	 * @param array<string, mixed> $payload Request body.
	 */
	public function parse( array $payload ): OfflinePullRequestValidationResult {
		$errors             = array();
		$device_id          = trim( (string) ( $payload['device_id'] ?? '' ) );
		$domains_payload    = $payload['domains'] ?? self::SUPPORTED_DOMAINS;
		$cursors_payload    = $payload['cursors'] ?? array();
		$page_size          = $this->page_size( $payload['page_size'] ?? self::DEFAULT_PAGE_SIZE, $errors );
		$include_tombstones = $payload['include_tombstones'] ?? true;
		$schema_version     = $this->required_positive_int(
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

		if ( ! is_bool( $include_tombstones ) ) {
			$errors[]           = 'include_tombstones_invalid';
			$include_tombstones = true;
		}

		$domains = $this->parse_domains( $domains_payload, $errors );
		$cursors = $this->parse_cursors( $cursors_payload, $errors );

		if ( $errors ) {
			return OfflinePullRequestValidationResult::rejected( array_values( array_unique( $errors ) ) );
		}

		return OfflinePullRequestValidationResult::accepted(
			new OfflinePullRequest(
				$device_id,
				$domains,
				$cursors,
				$page_size,
				$include_tombstones,
				$schema_version ?? 0
			)
		);
	}

	/**
	 * @param list<string> $errors Validation errors.
	 * @return list<string>
	 */
	private function parse_domains( mixed $domains_payload, array &$errors ): array {
		if ( ! is_array( $domains_payload ) || array() === $domains_payload ) {
			$errors[] = 'domains_required';

			return array();
		}

		$domains = array();

		foreach ( array_values( $domains_payload ) as $index => $domain ) {
			$domain = strtolower( trim( (string) $domain ) );

			if ( ! in_array( $domain, self::SUPPORTED_DOMAINS, true ) ) {
				$errors[] = "domains_{$index}_unsupported";
				continue;
			}

			if ( ! in_array( $domain, $domains, true ) ) {
				$domains[] = $domain;
			}
		}

		return $domains;
	}

	/**
	 * @param list<string> $errors Validation errors.
	 * @return array<string, string>
	 */
	private function parse_cursors( mixed $cursors_payload, array &$errors ): array {
		if ( ! is_array( $cursors_payload ) ) {
			$errors[] = 'cursors_must_be_object';

			return array();
		}

		$cursors = array();

		foreach ( $cursors_payload as $domain => $cursor ) {
			$domain = strtolower( trim( (string) $domain ) );

			if ( ! in_array( $domain, self::SUPPORTED_DOMAINS, true ) ) {
				$errors[] = "cursors_{$domain}_unsupported";
				continue;
			}

			if ( null === $cursor || '' === $cursor ) {
				continue;
			}

			if ( ! is_string( $cursor ) || ! $this->is_cursor( $cursor ) ) {
				$errors[] = "cursors_{$domain}_invalid";
				continue;
			}

			$cursors[ $domain ] = trim( $cursor );
		}

		return $cursors;
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
