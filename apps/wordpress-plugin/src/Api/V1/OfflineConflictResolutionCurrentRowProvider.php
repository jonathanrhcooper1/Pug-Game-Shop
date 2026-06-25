<?php
/**
 * Repository-backed current conflict row provider for resolution routes.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use InvalidArgumentException;
use TCGStorePlatform\Offline\OfflineConflictResolutionRequest;

final class OfflineConflictResolutionCurrentRowProvider {
	private const CONFLICT_TABLE = 'tcg_sync_conflicts';

	public function __construct( private \wpdb $database ) {
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function __invoke( OfflineConflictResolutionRequest $request, ?OfflineRestRequestData $data = null ): ?array {
		unset( $data );

		$table_prefix = trim( (string) $this->database->prefix );

		if ( '' === $table_prefix || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix ) ) {
			throw new InvalidArgumentException( 'table_prefix_invalid' );
		}

		$sql_template = sprintf(
			'SELECT `conflict_id`, `status`, `entity_type`, `entity_id`, '
				. '`conflict_type`, `row_version`, `resolution_options_json` '
				. 'FROM `%s` WHERE `conflict_id` = %%s LIMIT %%d',
			$table_prefix . self::CONFLICT_TABLE
		);
		$row          = $this->database->get_row(
			$this->database->prepare(
				$sql_template, // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
				array( $request->conflict_id(), 1 )
			),
			$this->array_output()
		);

		if ( null === $row ) {
			return null;
		}

		if ( ! is_array( $row ) ) {
			throw new InvalidArgumentException( 'current_conflict_row_invalid' );
		}

		return array(
			'conflict_id'        => trim( (string) ( $row['conflict_id'] ?? '' ) ),
			'status'             => strtolower( trim( (string) ( $row['status'] ?? '' ) ) ),
			'entity_type'        => strtolower( trim( (string) ( $row['entity_type'] ?? '' ) ) ),
			'entity_id'          => trim( (string) ( $row['entity_id'] ?? '' ) ),
			'conflict_type'      => strtolower( trim( (string) ( $row['conflict_type'] ?? '' ) ) ),
			'row_version'        => $row['row_version'] ?? null,
			'resolution_options' => $this->resolution_options( $row['resolution_options_json'] ?? '[]' ),
		);
	}

	/**
	 * @return list<string>
	 */
	private function resolution_options( mixed $value ): array {
		$decoded = is_string( $value ) ? json_decode( $value, true ) : null;

		if ( ! is_array( $decoded ) ) {
			return array();
		}

		$options = array();

		foreach ( array_values( $decoded ) as $option ) {
			$option = strtolower( trim( (string) $option ) );

			if ( '' !== $option && ! in_array( $option, $options, true ) ) {
				$options[] = $option;
			}
		}

		return $options;
	}

	private function array_output(): string {
		if ( defined( 'ARRAY_A' ) ) {
			return ARRAY_A;
		}

		return 'ARRAY_A';
	}
}
