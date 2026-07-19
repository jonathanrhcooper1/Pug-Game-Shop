<?php
/**
 * ScryDex webhook sync dispatcher.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexWebhookSyncDispatcher {
	public const ACTION = 'tcg_store_platform_scrydex_webhook_refresh';

	/**
	 * @param array<string, mixed> $event Parsed webhook event.
	 * @return array<string, mixed>
	 */
	public function dispatch( array $event ): array {
		$payload = $this->payload( $event );

		if ( array() === ( $payload['expansion_ids'] ?? array() ) ) {
			return $this->result( 'rejected', array( 'scrydex_webhook_dispatch_expansion_ids_missing' ), $payload );
		}

		if ( ! function_exists( 'wp_schedule_single_event' ) ) {
			return $this->result( 'failed', array( 'scrydex_webhook_dispatch_scheduler_unavailable' ), $payload );
		}

		if ( $this->is_already_scheduled( $payload ) ) {
			return $this->result( 'scheduled_existing', array(), $payload );
		}

		$scheduled = wp_schedule_single_event( time() + 1, self::ACTION, array( $payload ) );
		if ( is_object( $scheduled ) && is_a( $scheduled, '\WP_Error' ) ) {
			return $this->result( 'failed', array( 'scrydex_webhook_dispatch_scheduler_error' ), $payload );
		}

		if ( false === $scheduled ) {
			if ( $this->is_already_scheduled( $payload ) ) {
				return $this->result( 'scheduled_existing', array(), $payload );
			}

			return $this->result( 'failed', array( 'scrydex_webhook_dispatch_schedule_failed' ), $payload );
		}

		return $this->result( 'scheduled', array(), $payload );
	}

	/**
	 * @param array<string, mixed> $payload Safe scheduled payload.
	 */
	private function is_already_scheduled( array $payload ): bool {
		return function_exists( 'wp_next_scheduled' )
			&& false !== wp_next_scheduled( self::ACTION, array( $payload ) );
	}

	/**
	 * @param array<string, mixed> $event Parsed webhook event.
	 * @return array<string, mixed>
	 */
	private function payload( array $event ): array {
		$expansion_ids = $event['expansion_ids'] ?? array();
		$expansion_ids = is_array( $expansion_ids ) ? array_values( $expansion_ids ) : array();

		return array(
			'provider'                       => ScryDexSyncCheckpoint::PROVIDER,
			'event_id'                       => (string) ( $event['event_id'] ?? '' ),
			'event_name'                     => (string) ( $event['event_name'] ?? '' ),
			'game'                           => (string) ( $event['game'] ?? '' ),
			'update_type'                    => (string) ( $event['update_type'] ?? '' ),
			'resource_type'                  => 'cards',
			'expansion_ids'                  => array_values(
				array_filter(
					array_map(
						static fn ( mixed $value ): string => is_scalar( $value ) ? trim( (string) $value ) : '',
						$expansion_ids
					),
					static fn ( string $value ): bool => '' !== $value
				)
			),
			'targeted_expansion_sync'        => true,
			'full_catalog_polling_requested' => false,
			'credential_values_redacted'     => true,
		);
	}

	/**
	 * @param list<string>          $errors Dispatch errors.
	 * @param array<string, mixed> $payload Safe scheduled payload.
	 * @return array<string, mixed>
	 */
	private function result( string $status, array $errors, array $payload ): array {
		return array(
			'status'                         => $status,
			'action'                         => 'scrydex_webhook_targeted_sync_dispatch',
			'scheduler_action'               => self::ACTION,
			'scheduled_payload'              => $payload,
			'targeted_expansion_sync'        => true,
			'full_catalog_polling_requested' => false,
			'credential_values_redacted'     => true,
			'errors'                         => array_values( array_unique( $errors ) ),
		);
	}
}
