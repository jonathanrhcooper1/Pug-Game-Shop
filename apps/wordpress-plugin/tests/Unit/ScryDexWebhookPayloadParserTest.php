<?php
/**
 * ScryDex webhook payload parser tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexWebhookPayloadParser;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexWebhookPayloadParserTest extends TestCase {
	public function test_parses_supported_price_and_pop_report_events_from_docs(): void {
		$parser = new ScryDexWebhookPayloadParser();

		foreach (
			array(
				'pokemon.expansions.prices.raw_updated'             => 'raw_prices',
				'magicthegathering.expansions.prices.graded_updated' => 'graded_prices',
				'riftbound.expansions.pop_reports.updated'          => 'pop_reports',
			) as $event_name => $update_type
		) {
			$result = $parser->parse(
				json_encode(
					array(
						'id'   => 'evt_docs_' . $update_type,
						'name' => $event_name,
						'data' => array(
							'expansion_ids' => array( 'CNS', 'PS14', 'CNS' ),
						),
					)
				) ?: ''
			);

			$this->assert_same( 'valid', $result['status'] );
			$this->assert_same( $event_name, $result['event_name'] );
			$this->assert_same( $update_type, $result['update_type'] );
			$this->assert_same( array( 'CNS', 'PS14' ), $result['expansion_ids'] );
			$this->assert_true( $result['targeted_expansion_sync'] );
			$this->assert_false( $result['full_catalog_polling_requested'] );
		}
	}

	public function test_rejects_card_or_catalog_events_not_listed_in_webhook_docs(): void {
		$parser = new ScryDexWebhookPayloadParser();

		foreach (
			array(
				'pokemon.cards.updated',
				'pokemon.expansions.catalog.updated',
				'pokemon.expansions.prices.updated',
			) as $event_name
		) {
			$result = $parser->parse(
				json_encode(
					array(
						'id'   => 'evt_unsupported',
						'name' => $event_name,
						'data' => array(
							'expansion_ids' => array( 'base1' ),
						),
					)
				) ?: ''
			);

			$this->assert_same( 'invalid', $result['status'] );
			$this->assert_false( $result['supported_event'] );
			$this->assert_true( in_array( 'scrydex_webhook_event_not_supported_by_docs', $result['errors'], true ) );
		}
	}

	public function test_requires_expansion_ids_payload_shape_from_docs(): void {
		$result = ( new ScryDexWebhookPayloadParser() )->parse(
			'{"id":"evt_pkmn_prices_123","name":"pokemon.expansions.prices.raw_updated","data":{"card_ids":["abc"]}}'
		);

		$this->assert_same( 'invalid', $result['status'] );
		$this->assert_true( in_array( 'scrydex_webhook_expansion_ids_missing', $result['errors'], true ) );
	}
}
