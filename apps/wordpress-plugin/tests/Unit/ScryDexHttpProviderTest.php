<?php
/**
 * ScryDex HTTP provider tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexHttpProvider;
use TCGStorePlatform\ScryDex\ScryDexResult;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexHttpProviderTest extends TestCase {
	public function test_search_cards_requires_api_key_and_team_id(): void {
		$result = ( new ScryDexHttpProvider() )->search_cards( 'charizard' );

		$this->assert_false( $result->is_success() );
		$this->assert_same( ScryDexResult::NOT_CONFIGURED, $result->status() );
		$this->assert_same( 'scrydex_not_configured', $result->error_code() );
	}

	public function test_search_cards_sends_credentials_and_maps_fixture(): void {
		$captured = array();
		$fixture  = $this->fixture( 'fixtures/mocks/scrydex/cards-page-1.json' );
		$provider = new ScryDexHttpProvider(
			'sandbox-scrydex-key',
			'sandbox-team-id',
			'https://sandbox.scrydex.test',
			static function ( string $method, string $url, array $args ) use ( &$captured, $fixture ): array {
				$captured = array(
					'method'  => $method,
					'url'     => $url,
					'headers' => $args['headers'],
				);

				return array(
					'status' => 200,
					'body'   => $fixture,
				);
			}
		);

		$result = $provider->search_cards( 'charizard', array( 'game' => 'pokemon' ), 1 );
		$body   = $result->body();

		$this->assert_true( $result->is_success() );
		$this->assert_same( 'GET', $captured['method'] );
		$this->assert_contains( '/cards/search?', $captured['url'] );
		$this->assert_contains( 'game=pokemon', $captured['url'] );
		$this->assert_same( 'sandbox-scrydex-key', $captured['headers']['X-Api-Key'] );
		$this->assert_same( 'sandbox-team-id', $captured['headers']['X-Team-ID'] );
		$this->assert_same( 'mock-cursor-page-2', $body['next_cursor'] );
		$this->assert_same( 2, count( $body['cards'] ) );
	}

	public function test_rate_limit_response_maps_to_retryable_status(): void {
		$provider = new ScryDexHttpProvider(
			'sandbox-scrydex-key',
			'sandbox-team-id',
			'https://sandbox.scrydex.test',
			static fn (): array => array(
				'status' => 429,
				'body'   => array( 'message' => 'Too many requests.' ),
			)
		);
		$result   = $provider->get_usage();

		$this->assert_false( $result->is_success() );
		$this->assert_same( ScryDexResult::RATE_LIMITED, $result->status() );
		$this->assert_same( 'scrydex_rate_limited', $result->error_code() );
	}

	public function test_auth_context_redacts_credentials(): void {
		$context = ( new ScryDexHttpProvider( 'sandbox-scrydex-key', 'sandbox-team-id' ) )->sanitized_auth_context();

		$this->assert_same( 'https://api.scrydex.com', $context['base_url'] );
		$this->assert_same( '[redacted]', $context['x-api-key'] );
		$this->assert_same( '[redacted]', $context['x-team-id'] );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function fixture( string $path ): array {
		$full_path = dirname( __DIR__, 4 ) . '/' . $path;
		$contents  = file_get_contents( $full_path );

		if ( false === $contents ) {
			throw new \RuntimeException( 'Unable to read fixture: ' . $path );
		}

		$decoded = json_decode( $contents, true );

		if ( ! is_array( $decoded ) ) {
			throw new \RuntimeException( 'Fixture did not decode as JSON: ' . $path );
		}

		return $decoded;
	}
}
