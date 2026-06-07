<?php
/**
 * ScryDex HTTP provider adapter.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

use RuntimeException;
use TCGStorePlatform\Logging\Redactor;

final class ScryDexHttpProvider implements ScryDexProvider {
	private string $api_key;
	private string $team_id;
	private string $base_url;
	private mixed $transport;

	/**
	 * @param callable|null $transport Optional test transport.
	 */
	public function __construct(
		string $api_key = '',
		string $team_id = '',
		string $base_url = 'https://api.scrydex.com',
		?callable $transport = null
	) {
		$this->api_key   = trim( $api_key );
		$this->team_id   = trim( $team_id );
		$this->base_url  = rtrim( $base_url, '/' );
		$this->transport = $transport;
	}

	/**
	 * @param array<string, string> $filters Provider search filters.
	 */
	public function search_cards(
		string $query = '',
		array $filters = array(),
		int $page = 1,
		string $cursor = ''
	): ScryDexResult {
		$params = array_merge(
			$filters,
			array(
				'query'  => $query,
				'page'   => (string) max( 1, $page ),
				'cursor' => trim( $cursor ),
			)
		);
		$params = array_filter(
			$params,
			static fn ( string $value ): bool => '' !== trim( $value )
		);

		return $this->request( 'GET', '/cards/search?' . http_build_query( $params ) );
	}

	/**
	 * @param array<string, string> $filters Provider search filters.
	 */
	// phpcs:ignore WordPress.NamingConventions.ValidFunctionName.MethodNameInvalid
	public function searchCards(
		string $query = '',
		array $filters = array(),
		int $page = 1,
		string $cursor = ''
	): ScryDexResult {
		return $this->search_cards( $query, $filters, $page, $cursor );
	}

	public function get_card( string $provider_card_id ): ScryDexResult {
		return $this->request( 'GET', '/cards/' . rawurlencode( trim( $provider_card_id ) ) );
	}

	// phpcs:ignore WordPress.NamingConventions.ValidFunctionName.MethodNameInvalid
	public function getCard( string $provider_card_id ): ScryDexResult {
		return $this->get_card( $provider_card_id );
	}

	public function get_usage(): ScryDexResult {
		return $this->request( 'GET', '/account/v1/usage' );
	}

	// phpcs:ignore WordPress.NamingConventions.ValidFunctionName.MethodNameInvalid
	public function getUsage(): ScryDexResult {
		return $this->get_usage();
	}

	public function register_webhook( string $event_type, string $callback_url ): ScryDexResult {
		unset( $event_type, $callback_url );

		return ScryDexResult::not_supported(
			'ScryDex webhook registration stays disabled until account capability is verified.'
		);
	}

	// phpcs:ignore WordPress.NamingConventions.ValidFunctionName.MethodNameInvalid
	public function registerWebhook( string $event_type, string $callback_url ): ScryDexResult {
		return $this->register_webhook( $event_type, $callback_url );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function sanitized_auth_context(): array {
		return Redactor::redact(
			array(
				'base_url'  => $this->base_url,
				'x-api-key' => $this->api_key,
				'x-team-id' => $this->team_id,
			)
		);
	}

	private function request( string $method, string $path ): ScryDexResult {
		if ( '' === $this->api_key || '' === $this->team_id ) {
			return ScryDexResult::not_configured( 'ScryDex API key and team ID are required.' );
		}

		$response = $this->send(
			$method,
			$this->base_url . $path,
			array(
				'headers' => array(
					'X-Api-Key' => $this->api_key,
					'X-Team-ID' => $this->team_id,
					'Accept'    => 'application/json',
				),
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
				throw new RuntimeException( 'ScryDex transport must return a status-bearing array.' );
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
				'timeout' => 15,
			)
		);

		if ( is_wp_error( $response ) ) {
			return array(
				'status' => 0,
				'body'   => array(
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
	private function normalize_response( array $response ): ScryDexResult {
		$http_status = (int) $response['status'];
		$body        = is_array( $response['body'] ) ? $response['body'] : array();

		if ( 401 === $http_status || 403 === $http_status ) {
			return new ScryDexResult(
				ScryDexResult::UNAUTHORIZED,
				$http_status,
				$body,
				'scrydex_unauthorized',
				'ScryDex rejected the configured credentials.'
			);
		}

		if ( 429 === $http_status ) {
			return new ScryDexResult(
				ScryDexResult::RATE_LIMITED,
				$http_status,
				$body,
				'scrydex_rate_limited',
				'ScryDex rate limit was reached.'
			);
		}

		if ( $http_status >= 200 && $http_status < 300 ) {
			return new ScryDexResult( ScryDexResult::SUCCESS, $http_status, $body );
		}

		return new ScryDexResult(
			ScryDexResult::FAILED,
			$http_status,
			$body,
			$this->error_code_from_body( $body ),
			(string) ( $body['message'] ?? '' )
		);
	}

	/**
	 * @param array<string, mixed> $body Response body.
	 */
	private function error_code_from_body( array $body ): string {
		if ( isset( $body['error'] ) && '' !== (string) $body['error'] ) {
			return 'scrydex_' . $this->normalize_error_code( (string) $body['error'] );
		}

		if ( isset( $body['code'] ) && '' !== (string) $body['code'] ) {
			return 'scrydex_' . $this->normalize_error_code( (string) $body['code'] );
		}

		return 'scrydex_failed';
	}

	private function normalize_error_code( string $value ): string {
		$value = strtolower( $value );
		$value = preg_replace( '/[^a-z0-9_]+/', '_', $value ) ?? $value;
		$value = trim( $value, '_' );

		return '' === $value ? 'failed' : $value;
	}
}
