<?php
/**
 * ScryDex webhook payload parsing.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexWebhookPayloadParser {
	private const SUPPORTED_GAMES = array(
		'pokemon',
		'lorcana',
		'magicthegathering',
		'gundam',
		'onepiece',
		'riftbound',
	);

	private const SUPPORTED_EVENT_SUFFIXES = array(
		'expansions.prices.raw_updated'    => 'raw_prices',
		'expansions.prices.graded_updated' => 'graded_prices',
		'expansions.pop_reports.updated'   => 'pop_reports',
	);

	/**
	 * @return array<string, mixed>
	 */
	public function parse( string $raw_body ): array {
		$payload = json_decode( $raw_body, true );

		if ( ! is_array( $payload ) ) {
			return $this->invalid( array( 'scrydex_webhook_payload_json_invalid' ) );
		}

		$event_id   = $this->provider_event_id( $payload['id'] ?? '' );
		$event_name = $this->event_name( $payload['name'] ?? '' );
		$event      = $this->event_parts( $event_name );
		$errors     = array();

		if ( '' === $event_id ) {
			$errors[] = 'scrydex_webhook_event_id_invalid';
		}

		if ( '' === $event_name ) {
			$errors[] = 'scrydex_webhook_event_name_invalid';
		}

		if ( null === $event ) {
			$errors[] = 'scrydex_webhook_event_not_supported_by_docs';
		}

		$expansion_ids = $this->expansion_ids( $payload['data']['expansion_ids'] ?? null );
		if ( array() === $expansion_ids ) {
			$errors[] = 'scrydex_webhook_expansion_ids_missing';
		}

		if ( array() !== $errors ) {
			return $this->invalid(
				$errors,
				array(
					'event_id'   => $event_id,
					'event_name' => $event_name,
				)
			);
		}

		return array(
			'status'                         => 'valid',
			'action'                         => 'scrydex_webhook_payload_parse',
			'provider'                       => ScryDexSyncCheckpoint::PROVIDER,
			'event_id'                       => $event_id,
			'event_name'                     => $event_name,
			'game'                           => (string) $event['game'],
			'resource_type'                  => 'cards',
			'update_type'                    => (string) $event['update_type'],
			'expansion_ids'                  => $expansion_ids,
			'expansion_count'                => count( $expansion_ids ),
			'supported_event'                => true,
			'supported_event_suffixes'       => array_keys( self::SUPPORTED_EVENT_SUFFIXES ),
			'targeted_expansion_sync'        => true,
			'full_catalog_polling_requested' => false,
			'credential_values_redacted'     => true,
			'errors'                         => array(),
			'safe_payload'                   => array(
				'id'   => $event_id,
				'name' => $event_name,
				'data' => array(
					'expansion_ids' => $expansion_ids,
				),
			),
		);
	}

	/**
	 * @param list<string>          $errors Validation errors.
	 * @param array<string, mixed> $context Safe context.
	 * @return array<string, mixed>
	 */
	private function invalid( array $errors, array $context = array() ): array {
		return array_merge(
			array(
				'status'                         => 'invalid',
				'action'                         => 'scrydex_webhook_payload_parse',
				'provider'                       => ScryDexSyncCheckpoint::PROVIDER,
				'supported_event'                => false,
				'supported_event_suffixes'       => array_keys( self::SUPPORTED_EVENT_SUFFIXES ),
				'targeted_expansion_sync'        => false,
				'full_catalog_polling_requested' => false,
				'credential_values_redacted'     => true,
				'errors'                         => array_values( array_unique( $errors ) ),
			),
			$context
		);
	}

	/**
	 * @return array{game:string, update_type:string}|null
	 */
	private function event_parts( string $event_name ): ?array {
		foreach ( self::SUPPORTED_EVENT_SUFFIXES as $suffix => $update_type ) {
			$needle = '.' . $suffix;
			if ( ! str_ends_with( $event_name, $needle ) ) {
				continue;
			}

			$game = substr( $event_name, 0, -strlen( $needle ) );
			if ( in_array( $game, self::SUPPORTED_GAMES, true ) ) {
				return array(
					'game'        => $game,
					'update_type' => $update_type,
				);
			}
		}

		return null;
	}

	private function event_name( mixed $value ): string {
		$value = strtolower( trim( (string) $value ) );

		return 1 === preg_match( '/^[a-z0-9_-]+\.expansions\.(prices\.(raw_updated|graded_updated)|pop_reports\.updated)$/', $value )
			? $value
			: strtolower( trim( (string) $value ) );
	}

	private function provider_event_id( mixed $value ): string {
		$value = trim( (string) $value );
		$value = preg_replace( '/[^A-Za-z0-9_:-]+/', '-', $value ) ?? '';
		$value = trim( $value, '-' );

		return 1 === preg_match( '/^[A-Za-z0-9_:-]{1,191}$/', $value ) ? $value : '';
	}

	/**
	 * @return list<string>
	 */
	private function expansion_ids( mixed $value ): array {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$ids = array();
		foreach ( $value as $id ) {
			if ( ! is_scalar( $id ) ) {
				continue;
			}

			$id = trim( (string) $id );
			$id = preg_replace( '/[^A-Za-z0-9_:-]+/', '-', $id ) ?? '';
			$id = trim( $id, '-' );

			if ( 1 === preg_match( '/^[A-Za-z0-9_:-]{1,191}$/', $id ) ) {
				$ids[] = $id;
			}
		}

		return array_values( array_unique( array_slice( $ids, 0, 100 ) ) );
	}
}
