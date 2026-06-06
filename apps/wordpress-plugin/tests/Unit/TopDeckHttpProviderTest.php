<?php
/**
 * TopDeck HTTP provider tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Tests\TestCase;
use TCGStorePlatform\TopDeck\TopDeckHttpProvider;
use TCGStorePlatform\TopDeck\TopDeckResult;

final class TopDeckHttpProviderTest extends TestCase {
	public function test_create_event_defaults_to_not_supported(): void {
		$provider = new TopDeckHttpProvider( 'sandbox-key' );
		$result   = $provider->createEvent( array( 'title' => 'Prerelease' ) );

		$this->assert_same( TopDeckResult::NOT_SUPPORTED, $result->status() );
		$this->assert_same( 'topdeck_not_supported', $result->error_code() );
	}

	public function test_required_prompt_methods_exist(): void {
		$provider = new TopDeckHttpProvider();

		$this->assert_true( method_exists( $provider, 'getMyTournaments' ) );
		$this->assert_true( method_exists( $provider, 'getTournamentInfo' ) );
		$this->assert_true( method_exists( $provider, 'getAttendees' ) );
		$this->assert_true( method_exists( $provider, 'registerPlayers' ) );
		$this->assert_true( method_exists( $provider, 'syncEventFromTopDeck' ) );
		$this->assert_true( method_exists( $provider, 'importOwnedEvents' ) );
		$this->assert_true( method_exists( $provider, 'createEvent' ) );
	}

	public function test_register_players_requires_api_key(): void {
		$provider = new TopDeckHttpProvider();
		$result   = $provider->registerPlayers( 'td-dev-1001', array( 'morgan@example.test' ) );

		$this->assert_same( TopDeckResult::NOT_CONFIGURED, $result->status() );
		$this->assert_same( 'topdeck_not_configured', $result->error_code() );
	}

	public function test_register_players_maps_success_and_sends_payload(): void {
		$captured = array();
		$provider = new TopDeckHttpProvider(
			'sandbox-key',
			'https://topdeck.example.test/api',
			static function ( string $method, string $url, array $args ) use ( &$captured ): array {
				$captured = compact( 'method', 'url', 'args' );

				return array(
					'status' => 200,
					'body'   => array(
						'result' => 'registered',
						'email'  => 'morgan@example.test',
						'uid'    => 'td-user-dev-001',
					),
				);
			}
		);

		$result = $provider->registerPlayers( 'td-dev-1001', array( ' morgan@example.test ' ), true );

		$this->assert_same( TopDeckResult::REGISTERED, $result->status() );
		$this->assert_same( 'POST', $captured['method'] );
		$this->assert_same( 'https://topdeck.example.test/api/v2/tournaments/td-dev-1001/register', $captured['url'] );
		$this->assert_same( array( 'morgan@example.test' ), $captured['args']['body']['emails'] );
		$this->assert_true( $captured['args']['body']['overrideCap'] );
	}

	public function test_register_players_maps_provider_edge_cases(): void {
		$provider = new TopDeckHttpProvider(
			'sandbox-key',
			'https://topdeck.example.test/api',
			static function (): array {
				return array(
					'status' => 409,
					'body'   => array(
						'result'  => 'capacity_conflict',
						'message' => 'Tournament is full',
					),
				);
			}
		);

		$result = $provider->registerPlayers( 'td-dev-1001', array( 'morgan@example.test' ) );
		$this->assert_same( TopDeckResult::CAPACITY_CONFLICT, $result->status() );

		$provider = new TopDeckHttpProvider(
			'sandbox-key',
			'https://topdeck.example.test/api',
			static function (): array {
				return array(
					'status' => 202,
					'body'   => array(
						'result' => 'pending_invitation',
						'email'  => 'new-player@example.test',
					),
				);
			}
		);

		$result = $provider->registerPlayers( 'td-dev-1001', array( 'new-player@example.test' ) );
		$this->assert_same( TopDeckResult::PENDING_INVITATION, $result->status() );

		$provider = new TopDeckHttpProvider(
			'sandbox-key',
			'https://topdeck.example.test/api',
			static function (): array {
				return array(
					'status' => 403,
					'body'   => array(
						'result' => 'failed',
						'reason' => 'banned',
					),
				);
			}
		);

		$result = $provider->registerPlayers( 'td-dev-1001', array( 'banned@example.test' ) );
		$this->assert_same( TopDeckResult::FAILED, $result->status() );
		$this->assert_same( 'topdeck_banned', $result->error_code() );
	}

	public function test_auth_context_redacts_api_key(): void {
		$provider = new TopDeckHttpProvider( 'sandbox-key' );
		$context  = $provider->sanitized_auth_context();

		$this->assert_same( '[redacted]', $context['authorization'] );
	}
}
