<?php
/**
 * Offline pull response presenter.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

use InvalidArgumentException;

final class OfflinePullResponsePresenter {
	private const SUPPORTED_DOMAINS = array(
		'branding',
		'inventory',
		'customer_credit',
		'events',
		'conflicts',
	);

	private const DEFAULT_ENTITY_TYPES = array(
		'branding'        => 'branding_settings',
		'inventory'       => 'inventory_item',
		'customer_credit' => 'customer_credit_account',
		'events'          => 'event',
		'conflicts'       => 'sync_conflict',
	);

	/**
	 * @param array<string, mixed> $change_sets Domain change sets keyed by domain.
	 * @return array<string, mixed>
	 */
	public function present( OfflinePullRequest $request, array $change_sets, string $server_time_utc ): array {
		if ( ! $this->is_utc_timestamp( $server_time_utc ) ) {
			throw new InvalidArgumentException( 'server_time_utc must be an ISO-8601 UTC timestamp.' );
		}

		$domains = array();

		foreach ( $request->domains() as $domain ) {
			$domain             = strtolower( trim( $domain ) );
			$domains[ $domain ] = $this->present_domain(
				$domain,
				$change_sets[ $domain ] ?? array(),
				$request->cursors(),
				$request->include_tombstones()
			);
		}

		return array(
			'device_id'       => $request->device_id(),
			'schema_version'  => $request->schema_version(),
			'server_time_utc' => $server_time_utc,
			'domains'         => $domains,
		);
	}

	/**
	 * @param array<string, string> $request_cursors Domain cursors from the request.
	 * @return array<string, mixed>
	 */
	private function present_domain(
		string $domain,
		mixed $change_set,
		array $request_cursors,
		bool $include_tombstones
	): array {
		if ( ! in_array( $domain, self::SUPPORTED_DOMAINS, true ) ) {
			throw new InvalidArgumentException( "Unsupported offline pull domain: {$domain}." );
		}

		if ( ! is_array( $change_set ) ) {
			throw new InvalidArgumentException( "Offline pull change set for {$domain} must be an object." );
		}

		$cursor     = $this->cursor( $change_set['cursor'] ?? ( $request_cursors[ $domain ] ?? '' ), $domain );
		$has_more   = $this->has_more( $change_set['has_more'] ?? false, $domain );
		$data       = $this->records( $domain, $change_set['data'] ?? array() );
		$tombstones = $include_tombstones ? $this->tombstones( $domain, $change_set['tombstones'] ?? array() ) : array();

		return array(
			'cursor'     => $cursor,
			'has_more'   => $has_more,
			'data'       => $data,
			'tombstones' => $tombstones,
		);
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function records( string $domain, mixed $records ): array {
		if ( ! is_array( $records ) ) {
			throw new InvalidArgumentException( "Offline pull data for {$domain} must be a list." );
		}

		$presented = array();

		foreach ( array_values( $records ) as $index => $record ) {
			if ( ! is_array( $record ) ) {
				throw new InvalidArgumentException( "Offline pull data row {$domain}.{$index} must be an object." );
			}

			$entity_type    = strtolower( trim( (string) ( $record['entity_type'] ?? self::DEFAULT_ENTITY_TYPES[ $domain ] ) ) );
			$entity_id      = trim( (string) ( $record['entity_id'] ?? '' ) );
			$row_version    = $this->positive_int( $record['row_version'] ?? null );
			$updated_at_utc = trim( (string) ( $record['updated_at_utc'] ?? '' ) );
			$payload        = $record['payload'] ?? array();

			if ( '' === $entity_type || ! $this->is_entity_id( $entity_type ) ) {
				throw new InvalidArgumentException( "Offline pull data row {$domain}.{$index} has an invalid entity_type." );
			}

			if ( '' === $entity_id || ! $this->is_entity_id( $entity_id ) ) {
				throw new InvalidArgumentException( "Offline pull data row {$domain}.{$index} has an invalid entity_id." );
			}

			if ( null === $row_version ) {
				throw new InvalidArgumentException( "Offline pull data row {$domain}.{$index} has an invalid row_version." );
			}

			if ( ! $this->is_utc_timestamp( $updated_at_utc ) ) {
				throw new InvalidArgumentException( "Offline pull data row {$domain}.{$index} has an invalid updated_at_utc." );
			}

			if ( ! is_array( $payload ) ) {
				throw new InvalidArgumentException( "Offline pull data row {$domain}.{$index} payload must be an object." );
			}

			$presented[] = array(
				'entity_type'    => $entity_type,
				'entity_id'      => $entity_id,
				'row_version'    => $row_version,
				'updated_at_utc' => $updated_at_utc,
				'payload'        => $payload,
			);
		}

		return $presented;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function tombstones( string $domain, mixed $tombstones ): array {
		if ( ! is_array( $tombstones ) ) {
			throw new InvalidArgumentException( "Offline pull tombstones for {$domain} must be a list." );
		}

		$presented = array();

		foreach ( array_values( $tombstones ) as $index => $tombstone ) {
			if ( ! is_array( $tombstone ) ) {
				throw new InvalidArgumentException( "Offline pull tombstone {$domain}.{$index} must be an object." );
			}

			$entity_type    = strtolower( trim( (string) ( $tombstone['entity_type'] ?? self::DEFAULT_ENTITY_TYPES[ $domain ] ) ) );
			$entity_id      = trim( (string) ( $tombstone['entity_id'] ?? '' ) );
			$row_version    = $this->positive_int( $tombstone['row_version'] ?? null );
			$deleted_at_utc = trim( (string) ( $tombstone['deleted_at_utc'] ?? '' ) );

			if ( '' === $entity_type || ! $this->is_entity_id( $entity_type ) ) {
				throw new InvalidArgumentException( "Offline pull tombstone {$domain}.{$index} has an invalid entity_type." );
			}

			if ( '' === $entity_id || ! $this->is_entity_id( $entity_id ) ) {
				throw new InvalidArgumentException( "Offline pull tombstone {$domain}.{$index} has an invalid entity_id." );
			}

			if ( null === $row_version ) {
				throw new InvalidArgumentException( "Offline pull tombstone {$domain}.{$index} has an invalid row_version." );
			}

			if ( ! $this->is_utc_timestamp( $deleted_at_utc ) ) {
				throw new InvalidArgumentException( "Offline pull tombstone {$domain}.{$index} has an invalid deleted_at_utc." );
			}

			$presented[] = array(
				'entity_type'    => $entity_type,
				'entity_id'      => $entity_id,
				'row_version'    => $row_version,
				'deleted_at_utc' => $deleted_at_utc,
			);
		}

		return $presented;
	}

	private function cursor( mixed $value, string $domain ): string {
		$cursor = trim( (string) $value );

		if ( '' !== $cursor && ! $this->is_cursor( $cursor ) ) {
			throw new InvalidArgumentException( "Offline pull cursor for {$domain} is invalid." );
		}

		return $cursor;
	}

	private function has_more( mixed $value, string $domain ): bool {
		if ( ! is_bool( $value ) ) {
			throw new InvalidArgumentException( "Offline pull has_more for {$domain} must be boolean." );
		}

		return $value;
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

	private function is_entity_id( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{1,128}$/', $value );
	}

	private function is_cursor( string $value ): bool {
		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{1,256}$/', $value );
	}

	private function is_utc_timestamp( string $value ): bool {
		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $value );
	}
}
