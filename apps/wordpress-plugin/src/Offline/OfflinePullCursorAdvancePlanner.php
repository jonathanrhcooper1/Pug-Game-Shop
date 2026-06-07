<?php
/**
 * Offline pull cursor advancement planner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePullCursorAdvancePlanner {
	/**
	 * @param array<string, mixed> $change_sets Provider change sets keyed by domain.
	 */
	public function plan(
		OfflinePullRequest $request,
		OfflinePullDeviceContextPlan $context,
		array $change_sets,
		string $server_time_utc
	): OfflinePullCursorAdvancePlan {
		$errors          = array();
		$cursor_rows     = array();
		$server_time_utc = trim( $server_time_utc );

		if ( ! $context->is_valid() ) {
			$errors[] = 'device_context_invalid';
			$errors   = array_merge( $errors, $context->errors() );
		}

		if ( ! $this->is_utc_timestamp( $server_time_utc ) ) {
			$errors[] = 'server_time_utc_invalid';
		}

		foreach ( $request->domains() as $domain ) {
			$domain = strtolower( trim( $domain ) );

			if ( ! array_key_exists( $domain, $change_sets ) ) {
				$errors[] = $domain . '_change_set_missing';
				continue;
			}

			$change_set = $change_sets[ $domain ];

			if ( ! is_array( $change_set ) ) {
				$errors[] = $domain . '_change_set_invalid';
				continue;
			}

			$cursor = $this->cursor( $change_set['cursor'] ?? ( $request->cursors()[ $domain ] ?? '' ) );

			if ( null === $cursor ) {
				$errors[] = $domain . '_cursor_invalid';
			}

			$has_more = $change_set['has_more'] ?? false;

			if ( ! is_bool( $has_more ) ) {
				$errors[] = $domain . '_has_more_invalid';
			}

			$data       = $change_set['data'] ?? array();
			$tombstones = $change_set['tombstones'] ?? array();

			if ( ! is_array( $data ) ) {
				$errors[] = $domain . '_data_invalid';
			}

			if ( ! is_array( $tombstones ) ) {
				$errors[] = $domain . '_tombstones_invalid';
			}

			if ( null === $cursor || true === $has_more || ! is_array( $data ) || ! is_array( $tombstones ) ) {
				continue;
			}

			$cursor_rows[] = array(
				'offline_device_id'     => $context->offline_device_id(),
				'device_public_id'      => $context->device_id(),
				'domain'                => $domain,
				'cursor_value'          => '' === $cursor ? null : $cursor,
				'last_server_time_utc'  => $this->mysql_datetime_utc( $server_time_utc ),
				'last_pulled_at'        => $this->mysql_datetime_utc( $server_time_utc ),
				'row_count'             => count( $data ) + count( $tombstones ),
				'row_version_next'      => 1,
				'has_more_deferred'     => false,
				'cursor_write_deferred' => true,
			);
		}

		if ( array() !== $errors ) {
			return OfflinePullCursorAdvancePlan::rejected(
				$request->device_id(),
				$errors
			);
		}

		return OfflinePullCursorAdvancePlan::accepted(
			$context->device_id(),
			$context->offline_device_id(),
			$context->table_prefix(),
			$cursor_rows
		);
	}

	private function cursor( mixed $value ): ?string {
		$cursor = trim( (string) $value );

		if ( '' === $cursor ) {
			return '';
		}

		return 1 === preg_match( '/^[a-zA-Z0-9._:-]{1,256}$/', $cursor ) ? $cursor : null;
	}

	private function is_utc_timestamp( string $value ): bool {
		return 1 === preg_match( '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/', $value );
	}

	private function mysql_datetime_utc( string $value ): string {
		return rtrim( str_replace( 'T', ' ', $value ), 'Z' );
	}
}
