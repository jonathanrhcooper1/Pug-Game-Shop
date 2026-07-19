<?php
/**
 * ScryDex webhook signature verifier tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexWebhookSignatureVerifier;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexWebhookSignatureVerifierTest extends TestCase {
	public function test_verifies_docs_hmac_signature_over_timestamp_dot_raw_body(): void {
		$payload   = '{"id":"evt_pkmn_prices_123","name":"pokemon.expansions.prices.raw_updated","data":{"expansion_ids":["base1"]}}';
		$timestamp = 1625097600;
		$secret    = 'whsec_test_signing_secret';
		$signature = hash_hmac( 'sha256', $timestamp . '.' . $payload, $secret );
		$verifier  = new ScryDexWebhookSignatureVerifier();
		$result    = $verifier->verify( $payload, 't=' . $timestamp . ',v1=' . $signature, $secret, $timestamp + 30 );

		$this->assert_same( 'verified', $result['status'] );
		$this->assert_same( 'verified', $result['signature_status'] );
		$this->assert_same( hash( 'sha256', $payload ), $result['payload_hash'] );
		$this->assert_same( 'timestamp.raw_body', $result['signed_payload_format'] );
		$this->assert_same( 'sha256', $result['hmac_algorithm'] );
		$this->assert_true( $result['constant_time_compare_used'] );
		$this->assert_true( $result['raw_body_required'] );
	}

	public function test_rejects_when_raw_body_bytes_change(): void {
		$payload    = '{"id":"evt_pkmn_prices_123","name":"pokemon.expansions.prices.raw_updated","data":{"expansion_ids":["base1"]}}';
		$reserialized = "{\n  \"id\": \"evt_pkmn_prices_123\",\n  \"name\": \"pokemon.expansions.prices.raw_updated\",\n  \"data\": {\"expansion_ids\": [\"base1\"]}\n}";
		$timestamp = 1625097600;
		$secret    = 'whsec_test_signing_secret';
		$signature = hash_hmac( 'sha256', $timestamp . '.' . $payload, $secret );
		$result    = ( new ScryDexWebhookSignatureVerifier() )->verify(
			$reserialized,
			't=' . $timestamp . ',v1=' . $signature,
			$secret,
			$timestamp + 30
		);

		$this->assert_same( 'rejected', $result['status'] );
		$this->assert_true( in_array( 'scrydex_webhook_signature_mismatch', $result['errors'], true ) );
	}

	public function test_rejects_replay_outside_five_minute_window(): void {
		$payload   = '{"id":"evt_pkmn_pop_123","name":"pokemon.expansions.pop_reports.updated","data":{"expansion_ids":["base1"]}}';
		$timestamp = 1625097600;
		$secret    = 'whsec_test_signing_secret';
		$signature = hash_hmac( 'sha256', $timestamp . '.' . $payload, $secret );
		$result    = ( new ScryDexWebhookSignatureVerifier() )->verify(
			$payload,
			't=' . $timestamp . ',v1=' . $signature,
			$secret,
			$timestamp + 301
		);

		$this->assert_same( 'rejected', $result['status'] );
		$this->assert_same( 300, $result['tolerance_seconds'] );
		$this->assert_true( in_array( 'scrydex_webhook_signature_timestamp_outside_tolerance', $result['errors'], true ) );
	}

	public function test_rejects_missing_signature_header(): void {
		$result = ( new ScryDexWebhookSignatureVerifier() )->verify(
			'{}',
			'',
			'whsec_test_signing_secret',
			1625097600
		);

		$this->assert_same( 'rejected', $result['status'] );
		$this->assert_true( in_array( 'scrydex_webhook_signature_missing', $result['errors'], true ) );
	}
}
