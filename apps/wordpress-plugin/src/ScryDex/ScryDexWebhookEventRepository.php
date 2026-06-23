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

	private function json_encode( mixed $value ): string {
		$json = function_exists( 'wp_json_encode' )
			? wp_json_encode( $value, JSON_UNESCAPED_SLASHES )
			: json_encode( $value, JSON_UNESCAPED_SLASHES );

		return is_string( $json ) ? $json : '';
	}
}
