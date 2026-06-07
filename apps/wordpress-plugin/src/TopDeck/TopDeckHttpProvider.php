<?php
/**
 * TopDeck HTTP provider adapter.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\TopDeck;

use RuntimeException;
use TCGStorePlatform\Logging\Redactor;

final class TopDeckHttpProvider implements TopDeckProvider {
	private string $api_key;
	private string $base_url;
	private mixed $transport;

	/**
	 * @param callable|null $transport Optional test transport.
	 */
	public function __construct( string $api_key = '', string $base_url = 'https://topdeck.gg/api', ?callable $transport = null ) {
		$this->api_key   = trim( $api_key );
		$this->base_url  = rtrim( $base_url, '/' );
		$this->transport = $transport;
	}

	public function get_my_tournaments(): TopDeckResult {
		return $this->request( 'GET', '/v2/me/tournaments' );
	}

	// phpcs:ignore WordPress.NamingConventions.ValidFunctionName.MethodNameInvalid
	public function getMyTournaments(): TopDeckResult {
		return $this->get_my_tournaments();
	}

	public function get_tournament_info( string $tid ): TopDeckResult {
		return $this->request( 'GET', '/v2/tournaments/' . rawurlencode( $tid ) );
	}

	// phpcs:ignore WordPress.NamingConventions.ValidFunctionName.MethodNameInvalid
	public function getTournamentInfo( string $tid ): TopDeckResult {
		return $this->get_tournament_info( $tid );
	}

	public function get_attendees( string $tid ): TopDeckResult {
		return $this->request( 'GET', '/v2/tournaments/' . rawurlencode( $tid ) . '/attendees' );
	}

	// phpcs:ignore WordPress.NamingConventions.ValidFunctionName.MethodNameInvalid
	public function getAttendees( string $tid ): TopDeckResult {
		return $this->get_attendees( $tid );
	}

	/**
	 * @param list<string> $emails Player emails.
	 */
	public function register_players( string $tid, array $emails, bool $override_cap = false ): TopDeckResult {
		$emails = array_values(
			array_filter(
				array_map( 'trim', $emails ),
				static fn ( string $email ): bool => '' !== $email
			)
		);

		if ( array() === $emails ) {
			return new TopDeckResult( TopDeckResult::FAILED, 0, array(), 'topdeck_missing_email', 'At least one email is required.' );
		}

		return $this->request(
			'POST',
			'/v2/tournaments/' . rawurlencode( $tid ) . '/register',
			array(
				'emails'      => $emails,
				'overrideCap' => $override_cap,
			)
		);
	}

	/**
	 * @param list<string> $emails Player emails.
	 */
	// phpcs:ignore WordPress.NamingConventions.ValidFunctionName.MethodNameInvalid
	public function registerPlayers( string $tid, array $emails, bool $override_cap = false ): TopDeckResult {
		return $this->register_players( $tid, $emails, $override_cap );
	}

	public function sync_event_from_topdeck( string $tid ): TopDeckResult {
		return $this->get_tournament_info( $tid );
	}

	// phpcs:ignore WordPress.NamingConventions.ValidFunctionName.MethodNameInvalid
	public function syncEventFromTopDeck( string $tid ): TopDeckResult {
		return $this->sync_event_from_topdeck( $tid );
	}

	public function import_owned_events(): TopDeckResult {
		return $this->get_my_tournaments();
	}

	// phpcs:ignore WordPress.NamingConventions.ValidFunctionName.MethodNameInvalid
	public function importOwnedEvents(): TopDeckResult {
		return $this->import_owned_events();
	}

	/**
	 * @param array<string, mixed> $event_data Event payload.
	 */
	public function create_event( array $event_data ): TopDeckResult {
		unset( $event_data );

		return TopDeckResult::not_supported(
			'TopDeck create-event is disabled until a documented or private create endpoint is configured.'
		);
	}

	/**
	 * @param array<string, mixed> $event_data Event payload.
	 */
	// phpcs:ignore WordPress.NamingConventions.ValidFunctionName.MethodNameInvalid
	public function createEvent( array $event_data ): TopDeckResult {
		return $this->create_event( $event_data );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function sanitized_auth_context(): array {
		return Redactor::redact(
			array(
				'base_url'      => $this->base_url,
				'authorization' => '' === $this->api_key ? '' : 'Bearer ' . $this->api_key,
			)
		);
	}

	/**
	 * @param array<string, mixed> $payload Request payload.
	 */
	private function request( string $method, string $path, array $payload = array() ): TopDeckResult {
		if ( '' === $this->api_key ) {
			return TopDeckResult::not_configured( 'TopDeck API key is not configured.' );
		}

		$response = $this->send(
			$method,
			$this->base_url . $path,
			array(
				'headers' => array(
					'Authorization' => 'Bearer ' . $this->api_key,
					'Content-Type'  => 'application/json',
				),
				'body'    => $payload,
			)
		);

		return $this->normalize_response( $response );
	}

	/**
	 * @param array<string, mixed> $args Request arguments.
	 * @return array{status:int,body:mixed}
	 */
	private function send( string $method, string $url, array $args ): array {
		if ( is_callable( $this->transport ) ) {
			$response = ( $this->transport )( $method, $url, $args );

			if ( ! is_array( $response ) || ! isset( $response['status'] ) ) {
				throw new RuntimeException( 'TopDeck transport must return a status-bearing array.' );
			}

			return array(
				'status' => (int) $response['status'],
				'body'   => $response['body'] ?? array(),
			);
		}

		if ( ! function_exists( 'wp_remote_request' ) ) {
			throw new RuntimeException( 'WordPress HTTP API is unavailable.' );
		}

		$response = wp_remote_request(
			$url,
			array(
				'method'  => $method,
				'headers' => $args['headers'],
				'body'    => array() === $args['body'] ? null : wp_json_encode( $args['body'] ),
				'timeout' => 15,
			)
		);

		if ( is_wp_error( $response ) ) {
			return array(
				'status' => 0,
				'body'   => array(
					'result'  => 'failed',
					'message' => $response->get_error_message(),
				),
			);
		}

		$body = json_decode( (string) wp_remote_retrieve_body( $response ), true );

		return array(
			'status' => (int) wp_remote_retrieve_response_code( $response ),
			'body'   => is_array( $body ) ? $body : array(),
		);
	}

	/**
	 * @param array{status:int,body:mixed} $response Raw response.
	 */
	private function normalize_response( array $response ): TopDeckResult {
		$http_status = (int) $response['status'];
		$body        = is_array( $response['body'] ) ? $response['body'] : array();
		$result      = isset( $body['result'] ) ? (string) $body['result'] : '';

		if ( 409 === $http_status ) {
			return new TopDeckResult( TopDeckResult::CAPACITY_CONFLICT, $http_status, $body, 'topdeck_capacity_conflict', 'TopDeck reported a capacity conflict.' );
		}

		return match ( $result ) {
			'registered' => new TopDeckResult( TopDeckResult::REGISTERED, $http_status, $body ),
			'pending_invitation' => new TopDeckResult( TopDeckResult::PENDING_INVITATION, $http_status, $body ),
			'already_registered' => new TopDeckResult( TopDeckResult::ALREADY_REGISTERED, $http_status, $body ),
			'capacity_conflict' => new TopDeckResult( TopDeckResult::CAPACITY_CONFLICT, $http_status, $body, 'topdeck_capacity_conflict', 'TopDeck reported a capacity conflict.' ),
			'failed' => new TopDeckResult( TopDeckResult::FAILED, $http_status, $body, self::error_code_from_body( $body ), (string) ( $body['message'] ?? $body['reason'] ?? '' ) ),
			default => $http_status >= 200 && $http_status < 300
				? new TopDeckResult( TopDeckResult::SUCCESS, $http_status, $body )
				: new TopDeckResult( TopDeckResult::FAILED, $http_status, $body, self::error_code_from_body( $body ), (string) ( $body['message'] ?? '' ) ),
		};
	}

	/**
	 * @param array<string, mixed> $body Response body.
	 */
	private static function error_code_from_body( array $body ): string {
		if ( isset( $body['reason'] ) && '' !== (string) $body['reason'] ) {
			return 'topdeck_' . self::normalize_error_code( (string) $body['reason'] );
		}

		if ( isset( $body['error'] ) && '' !== (string) $body['error'] ) {
			return 'topdeck_' . self::normalize_error_code( (string) $body['error'] );
		}

		return 'topdeck_failed';
	}

	private static function normalize_error_code( string $value ): string {
		$value = strtolower( $value );
		$value = preg_replace( '/[^a-z0-9_]+/', '_', $value ) ?? $value;
		$value = trim( $value, '_' );

		return '' === $value ? 'failed' : $value;
	}
}
