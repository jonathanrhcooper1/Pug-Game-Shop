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

	public function test_normalizes_scrydex_expansion_images_and_included_price_rows(): void {
		$result = ( new ScryDexCardNormalizer() )->normalize_card(
			array(
				'id'           => 'sv1-1',
				'game'         => 'pokemon',
				'name'         => 'Sprigatito',
				'expansion'    => array(
					'id'            => 'sv1',
					'name'          => 'Scarlet & Violet',
					'code'          => 'SV1',
					'language'      => 'English',
					'language_code' => 'EN',
					'release_date'  => '2023/03/31',
				),
				'number'       => '1',
				'rarity'       => 'Common',
				'images'       => array(
					array(
						'type'  => 'front',
						'large' => 'https://images.scrydex.com/pokemon/sv1-1/front',
					),
					array(
						'type' => 'back',
						'url'  => 'https://images.scrydex.com/pokemon/card-back',
					),
				),
				'variants'     => array(
					array(
						'id'      => 'SV1-001-reverse-holo',
						'variant' => 'Reverse Holo',
						'finish'  => 'Foil',
						'images'  => array(
							'front' => 'https://images.scrydex.com/pokemon/sv1-1/reverse-front',
							'back'  => 'https://images.scrydex.com/pokemon/card-back',
						),
						'prices'  => array(
							array(
								'condition' => 'NM',
								'type'      => 'raw',
								'low'       => 0.01,
								'market'    => 0.21,
								'currency'  => 'USD',
							),
							array(
								'type'     => 'graded',
								'company'  => 'PSA',
								'grade'    => '10',
								'low'      => 42.00,
								'mid'      => 48.56,
								'market'   => 50.10,
								'currency' => 'USD',
							),
						),
					),
				),
				'prices'       => array(
					array(
						'market'   => '0.12',
						'currency' => 'USD',
					),
				),
				'updated_at'   => '2026-06-08T13:15:00Z',
			)
		);
		$card   = $result->card();
		$price  = $result->price();
		$variant = $result->variants()[0] ?? array();
		$price_points = $result->price_points();

		$this->assert_true( $result->is_valid() );
		$this->assert_same( 'Scarlet & Violet', $card['set_name'] );
		$this->assert_same( 'SV1', $card['set_code'] );
		$this->assert_same( 2023, $card['year'] );
		$this->assert_same( 'English', $card['language'] );
		$this->assert_same( 'EN', $card['language_code'] );
		$this->assert_same( '2023-03-31', $card['release_date'] );
		$this->assert_same( 'https://images.scrydex.com/pokemon/sv1-1/front', $card['front_image_url'] );
		$this->assert_same( 'https://images.scrydex.com/pokemon/card-back', $card['back_image_url'] );
		$this->assert_true( is_array( $price ) );
		$this->assert_same( '0.1200', $price['market_price'] );
		$this->assert_same( 'SV1-001-reverse-holo', $variant['provider_variant_id'] );
		$this->assert_same( 'https://images.scrydex.com/pokemon/sv1-1/reverse-front', $variant['front_image_url'] );
		$this->assert_same( 'https://images.scrydex.com/pokemon/card-back', $variant['back_image_url'] );
		$this->assert_same( 3, count( $price_points ) );
		$this->assert_same( 'SV1-001-reverse-holo', $price_points[1]['provider_variant_id'] );
		$this->assert_same( 'nm', $price_points[1]['condition_code'] );
		$this->assert_same( '0.2100', $price_points[1]['market_price'] );
		$this->assert_same( 'graded', $price_points[2]['raw_or_graded'] );
		$this->assert_same( 'PSA', $price_points[2]['grading_company'] );
		$this->assert_same( '10', $price_points[2]['grade'] );
		$this->assert_same( '50.1000', $price_points[2]['market_price'] );
	}

	public function test_normalizes_live_scrydex_variant_prices_without_top_level_price(): void {
		$result = ( new ScryDexCardNormalizer() )->normalize_card(
			array(
				'id'        => 'me4-1',
				'game'      => 'pokemon',
				'name'      => 'Weedle',
				'expansion' => array(
					'id'           => 'me4',
					'name'         => 'Chaos Rising',
					'code'         => 'CRI',
					'release_date' => '2026/05/22',
				),
				'images'    => array(
					array(
						'type'  => 'front',
						'large' => 'https://images.scrydex.com/pokemon/me4-1/large',
					),
				),
				'variants'  => array(
					array(
						'name'   => 'normal',
						'prices' => array(
							array(
								'condition' => 'NM',
								'type'      => 'raw',
								'low'       => 0.01,
								'market'    => 0.08,
								'currency'  => 'USD',
							),
							array(
								'condition' => 'LP',
								'type'      => 'raw',
								'low'       => 0.05,
								'market'    => 0.08,
								'currency'  => 'USD',
							),
						),
					),
					array(
						'name'   => 'reverseHolofoil',
						'prices' => array(
							array(
								'condition' => 'NM',
								'type'      => 'raw',
								'low'       => 0.01,
								'market'    => 0.21,
								'currency'  => 'USD',
							),
						),
					),
				),
			)
		);
		$variants     = $result->variants();
		$price_points = $result->price_points();
		$price        = $result->price();

		$this->assert_true( $result->is_valid() );
		$this->assert_same( 2, count( $variants ) );
		$this->assert_same( 3, count( $price_points ) );
		$this->assert_same( $variants[0]['provider_variant_id'], $price_points[0]['provider_variant_id'] );
		$this->assert_same( 'nm', $price_points[0]['condition_code'] );
		$this->assert_same( '0.0800', $price_points[0]['market_price'] );
		$this->assert_same( '0.0100', $price_points[0]['low_price'] );
		$this->assert_same( $variants[1]['provider_variant_id'], $price_points[2]['provider_variant_id'] );
		$this->assert_same( '0.2100', $price_points[2]['market_price'] );
		$this->assert_true( is_array( $price ) );
		$this->assert_same( '0.0800', $price['market_price'] );
	}

	public function test_normalizes_scrydex_perfect_graded_price_as_grade_ten(): void {
		$result = ( new ScryDexCardNormalizer() )->normalize_card(
			array(
				'id'        => 'xyp-xy147',
				'game'      => 'pokemon',
				'name'      => 'Hoopa',
				'expansion' => array(
					'name' => 'XY Black Star Promos',
				),
				'variants'  => array(
					array(
						'id'     => 'xyp-xy147-holo',
						'name'   => 'holofoil',
						'prices' => array(
							array(
								'type'       => 'graded',
								'company'    => 'PSA',
								'is_perfect' => true,
								'market'     => 140.00,
								'low'        => 135.00,
								'currency'   => 'USD',
							),
						),
					),
				),
			)
		);
		$price_points = $result->price_points();

		$this->assert_true( $result->is_valid() );
		$this->assert_same( 'graded', $price_points[0]['raw_or_graded'] );
		$this->assert_same( 'PSA', $price_points[0]['grading_company'] );
		$this->assert_same( '10', $price_points[0]['grade'] );
		$this->assert_same( '140.0000', $price_points[0]['market_price'] );
	}

	public function test_normalizes_grade_keyed_scrydex_price_points(): void {
		$result = ( new ScryDexCardNormalizer() )->normalize_card(
			array(
				'id'         => 'sv4pt5-234',
				'game'       => 'pokemon',
				'name'       => 'Charizard ex',
				'expansion'  => array(
					'id'   => 'sv4pt5',
					'name' => 'Paldean Fates',
					'code' => 'PAF',
				),
				'number'     => '234',
				'updated_at' => '2026-06-15T12:30:00Z',
				'variants'   => array(
					array(
						'id'            => 'sv4pt5-234-special-illustration',
						'variant'       => 'Special Illustration Rare',
						'finish'        => 'Foil',
						'graded_prices' => array(
							'PSA'     => array(
								'10' => array(
									'market_mid' => '187.25',
									'low'        => '150.00',
									'high'       => '220.00',
									'currency'   => 'USD',
								),
								'9'  => '125.00',
							),
							'CGC 9.5' => array(
								'marketValue' => '144.50',
								'currency'    => 'USD',
							),
						),
					),
				),
			)
		);

		$price_points = $result->price_points();

		$this->assert_true( $result->is_valid() );
		$this->assert_same( 3, count( $price_points ) );
		$this->assert_same( 'sv4pt5-234-special-illustration', $price_points[0]['provider_variant_id'] );
		$this->assert_same( 'graded', $price_points[0]['raw_or_graded'] );
		$this->assert_same( 'PSA', $price_points[0]['grading_company'] );
		$this->assert_same( '10', $price_points[0]['grade'] );
		$this->assert_same( '187.2500', $price_points[0]['mid_price'] );
		$this->assert_same( '150.0000', $price_points[0]['low_price'] );
		$this->assert_same( '220.0000', $price_points[0]['high_price'] );
		$this->assert_same( '9', $price_points[1]['grade'] );
		$this->assert_same( '125.0000', $price_points[1]['market_price'] );
		$this->assert_same( 'CGC', $price_points[2]['grading_company'] );
		$this->assert_same( '9.5', $price_points[2]['grade'] );
		$this->assert_same( '144.5000', $price_points[2]['market_price'] );
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
