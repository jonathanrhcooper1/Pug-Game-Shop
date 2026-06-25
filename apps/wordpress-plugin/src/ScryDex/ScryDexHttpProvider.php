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
	private const MAX_PAGE_SIZE = 100;

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
		$game = $this->game_endpoint( $filters['game'] ?? 'pokemon' );
		unset( $filters['game'] );
		$filters = $this->with_price_include( $filters );

		$params = array_merge(
			$filters,
			array(
				'q'        => $query,
				'page'     => (string) max( 1, $page ),
				'page_size' => (string) min( self::MAX_PAGE_SIZE, max( 1, (int) ( $filters['page_size'] ?? 100 ) ) ),
				'cursor'   => trim( $cursor ),
			)
		);

		$params = array_filter(
			$params,
			static fn ( string $value ): bool => '' !== trim( $value )
		);

		return $this->request(
			'GET',
			'/' . $game . '/v1/cards?' . http_build_query( $params ),
			array(
				'game'     => $game,
				'resource' => 'cards',
			)
		);
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
		return $this->request(
			'GET',
			'/pokemon/v1/cards/' . rawurlencode( trim( $provider_card_id ) ),
			array(
				'game'     => 'pokemon',
				'resource' => 'cards',
			)
		);
	}

	/**
	 * @param array<string, string> $filters Provider price-history filters.
	 */
	public function get_card_price_history( string $provider_card_id, array $filters = array() ): ScryDexResult {
		$game = $this->game_endpoint( $filters['game'] ?? 'pokemon' );
		unset( $filters['game'] );

		$params = array_merge(
			$filters,
			array(
				'page'      => (string) max( 1, (int) ( $filters['page'] ?? 1 ) ),
				'page_size' => (string) min( self::MAX_PAGE_SIZE, max( 1, (int) ( $filters['page_size'] ?? 30 ) ) ),
			)
		);

		$params = array_filter(
			$params,
			static fn ( string $value ): bool => '' !== trim( $value )
		);

		return $this->request(
			'GET',
			'/' . $game . '/v1/cards/' . rawurlencode( trim( $provider_card_id ) ) . '/price_history?' . http_build_query( $params ),
			array(
				'game'     => $game,
				'resource' => 'price_history',
			)
		);
	}

	// phpcs:ignore WordPress.NamingConventions.ValidFunctionName.MethodNameInvalid
	public function getCardPriceHistory( string $provider_card_id, array $filters = array() ): ScryDexResult {
		return $this->get_card_price_history( $provider_card_id, $filters );
	}

	/**
	 * @param array<string, string> $filters Provider expansion filters.
	 */
	public function search_expansions(
		string $query = '',
		array $filters = array(),
		int $page = 1,
		string $cursor = ''
	): ScryDexResult {
		$game = $this->game_endpoint( $filters['game'] ?? 'pokemon' );
		unset( $filters['game'] );

		$params = array_merge(
			$filters,
			array(
				'q'        => $query,
				'page'     => (string) max( 1, $page ),
				'page_size' => (string) min( self::MAX_PAGE_SIZE, max( 1, (int) ( $filters['page_size'] ?? 100 ) ) ),
				'cursor'   => trim( $cursor ),
			)
		);

		$params = array_filter(
			$params,
			static fn ( string $value ): bool => '' !== trim( $value )
		);

		return $this->request(
			'GET',
			'/' . $game . '/v1/expansions?' . http_build_query( $params ),
			array(
				'game'     => $game,
				'resource' => 'expansions',
			)
		);
	}

	/**
	 * @param array<string, string> $filters Provider search filters.
	 */
	public function search_expansion_cards(
		string $expansion_id,
		string $query = '',
		array $filters = array(),
		int $page = 1,
		string $cursor = ''
	): ScryDexResult {
		$game = $this->game_endpoint( $filters['game'] ?? 'pokemon' );
		unset( $filters['game'] );
		$filters = $this->with_price_include( $filters );

		$params = array_merge(
			$filters,
			array(
				'q'        => $query,
				'page'     => (string) max( 1, $page ),
				'page_size' => (string) min( self::MAX_PAGE_SIZE, max( 1, (int) ( $filters['page_size'] ?? 100 ) ) ),
				'cursor'   => trim( $cursor ),
			)
		);

		$params = array_filter(
			$params,
			static fn ( string $value ): bool => '' !== trim( $value )
		);

		return $this->request(
			'GET',
			'/' . $game . '/v1/expansions/' . rawurlencode( trim( $expansion_id ) ) . '/cards?' . http_build_query( $params ),
			array(
				'game'     => $game,
				'resource' => 'cards',
			)
		);
	}

	// phpcs:ignore WordPress.NamingConventions.ValidFunctionName.MethodNameInvalid
	public function getCard( string $provider_card_id ): ScryDexResult {
		return $this->get_card( $provider_card_id );
	}

	public function get_usage(): ScryDexResult {
		return $this->request( 'GET', '/account/v1/usage' );
	}

	/**
	 * @param array<string, string> $filters Provider request filters.
	 * @return array<string, string>
	 */
	private function with_price_include( array $filters ): array {
		$include = trim( (string) ( $filters['include'] ?? '' ) );
		$required_includes = array( 'prices', 'pop_reports' );

		if ( '' === $include ) {
			$filters['include'] = implode( ',', $required_includes );
			return $filters;
		}

		$parts = array_values(
			array_filter(
				array_map(
					static fn ( string $part ): string => strtolower( trim( $part ) ),
					explode( ',', $include )
				),
				static fn ( string $part ): bool => '' !== $part
			)
		);

		$missing = array_values(
			array_filter(
				$required_includes,
				static fn ( string $part ): bool => ! in_array( $part, $parts, true )
			)
		);

		if ( $missing ) {
			$filters['include'] = $include . ',' . implode( ',', $missing );
		}

		return $filters;
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

	/**
	 * @param array<string, mixed> $context Request context for response normalization.
	 */
	private function request( string $method, string $path, array $context = array() ): ScryDexResult {
		if ( '' === $this->api_key || '' === $this->team_id ) {
			return ScryDexResult::not_configured( 'ScryDex API key and team ID are required.' );
		}

		$request_meta = array(
			'method' => $method,
			'path'   => $path,
			'game'   => (string) ( $context['game'] ?? '' ),
			'resource' => (string) ( $context['resource'] ?? '' ),
		);

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

		return $this->normalize_response(
			$response,
			array_merge(
				$context,
				array(
					'request_meta' => $request_meta,
				)
			)
		);
	}

	/**
	 * @param array<string, mixed> $args Request arguments.
	 * @return array{status:int,body:mixed,response_message?:string,body_excerpt?:string}
	 */
	private function send( string $method, string $url, array $args ): array {
		if ( is_callable( $this->transport ) ) {
			$response = ( $this->transport )( $method, $url, $args );

			if ( ! is_array( $response ) || ! isset( $response['status'] ) ) {
				throw new RuntimeException( 'ScryDex transport must return a status-bearing array.' );
			}

			return array(
				'status'           => (int) $response['status'],
				'body'             => $response['body'] ?? array(),
				'response_message' => is_scalar( $response['response_message'] ?? null ) ? (string) $response['response_message'] : '',
				'body_excerpt'     => is_scalar( $response['body_excerpt'] ?? null ) ? (string) $response['body_excerpt'] : '',
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
				'status'           => 0,
				'body'             => array(
					'message' => $response->get_error_message(),
				),
				'response_message' => $response->get_error_message(),
				'body_excerpt'     => '',
			);
		}

		$raw_body = (string) wp_remote_retrieve_body( $response );
		$body     = json_decode( $raw_body, true );

		return array(
			'status'           => (int) wp_remote_retrieve_response_code( $response ),
			'body'             => is_array( $body ) ? $body : array(),
			'response_message' => (string) wp_remote_retrieve_response_message( $response ),
			'body_excerpt'     => is_array( $body ) ? '' : $this->body_excerpt( $raw_body ),
		);
	}

	/**
	 * @param array{status:int,body:mixed,response_message?:string,body_excerpt?:string} $response Raw response.
	 * @param array<string, mixed>         $context Request context for response normalization.
	 */
	private function normalize_response( array $response, array $context = array() ): ScryDexResult {
		$http_status = (int) $response['status'];
		$body        = is_array( $response['body'] ) ? $response['body'] : array();
		$meta        = array(
			'request'          => is_array( $context['request_meta'] ?? null ) ? $context['request_meta'] : array(),
			'response_message' => $this->text( $response['response_message'] ?? '' ),
			'body_excerpt'     => $this->text( $response['body_excerpt'] ?? '' ),
		);

		if ( 401 === $http_status || 403 === $http_status ) {
			return new ScryDexResult(
				ScryDexResult::UNAUTHORIZED,
				$http_status,
				$body,
				'scrydex_unauthorized',
				'ScryDex rejected the configured credentials.',
				$meta
			);
		}

		if ( 429 === $http_status ) {
			return new ScryDexResult(
				ScryDexResult::RATE_LIMITED,
				$http_status,
				$body,
				'scrydex_rate_limited',
				'ScryDex rate limit was reached.',
				$meta
			);
		}

		if ( $http_status >= 200 && $http_status < 300 ) {
			return new ScryDexResult(
				ScryDexResult::SUCCESS,
				$http_status,
				$this->normalize_success_body( $body, $context ),
				null,
				'',
				$meta
			);
		}

		return new ScryDexResult(
			ScryDexResult::FAILED,
			$http_status,
			$body,
			$this->error_code_from_body( $body ),
			$this->provider_message( $body, $response ),
			$meta
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

	/**
	 * @param array<string, mixed> $body Response body.
	 * @param array<string, mixed> $response Raw response metadata.
	 */
	private function provider_message( array $body, array $response ): string {
		foreach ( array( 'message', 'detail', 'error_description', 'error' ) as $key ) {
			if ( isset( $body[ $key ] ) && is_scalar( $body[ $key ] ) && '' !== trim( (string) $body[ $key ] ) ) {
				return substr( trim( (string) $body[ $key ] ), 0, 240 );
			}
		}

		$message = $this->text( $response['response_message'] ?? '' );
		if ( '' !== $message ) {
			return $message;
		}

		$excerpt = $this->text( $response['body_excerpt'] ?? '' );
		if ( '' !== $excerpt ) {
			return $excerpt;
		}

		return 'ScryDex request failed without a JSON error message.';
	}

	private function body_excerpt( string $body ): string {
		$body = strip_tags( $body );
		$body = preg_replace( '/\s+/', ' ', $body ) ?? $body;
		$body = trim( $body );

		return substr( $body, 0, 280 );
	}

	private function text( mixed $value ): string {
		if ( ! is_scalar( $value ) ) {
			return '';
		}

		return substr( trim( (string) $value ), 0, 280 );
	}

	/**
	 * @param array<string, mixed> $body Response body.
	 * @param array<string, mixed> $context Request context for response normalization.
	 * @return array<string, mixed>
	 */
	private function normalize_success_body( array $body, array $context ): array {
		$resource = (string) ( $context['resource'] ?? 'cards' );
		if ( 'cards' !== $resource ) {
			return $body;
		}

		$cards = $body['data'] ?? $body['cards'] ?? null;
		$game  = $this->game_endpoint( $context['game'] ?? '' );

		if ( is_array( $cards ) && $this->is_list_array( $cards ) ) {
			$cards = array_map(
				static function ( mixed $card ) use ( $game ): mixed {
					if ( ! is_array( $card ) || isset( $card['game'] ) ) {
						return $card;
					}

					$card['game'] = $game;

					return $card;
				},
				$cards
			);

			if ( isset( $body['data'] ) ) {
				$body['data'] = $cards;
			} else {
				$body['cards'] = $cards;
			}
		}

		return $body;
	}

	/**
	 * @param array<mixed> $value Candidate response list.
	 */
	private function is_list_array( array $value ): bool {
		if ( array() === $value ) {
			return true;
		}

		return array_keys( $value ) === range( 0, count( $value ) - 1 );
	}

	private function game_endpoint( mixed $value ): string {
		$value = strtolower( trim( (string) $value ) );
		$value = preg_replace( '/[^a-z0-9_-]+/', '-', $value ) ?? $value;
		$value = trim( $value, '-' );
		$aliases = array(
			'magic'                => 'magicthegathering',
			'mtg'                  => 'magicthegathering',
			'magic-the-gathering'  => 'magicthegathering',
			'one-piece'            => 'onepiece',
			'one-piece-card-game'  => 'onepiece',
			'yu-gi-oh'             => 'yugioh',
			'yu-gi-oh-tcg'         => 'yugioh',
		);

		return '' === $value ? 'pokemon' : ( $aliases[ $value ] ?? $value );
	}
}
