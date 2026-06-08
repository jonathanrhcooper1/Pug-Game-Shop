<?php
/**
 * ScryDex card normalizer tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\ScryDex\ScryDexCardNormalizer;
use TCGStorePlatform\Tests\TestCase;

final class ScryDexCardNormalizerTest extends TestCase {
	public function test_normalizes_fixture_card_to_reference_and_price_rows(): void {
		$fixture = $this->fixture( 'fixtures/mocks/scrydex/cards-page-1.json' );
		$result  = ( new ScryDexCardNormalizer() )->normalize_card( $fixture['cards'][0] );
		$card    = $result->card();
		$price   = $result->price();
		$variants = $result->variants();

		$this->assert_true( $result->is_valid() );
		$this->assert_same( 'scrydex', $card['provider_name'] );
		$this->assert_same( 'sdx-pkm-001', $card['provider_card_id'] );
		$this->assert_same( 'pokemon', $card['game'] );
		$this->assert_same( 'Charizard', $card['name'] );
		$this->assert_same( 'charizard', $card['normalized_name'] );
		$this->assert_same( 'Base Set', $card['set_name'] );
		$this->assert_same( 'BS', $card['set_code'] );
		$this->assert_same( '4', $card['card_number'] );
		$this->assert_same( 'Rare Holo', $card['rarity'] );
		$this->assert_same( 'https://images.example.test/pokemon/base-set-charizard.png', $card['front_image_url'] );
		$this->assert_same( null, $card['back_image_url'] );
		$this->assert_same( '2026-06-06 09:00:00', $card['provider_updated_at'] );
		$this->assert_contains( 'Base Set', $card['search_text'] );
		$this->assert_contains( '1st Edition Holo', $card['search_text'] );
		$this->assert_same( 2, count( $variants ) );
		$this->assert_same( 'sdx-pkm-001-holo-unlimited', $variants[0]['provider_variant_id'] );
		$this->assert_same( 'Unlimited Holo', $variants[0]['variant'] );
		$this->assert_same( 'Holofoil', $variants[0]['finish'] );
		$this->assert_same( 'Unlimited', $variants[0]['edition'] );
		$this->assert_same( 'both', $variants[0]['raw_or_graded_support'] );
		$this->assert_true( is_array( $price ) );
		$this->assert_same( '120.0000', $price['market_price'] );
		$this->assert_same( 'USD', $price['currency'] );
		$this->assert_same( '2026-06-06 09:00:00', $price['source_observed_at'] );
	}

	public function test_normalizes_all_cards_from_fixture_page(): void {
		$fixture = $this->fixture( 'fixtures/mocks/scrydex/cards-page-1.json' );
		$results = ( new ScryDexCardNormalizer() )->normalize_cards( $fixture['cards'] );
		$second  = $results[1];
		$card    = $second->card();
		$price   = $second->price();

		$this->assert_same( 2, count( $results ) );
		$this->assert_true( $second->is_valid() );
		$this->assert_same( 'sdx-mtg-001', $card['provider_card_id'] );
		$this->assert_same( 'lightning bolt', $card['normalized_name'] );
		$this->assert_same( 'https://images.example.test/magic/lightning-bolt.png', $card['front_image_url'] );
		$this->assert_true( is_array( $price ) );
		$this->assert_same( '2.0000', $price['market_price'] );
	}

	public function test_missing_required_fields_returns_errors_and_no_rows(): void {
		$result = ( new ScryDexCardNormalizer() )->normalize_card(
			array(
				'id'   => '',
				'game' => '',
				'name' => '',
			)
		);
		$errors = $result->errors();

		$this->assert_false( $result->is_valid() );
		$this->assert_true( in_array( 'missing_provider_card_id', $errors, true ) );
		$this->assert_true( in_array( 'missing_game', $errors, true ) );
		$this->assert_true( in_array( 'missing_name', $errors, true ) );
		$this->assert_same( array(), $result->card() );
		$this->assert_same( null, $result->price() );
	}

	public function test_missing_optional_set_and_price_are_safe_defaults(): void {
		$result = ( new ScryDexCardNormalizer() )->normalize_card(
			array(
				'id'   => 'sdx-one-piece-001',
				'game' => 'One Piece',
				'name' => 'Monkey D. Luffy',
			)
		);
		$card   = $result->card();

		$this->assert_true( $result->is_valid() );
		$this->assert_same( 'one_piece', $card['game'] );
		$this->assert_same( 'monkey d. luffy', $card['normalized_name'] );
		$this->assert_same( null, $card['set_name'] );
		$this->assert_same( null, $card['set_code'] );
		$this->assert_same( null, $card['provider_updated_at'] );
		$this->assert_same( null, $result->price() );
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
