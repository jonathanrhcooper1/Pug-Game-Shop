<?php
/**
 * ScryDex webhook event log repository.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexWebhookEventRepository {
	public function __construct(
		private ?\wpdb $database = null
	) {
	}

	/**
	 * @param array<string, mixed> $event Parsed webhook event.
	 * @return array<string, mixed>
	 */
	public function record( array $event, string $payload_hash, string $signature_status, string $processing_status ): array {

		if ( null === $this->database ) {
			return $this->result( 'deferred', array( 'scrydex_webhook_event_database_not_configured' ) );
		}

		$prefix = trim( (string) $this->database->prefix );
		if ( '' === $prefix || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $prefix ) ) {
			return $this->result( 'rejected', array( 'scrydex_webhook_event_database_prefix_invalid' ) );
		}

		$table_name = $prefix . 'tcg_webhook_events';
		$event_id   = trim( (string) ( $event['event_id'] ?? '' ) );
		$event_name = trim( (string) ( $event['event_name'] ?? '' ) );
		$safe_body  = $this->json_encode( $event['safe_payload'] ?? array() );

		if ( '' === $event_id || '' === $event_name || '' === $safe_body ) {
			return $this->result( 'rejected', array( 'scrydex_webhook_event_log_payload_invalid' ) );
		}

		$sql = $this->database->prepare(
			"INSERT INTO {$table_name} (provider_name, provider_event_id, event_type, signature_status, payload_hash, payload_body, processing_status, received_at, processed_at)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NULL)
ON DUPLICATE KEY UPDATE provider_event_id = provider_event_id", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			array(
				ScryDexSyncCheckpoint::PROVIDER,
				$event_id,
				$event_name,
				$this->status_value( $signature_status, 'verified' ),
				$payload_hash,
				$safe_body,
				$this->status_value( $processing_status, 'queued' ),
				gmdate( 'Y-m-d H:i:s' ),
			)
		);

		if ( ! is_string( $sql ) || '' === $sql ) {
			return $this->result( 'rejected', array( 'scrydex_webhook_event_log_prepare_failed' ) );
		}

		$rows = $this->database->query( $sql ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		if ( false === $rows ) {
			return $this->result( 'rejected', array( 'scrydex_webhook_event_log_insert_failed' ) );
		}

		return array(
			'status'                       => 0 === (int) $rows ? 'duplicate' : 'logged',
			'action'                       => 'scrydex_webhook_event_log_record',
			'provider'                     => ScryDexSyncCheckpoint::PROVIDER,
			'provider_event_id'            => $event_id,
			'event_type'                   => $event_name,
			'signature_status'             => $this->status_value( $signature_status, 'verified' ),
			'processing_status'            => $this->status_value( $processing_status, 'queued' ),
			'payload_hash'                 => $payload_hash,
			'payload_body_contains_secret' => false,
			'credential_values_redacted'   => true,
			'rows_affected'                => (int) $rows,
			'errors'                       => array(),
		);
	}

	/**
		* Mark a verified event ready for the authenticated LAN relay.
		*
	 * @return array<string, mixed>
		*/
	public function mark_ready_for_lan( string $provider_event_id ): array {

		if ( null === $this->database ) {
			return $this->result( 'deferred', array( 'scrydex_webhook_event_database_not_configured' ) );
		}

		$table_name = $this->table_name();
		$event_id   = $this->event_id( $provider_event_id );
		if ( '' === $table_name || '' === $event_id ) {
			return $this->result( 'rejected', array( 'scrydex_webhook_event_relay_identifier_invalid' ) );
		}

		$sql  = $this->database->prepare(
			"UPDATE {$table_name}
			SET processing_status = 'ready_for_lan', next_attempt_at = NULL
			WHERE provider_name = %s AND provider_event_id = %s AND processing_status = 'queued'", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			ScryDexSyncCheckpoint::PROVIDER,
			$event_id
		);
		$rows = is_string( $sql ) ? $this->database->query( $sql ) : false; // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return array(
			'status'                     => false === $rows ? 'rejected' : 'ready',
			'action'                     => 'scrydex_webhook_event_ready_for_lan',
			'provider_event_id'          => $event_id,
			'rows_affected'              => false === $rows ? 0 : (int) $rows,
			'credential_values_redacted' => true,
			'errors'                     => false === $rows ? array( 'scrydex_webhook_event_relay_update_failed' ) : array(),
		);
	}

	/**
		* Return due verified events for the authenticated LAN poller.
		*
	 * @return list<array<string, mixed>>
	 */
	public function due_for_lan( int $limit = 25 ): array {

		if ( null === $this->database ) {
			return array();
		}

		$table_name = $this->table_name();
		if ( '' === $table_name ) {
			return array();
		}

		$limit = max( 1, min( 100, $limit ) );
		$now   = gmdate( 'Y-m-d H:i:s.u' );
		$sql   = $this->database->prepare(
			"SELECT provider_event_id, event_type, payload_hash, payload_body, processing_status,
				relay_attempt_count, received_at, next_attempt_at
			FROM {$table_name}
			WHERE provider_name = %s
				AND signature_status = 'verified'
				AND (
					(processing_status IN ('queued', 'ready_for_lan', 'retry') AND (next_attempt_at IS NULL OR next_attempt_at <= %s))
					OR (processing_status = 'processing' AND next_attempt_at IS NOT NULL AND next_attempt_at <= %s)
				)
			ORDER BY received_at ASC
			LIMIT %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			ScryDexSyncCheckpoint::PROVIDER,
			$now,
			$now,
			$limit
		);

		if ( ! is_string( $sql ) ) {
			return array();
		}

		$rows = $this->database->get_results( $sql, ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		if ( ! is_array( $rows ) ) {
			return array();
		}

		$events = array();
		foreach ( $rows as $row ) {
			$payload = json_decode( (string) ( $row['payload_body'] ?? '' ), true );
			if ( ! is_array( $payload ) ) {
				continue;
			}

			$events[] = array(
				'id'                  => (string) ( $row['provider_event_id'] ?? '' ),
				'name'                => (string) ( $row['event_type'] ?? '' ),
				'data'                => is_array( $payload['data'] ?? null ) ? $payload['data'] : array(),
				'payload_hash'        => (string) ( $row['payload_hash'] ?? '' ),
				'processing_status'   => (string) ( $row['processing_status'] ?? '' ),
				'relay_attempt_count' => (int) ( $row['relay_attempt_count'] ?? 0 ),
				'received_at'         => (string) ( $row['received_at'] ?? '' ),
				'next_attempt_at'     => (string) ( $row['next_attempt_at'] ?? '' ),
			);
		}

		return $events;
	}

	/**
		* Claim, complete, retry, or dead-letter a LAN relay event.
		*
	 * @return array<string, mixed>
		*/
	public function transition_for_lan(
		string $provider_event_id,
		string $status,
		string $result_reference = '',
		string $error_code = '',
		string $error_message = ''
	): array {

		if ( null === $this->database ) {
			return $this->result( 'deferred', array( 'scrydex_webhook_event_database_not_configured' ) );
		}

		$table_name = $this->table_name();
		$event_id   = $this->event_id( $provider_event_id );
		$status     = strtolower( trim( $status ) );
		if ( '' === $table_name || '' === $event_id || ! in_array( $status, array( 'processing', 'processed', 'retry', 'dead_letter' ), true ) ) {
			return $this->result( 'rejected', array( 'scrydex_webhook_event_relay_transition_invalid' ) );
		}

		$row = $this->event_row( $table_name, $event_id );
		if ( null === $row ) {
			return $this->result( 'not_found', array( 'scrydex_webhook_event_not_found' ) );
		}

		$attempt_count = (int) ( $row['relay_attempt_count'] ?? 0 );
		$now           = gmdate( 'Y-m-d H:i:s.u' );
		$next_attempt  = null;
		$processed_at  = null;
		if ( 'processing' === $status ) {
			++$attempt_count;
			$next_attempt = gmdate( 'Y-m-d H:i:s.u', time() + 15 * 60 );
		} elseif ( 'retry' === $status ) {
			$delay_seconds = min( 3600, 30 * ( 2 ** max( 0, $attempt_count - 1 ) ) );
			$next_attempt  = gmdate( 'Y-m-d H:i:s.u', time() + $delay_seconds );
		} else {
			$processed_at = $now;
		}

		$claim_guard = 'processing' === $status
			? " AND (processing_status IN ('queued', 'ready_for_lan', 'retry') OR (processing_status = 'processing' AND next_attempt_at IS NOT NULL AND next_attempt_at <= %s))"
			: '';
		$sql         = $this->database->prepare(
			"UPDATE {$table_name}
			SET processing_status = %s,
				relay_attempt_count = %d,
				next_attempt_at = %s,
				result_reference = %s,
				last_error_code = %s,
				last_error_message = %s,
				processed_at = %s
			WHERE provider_name = %s AND provider_event_id = %s{$claim_guard}", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			$status,
			$attempt_count,
			$next_attempt,
			substr( trim( $result_reference ), 0, 191 ),
			substr( trim( $error_code ), 0, 100 ),
			substr( trim( $error_message ), 0, 255 ),
			$processed_at,
			ScryDexSyncCheckpoint::PROVIDER,
			$event_id,
			...( 'processing' === $status ? array( $now ) : array() )
		);
		$rows        = is_string( $sql ) ? $this->database->query( $sql ) : false; // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return array(
			'status'                     => false === $rows ? 'rejected' : ( 'processing' === $status && 0 === (int) $rows ? 'not_claimed' : 'ok' ),
			'action'                     => 'scrydex_webhook_event_relay_transition',
			'provider_event_id'          => $event_id,
			'processing_status'          => $status,
			'relay_attempt_count'        => $attempt_count,
			'next_attempt_at'            => $next_attempt,
			'rows_affected'              => false === $rows ? 0 : (int) $rows,
			'credential_values_redacted' => true,
			'errors'                     => false === $rows ? array( 'scrydex_webhook_event_relay_transition_failed' ) : array(),
		);
	}
	/**
	 * @param list<string> $errors Repository errors.
	 * @return array<string, mixed>
	 */
	private function result( string $status, array $errors ): array {
		return array(
			'status'                     => $status,
			'action'                     => 'scrydex_webhook_event_log_record',
			'provider'                   => ScryDexSyncCheckpoint::PROVIDER,
			'credential_values_redacted' => true,
			'errors'                     => array_values( array_unique( $errors ) ),
		);
	}

	private function status_value( string $value, string $fallback ): string {

		$value = strtolower( trim( $value ) );
		$value = preg_replace( '/[^a-z0-9_-]+/', '_', $value ) ?? '';
		$value = trim( $value, '_' );

		return '' === $value ? $fallback : substr( $value, 0, 32 );
	}

	private function table_name(): string {

		$prefix = null === $this->database ? '' : trim( (string) $this->database->prefix );

			return '' !== $prefix && 1 === preg_match( '/^[A-Za-z0-9_]+$/', $prefix )
			? $prefix . 'tcg_webhook_events'
			: '';
	}

	private function event_id( string $value ): string {

			$value = trim( $value );

		return 1 === preg_match( '/^[A-Za-z0-9_:-]{1,191}$/', $value ) ? $value : '';
	}

	/**
		* @return array<string, mixed>|null
		*/
	private function event_row( string $table_name, string $event_id ): ?array {

		$sql = $this->database?->prepare(
			"SELECT provider_event_id, processing_status, relay_attempt_count
			FROM {$table_name}
			WHERE provider_name = %s AND provider_event_id = %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			ScryDexSyncCheckpoint::PROVIDER,
			$event_id
		);

		if ( ! is_string( $sql ) ) {
			return null;
		}

		$row = $this->database?->get_row( $sql, ARRAY_A ); // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared

		return is_array( $row ) ? $row : null;
	}
	private function json_encode( mixed $value ): string {
		$json = function_exists( 'wp_json_encode' )
			? wp_json_encode( $value, JSON_UNESCAPED_SLASHES )
			: json_encode( $value, JSON_UNESCAPED_SLASHES );

		return is_string( $json ) ? $json : '';
	}
}
