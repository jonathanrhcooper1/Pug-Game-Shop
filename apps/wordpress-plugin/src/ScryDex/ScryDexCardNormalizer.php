<?php
/**
 * ScryDex card payload normalizer.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

use DateTimeImmutable;
use DateTimeZone;
use Exception;

final class ScryDexCardNormalizer {
	public const PROVIDER = 'scrydex';

	/**
	 * @param list<array<string, mixed>> $cards Raw provider cards.
	 * @return list<ScryDexCardNormalizationResult>
	 */
	public function normalize_cards( array $cards ): array {
		return array_map(
			fn ( array $card ): ScryDexCardNormalizationResult => $this->normalize_card( $card ),
			$cards
		);
	}

	/**
	 * @param array<string, mixed> $raw Raw provider card.
	 */
	public function normalize_card( array $raw ): ScryDexCardNormalizationResult {
		$provider_card_id = $this->clean_string( $raw['id'] ?? $raw['provider_card_id'] ?? '' );
		$game             = $this->normalize_game( $raw['game'] ?? '' );
		$name             = $this->clean_string( $raw['name'] ?? '' );
		$errors           = array();

		if ( '' === $provider_card_id ) {
			$errors[] = 'missing_provider_card_id';
		}

		if ( '' === $game ) {
			$errors[] = 'missing_game';
		}

		if ( '' === $name ) {
			$errors[] = 'missing_name';
		}

		if ( $errors ) {
			return ScryDexCardNormalizationResult::invalid( $errors );
		}

		$set                 = is_array( $raw['set'] ?? null )
			? $raw['set']
			: ( is_array( $raw['expansion'] ?? null ) ? $raw['expansion'] : array() );
		$images              = is_array( $raw['images'] ?? null ) ? $raw['images'] : array();
		$provider_updated_at = $this->normalize_datetime( $raw['updated_at'] ?? '' );
		$variants            = $this->normalize_variants( $raw, $provider_card_id );
		$price_points        = $this->normalize_price_points( $raw, $provider_card_id, $game, $provider_updated_at );
		$card                = array(
			'provider_name'       => self::PROVIDER,
			'provider_card_id'    => $provider_card_id,
			'reference_set_id'    => null,
			'provider_set_id'     => $this->nullable_string( $set['id'] ?? ( $set['provider_set_id'] ?? null ) ),
			'game'                => $game,
			'name'                => $name,
			'normalized_name'     => $this->normalize_name( $name ),
			'set_name'            => $this->nullable_string( $set['name'] ?? null ),
			'set_code'            => $this->nullable_string( $set['code'] ?? null ),
			'card_number'         => $this->nullable_string( $raw['number'] ?? null ),
			'printed_number'      => $this->nullable_string( $raw['printed_number'] ?? null ),
			'year'                => $this->year_from_date( $set['release_date'] ?? ( $set['releaseDate'] ?? null ) ),
			'rarity'              => $this->nullable_string( $raw['rarity'] ?? null ),
			'rarity_code'         => $this->nullable_string( $raw['rarity_code'] ?? ( $raw['rarityCode'] ?? null ) ),
			'language'            => $this->nullable_string( $raw['language'] ?? ( $set['language'] ?? null ) ),
			'language_code'       => $this->nullable_string( $raw['language_code'] ?? ( $raw['languageCode'] ?? ( $set['language_code'] ?? ( $set['languageCode'] ?? null ) ) ) ),
			'release_date'        => $this->normalize_date( $raw['release_date'] ?? ( $set['release_date'] ?? ( $set['releaseDate'] ?? null ) ) ),
			'front_image_url'     => $this->first_image_url(
				$raw['image_url'] ?? null,
				$raw['front_image_url'] ?? null,
				$raw['imageUrl'] ?? null,
				$this->front_image_value( $images )
			),
			'back_image_url'      => $this->first_image_url(
				$raw['back_image_url'] ?? null,
				$raw['backImageUrl'] ?? null,
				$this->back_image_value( $images )
			),
			'provider_updated_at' => $provider_updated_at,
			'search_text'         => $this->search_text( $raw, $set, $name, $game, $variants ),
		);

		return ScryDexCardNormalizationResult::valid(
			$card,
			$this->normalize_price( $raw, $provider_card_id, $provider_updated_at, $price_points ),
			$variants,
			$price_points
		);
	}

	/**
	 * @param array<string, mixed> $raw Raw provider card.
	 * @return array<string, mixed>|null
	 */
	private function normalize_price(
		array $raw,
		string $provider_card_id,
		?string $provider_updated_at,
		array $price_points = array()
	): ?array {
		$market_price = $price_points[0] ?? $this->market_price_payload( $raw );
		$amount       = is_array( $market_price ) ? $this->decimal_amount( $market_price['market_price'] ?? ( $market_price['amount'] ?? null ) ) : null;
		$currency     = is_array( $market_price ) ? $this->currency( $market_price['currency'] ?? '' ) : '';

		if ( null === $amount || '' === $currency ) {
			return null;
		}

		return array(
			'provider_name'       => self::PROVIDER,
			'provider_card_id'    => $provider_card_id,
			'market_price'        => $amount,
			'currency'            => $currency,
			'source_observed_at'  => $provider_updated_at,
			'provider_updated_at' => $provider_updated_at,
		);
	}

	/**
	 * @param array<string, mixed> $raw Raw provider card.
	 * @return list<array<string, mixed>>
	 */
	private function normalize_price_points(
		array $raw,
		string $provider_card_id,
		string $game,
		?string $provider_updated_at
	): array {
		$points = array();

		foreach ( $this->price_payloads( $raw, $provider_card_id ) as $payload ) {
			$row = $this->price_point_row( $payload, $provider_card_id, $game, $provider_updated_at );
			if ( null !== $row ) {
				$points[] = $row;
			}
		}

		return $points;
	}

	/**
	 * @param array<string, mixed> $source Provider price source.
	 * @return array<string, mixed>|null
	 */
	private function price_point_row(
		array $source,
		string $provider_card_id,
		string $game,
		?string $provider_updated_at
	): ?array {
		$market = $this->decimal_amount( $this->first_present( $source, array( 'amount', 'market_price', 'marketPrice', 'market', 'market_value', 'marketValue', 'avg_price', 'avgPrice', 'average_price', 'averagePrice', 'average', 'avg', 'value', 'price' ) ) );
		$low    = $this->decimal_amount( $this->first_present( $source, array( 'low_price', 'lowPrice', 'low' ) ) );
		$mid    = $this->decimal_amount( $this->first_present( $source, array( 'mid_price', 'midPrice', 'mid', 'market_mid', 'marketMid', 'mid_value', 'midValue' ) ) );
		$high   = $this->decimal_amount( $this->first_present( $source, array( 'high_price', 'highPrice', 'high' ) ) );

		if ( null === $market && null === $low && null === $mid && null === $high ) {
			return null;
		}

		$currency = $this->currency( $source['currency'] ?? 'USD' );
		if ( '' === $currency ) {
			$currency = 'USD';
		}

		$grade           = $this->nullable_string( $source['grade'] ?? ( $source['grading_grade'] ?? ( $source['gradingGrade'] ?? ( $source['grade_label'] ?? ( $source['gradeLabel'] ?? null ) ) ) ) );
		$grading_company = $this->nullable_string( $source['grading_company'] ?? ( $source['gradingCompany'] ?? ( $source['grader'] ?? ( $source['company'] ?? null ) ) ) );
		$raw_or_graded   = $this->raw_or_graded( $source, $grade, $grading_company );
		if ( 'graded' === $raw_or_graded && null === $grade && true === ( $source['is_perfect'] ?? null ) ) {
			$grade = '10';
		}

		return array(
			'provider_name'          => self::PROVIDER,
			'provider_card_id'       => $provider_card_id,
			'provider_variant_id'    => $this->nullable_string( $source['provider_variant_id'] ?? ( $source['variant_id'] ?? ( $source['variantId'] ?? ( $source['id'] ?? null ) ) ) ),
			'game'                   => $game,
			'condition_code'         => $this->condition_code( $source['condition_code'] ?? ( $source['conditionCode'] ?? ( $source['condition'] ?? null ) ) ),
			'raw_or_graded'          => $raw_or_graded,
			'grading_company'        => $grading_company,
			'grade'                  => $grade,
			'market_price'           => $market,
			'low_price'              => $low,
			'mid_price'              => $mid,
			'high_price'             => $high,
			'currency'               => $currency,
			'source_observed_at'     => $provider_updated_at,
			'provider_updated_at'    => $provider_updated_at,
			'raw_price_payload_json' => $this->json_payload( $source ),
		);
	}

	private function clean_string( mixed $value ): string {
		return trim( (string) $value );
	}

	private function nullable_string( mixed $value ): ?string {
		$value = $this->clean_string( $value ?? '' );

		return '' === $value ? null : $value;
	}

	private function normalize_game( mixed $value ): string {
		$value = strtolower( $this->clean_string( $value ) );
		$value = preg_replace( '/[^a-z0-9_]+/', '_', $value ) ?? $value;
		$value = trim( $value, '_' );

		return $value;
	}

	private function normalize_name( string $name ): string {
		$name = strtolower( $name );
		$name = preg_replace( '/\s+/', ' ', $name ) ?? $name;

		return trim( $name );
	}

	private function normalize_datetime( mixed $value ): ?string {
		$value = $this->clean_string( $value );

		if ( '' === $value ) {
			return null;
		}

		try {
			$datetime = new DateTimeImmutable( $value );
		} catch ( Exception ) {
			return null;
		}

		return $datetime->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s' );
	}

	private function decimal_amount( mixed $value ): ?string {
		if ( ! is_numeric( $value ) ) {
			return null;
		}

		$amount = (float) $value;

		if ( $amount < 0 ) {
			return null;
		}

		return number_format( $amount, 4, '.', '' );
	}

	private function currency( mixed $value ): string {
		$value = strtoupper( $this->clean_string( $value ) );

		return preg_match( '/^[A-Z]{3}$/', $value ) ? $value : '';
	}

	private function normalize_date( mixed $value ): ?string {
		$value = $this->clean_string( $value );

		if ( '' === $value ) {
			return null;
		}

		$timestamp = strtotime( str_replace( '/', '-', $value ) );

		return false === $timestamp ? null : gmdate( 'Y-m-d', $timestamp );
	}

	private function year_from_date( mixed $value ): ?int {
		$date = $this->normalize_date( $value );

		return null === $date ? null : (int) substr( $date, 0, 4 );
	}

	private function image_url( mixed $value ): ?string {
		$value = $this->clean_string( $value ?? '' );

		if ( '' === $value || ! filter_var( $value, FILTER_VALIDATE_URL ) ) {
			return null;
		}

		$scheme = strtolower( (string) parse_url( $value, PHP_URL_SCHEME ) );

		if ( ! in_array( $scheme, array( 'http', 'https' ), true ) ) {
			return null;
		}

		return substr( $value, 0, 255 );
	}

	private function first_image_url( mixed ...$values ): ?string {
		foreach ( $values as $value ) {
			$url = $this->image_url( $value );
			if ( null !== $url ) {
				return $url;
			}
		}

		return null;
	}

	/**
	 * @param array<int|string, mixed> $images Provider image payload.
	 */
	private function front_image_value( array $images ): mixed {
		foreach ( array( 'front', 'large', 'small', 'url' ) as $key ) {
			if ( isset( $images[ $key ] ) ) {
				return $images[ $key ];
			}
		}

		return $this->image_from_list( $images, array( 'front', 'card', 'image' ) );
	}

	/**
	 * @param array<int|string, mixed> $images Provider image payload.
	 */
	private function back_image_value( array $images ): mixed {
		if ( isset( $images['back'] ) ) {
			return $images['back'];
		}

		return $this->image_from_list( $images, array( 'back' ) );
	}

	/**
	 * @param array<int|string, mixed> $images Provider image payload.
	 * @param list<string>            $type_needles Image type hints.
	 */
	private function image_from_list( array $images, array $type_needles ): mixed {
		foreach ( $images as $image ) {
			if ( ! is_array( $image ) ) {
				continue;
			}

			$type = strtolower( $this->clean_string( $image['type'] ?? ( $image['name'] ?? '' ) ) );
			if ( '' !== $type ) {
				$matched = false;
				foreach ( $type_needles as $needle ) {
					if ( str_contains( $type, $needle ) ) {
						$matched = true;
						break;
					}
				}

				if ( ! $matched ) {
					continue;
				}
			}

			foreach ( array( 'large', 'url', 'image_url', 'imageUrl', 'small' ) as $key ) {
				if ( isset( $image[ $key ] ) ) {
					return $image[ $key ];
				}
			}
		}

		return null;
	}

	/**
	 * @param array<string, mixed> $raw Raw provider card.
	 * @return array<string, mixed>|null
	 */
	private function market_price_payload( array $raw ): ?array {
		if ( is_array( $raw['market_price'] ?? null ) ) {
			return $raw['market_price'];
		}

		if ( is_numeric( $raw['market_price'] ?? null ) ) {
			return array(
				'amount'   => $raw['market_price'],
				'currency' => $raw['currency'] ?? 'USD',
			);
		}

		$prices = $raw['prices'] ?? null;
		if ( ! is_array( $prices ) ) {
			return null;
		}

		foreach ( $prices as $price ) {
			if ( ! is_array( $price ) ) {
				continue;
			}

			$amount = $price['amount']
				?? $price['market_price']
				?? $price['marketPrice']
				?? $price['market']
				?? $price['avg_price']
				?? $price['avgPrice']
				?? $price['price']
				?? null;

			if ( null === $amount ) {
				continue;
			}

			return array(
				'amount'   => $amount,
				'currency' => $price['currency'] ?? 'USD',
			);
		}

		return null;
	}

	/**
	 * @param array<string, mixed> $raw Raw provider card.
	 * @return list<array<string, mixed>>
	 */
	private function price_payloads( array $raw, string $provider_card_id ): array {
		$payloads = array();

		foreach ( array( 'market_price', 'price' ) as $key ) {
			if ( is_array( $raw[ $key ] ?? null ) ) {
				$payloads[] = $raw[ $key ];
			} elseif ( is_numeric( $raw[ $key ] ?? null ) ) {
				$payloads[] = array(
					'market_price' => $raw[ $key ],
					'currency'     => $raw['currency'] ?? 'USD',
				);
			}
		}

		foreach ( $this->price_collection_contexts() as $key => $context ) {
			$prices = $raw[ $key ] ?? null;
			if ( is_array( $prices ) ) {
				$payloads = array_merge( $payloads, $this->rows_from_price_collection( $prices, $raw, $context ) );
			}
		}

		foreach ( $this->variant_sources( $raw ) as $variant_source ) {
			$variant = $this->variant_row( $variant_source, $provider_card_id );
			if ( null === $variant ) {
				continue;
			}

			foreach ( $this->price_collection_contexts() as $key => $context ) {
				$variant_prices = $variant_source[ $key ] ?? null;
				if ( ! is_array( $variant_prices ) ) {
					continue;
				}

				foreach ( $this->rows_from_price_collection( $variant_prices, $raw, $context ) as $price ) {
					$payloads[] = array_merge(
						array(
							'provider_variant_id' => $variant['provider_variant_id'],
							'variant'             => $variant['variant'],
							'finish'              => $variant['finish'],
						),
						$price
					);
				}
			}
		}

		return $payloads;
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	private function price_collection_contexts(): array {
		return array(
			'prices'              => array(),
			'price_points'        => array(),
			'pricePoints'         => array(),
			'market_prices'       => array(),
			'marketPrices'        => array(),
			'graded_prices'       => array( 'raw_or_graded' => 'graded' ),
			'gradedPrices'        => array( 'raw_or_graded' => 'graded' ),
			'graded_price_points' => array( 'raw_or_graded' => 'graded' ),
			'gradedPricePoints'   => array( 'raw_or_graded' => 'graded' ),
			'grades'              => array( 'raw_or_graded' => 'graded' ),
		);
	}

	/**
	 * @param array<int|string, mixed> $prices Provider price collection.
	 * @param array<string, mixed>     $raw Raw provider card.
	 * @return list<array<string, mixed>>
	 */
	private function rows_from_price_collection( array $prices, array $raw, array $context = array() ): array {
		$payloads = array();

		if ( array_is_list( $prices ) ) {
			foreach ( $prices as $price ) {
				if ( is_array( $price ) ) {
					$payloads[] = array_merge( $context, $price );
				} elseif ( is_numeric( $price ) ) {
					$payloads[] = array_merge(
						$context,
						array(
							'market_price' => $price,
							'currency'     => $raw['currency'] ?? 'USD',
						)
					);
				}
			}

			return $payloads;
		}

		foreach ( $prices as $key => $price ) {
			$entry_context = array_merge(
				$context,
				$this->price_context_from_key( is_scalar( $key ) ? (string) $key : '', $context )
			);

			if ( is_array( $price ) ) {
				if ( $this->looks_like_price_payload( $price ) ) {
					$payloads[] = array_merge( $entry_context, $price );
				} else {
					$payloads = array_merge(
						$payloads,
						$this->rows_from_price_collection( $price, $raw, $entry_context )
					);
				}
			} elseif ( is_numeric( $price ) ) {
				$payloads[] = array_merge(
					$entry_context,
					array(
						'market_price' => $price,
						'currency'     => $raw['currency'] ?? 'USD',
					)
				);
			}
		}

		return $payloads;
	}

	/**
	 * @param array<string, mixed> $price Provider price payload candidate.
	 */
	private function looks_like_price_payload( array $price ): bool {
		foreach (
			array(
				'amount',
				'market_price',
				'marketPrice',
				'market',
				'market_value',
				'marketValue',
				'avg_price',
				'avgPrice',
				'average_price',
				'averagePrice',
				'average',
				'avg',
				'value',
				'price',
				'low_price',
				'lowPrice',
				'low',
				'mid_price',
				'midPrice',
				'mid',
				'market_mid',
				'marketMid',
				'high_price',
				'highPrice',
				'high',
			) as $key
		) {
			if ( array_key_exists( $key, $price ) && is_numeric( $price[ $key ] ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * @param array<string, mixed> $parent_context Parent inferred price context.
	 * @return array<string, mixed>
	 */
	private function price_context_from_key( string $key, array $parent_context = array() ): array {
		$key = trim( $key );
		if ( '' === $key ) {
			return array();
		}

		$normalized = preg_replace( '/[^a-z0-9.]+/', '_', strtolower( $key ) ) ?? strtolower( $key );
		$normalized = trim( $normalized, '_' );
		$context    = array();

		if ( str_contains( $normalized, 'graded' ) ) {
			$context['raw_or_graded'] = 'graded';
		}

		if ( str_contains( $normalized, 'single' ) || 'raw' === $normalized ) {
			$context['raw_or_graded'] = 'raw';
		}

		$company = $this->grading_company_from_price_key( $normalized );
		if ( null !== $company ) {
			$context['raw_or_graded']   = 'graded';
			$context['grading_company'] = $company;
		}

		$grade = $this->grade_from_price_key( $normalized, array_merge( $parent_context, $context ) );
		if ( null !== $grade ) {
			$context['raw_or_graded'] = 'graded';
			$context['grade']         = $grade;
		}

		$condition = $this->condition_from_price_key( $normalized );
		if ( null !== $condition && ! isset( $context['grade'] ) ) {
			$context['condition'] = $condition;
		}

		return $context;
	}

	private function grading_company_from_price_key( string $normalized ): ?string {
		$tokens = array_values( array_filter( explode( '_', $normalized ), static fn ( string $token ): bool => '' !== $token ) );

		if ( in_array( 'psa', $tokens, true ) ) {
			return 'PSA';
		}

		if ( in_array( 'cgc', $tokens, true ) ) {
			return 'CGC';
		}

		if ( in_array( 'bgs', $tokens, true ) || in_array( 'beckett', $tokens, true ) ) {
			return 'BGS';
		}

		if ( in_array( 'sgc', $tokens, true ) ) {
			return 'SGC';
		}

		if ( in_array( 'tag', $tokens, true ) ) {
			return 'TAG';
		}

		return null;
	}

	/**
	 * @param array<string, mixed> $context Inferred price context.
	 */
	private function grade_from_price_key( string $normalized, array $context ): ?string {
		$is_graded_context = 'graded' === ( $context['raw_or_graded'] ?? '' )
			|| null !== ( $context['grading_company'] ?? null );

		if ( preg_match( '/(?:^|_)(?:grade|graded|gem_mint|pristine|mint)_?(10(?:\.0)?|[1-9](?:\.\d)?)(?:_|$)/', $normalized, $matches ) ) {
			return $this->normalize_grade_label( $matches[1] );
		}

		if ( preg_match( '/(?:^|_)(?:psa|cgc|bgs|beckett|sgc|tag)_?(10(?:\.0)?|[1-9](?:\.\d)?)(?:_|$)/', $normalized, $matches ) ) {
			return $this->normalize_grade_label( $matches[1] );
		}

		if ( $is_graded_context && preg_match( '/^(10(?:\.0)?|[1-9](?:\.\d)?)$/', $normalized, $matches ) ) {
			return $this->normalize_grade_label( $matches[1] );
		}

		return null;
	}

	private function normalize_grade_label( string $grade ): string {
		$grade = trim( $grade );

		return str_ends_with( $grade, '.0' ) ? substr( $grade, 0, -2 ) : $grade;
	}

	private function condition_from_price_key( string $normalized ): ?string {
		$conditions = array(
			'nm'                => 'NM',
			'near_mint'         => 'NM',
			'nearmint'          => 'NM',
			'lp'                => 'LP',
			'lightly_played'    => 'LP',
			'lightlyplayed'     => 'LP',
			'mp'                => 'MP',
			'moderately_played' => 'MP',
			'moderatelyplayed'  => 'MP',
			'hp'                => 'HP',
			'heavily_played'    => 'HP',
			'heavilyplayed'     => 'HP',
			'dmg'               => 'DMG',
			'damaged'           => 'DMG',
		);

		return $conditions[ $normalized ] ?? null;
	}

	/**
	 * @param array<string, mixed> $source Source values.
	 * @param list<string> $keys Candidate keys.
	 */
	private function first_present( array $source, array $keys ): mixed {
		foreach ( $keys as $key ) {
			if ( array_key_exists( $key, $source ) && null !== $source[ $key ] && '' !== trim( (string) $source[ $key ] ) ) {
				return $source[ $key ];
			}
		}

		return null;
	}

	private function condition_code( mixed $value ): ?string {
		$value = strtolower( $this->clean_string( $value ?? '' ) );
		$value = preg_replace( '/[^a-z0-9_+-]+/', '_', $value ) ?? '';
		$value = trim( $value, '_' );

		return '' === $value ? null : substr( $value, 0, 32 );
	}

	/**
	 * @param array<string, mixed> $source Provider price source.
	 */
	private function raw_or_graded( array $source, ?string $grade, ?string $grading_company ): string {
		$value = strtolower( $this->clean_string( $source['raw_or_graded'] ?? ( $source['rawOrGraded'] ?? ( $source['type'] ?? '' ) ) ) );
		if ( in_array( $value, array( 'raw', 'graded' ), true ) ) {
			return $value;
		}

		if ( true === ( $source['is_perfect'] ?? null ) ) {
			return 'graded';
		}

		return null !== $grade || null !== $grading_company ? 'graded' : 'raw';
	}

	/**
	 * @param array<string, mixed> $payload Raw price payload.
	 */
	private function json_payload( array $payload ): ?string {
		$json = json_encode( $payload, JSON_UNESCAPED_SLASHES );

		return false === $json ? null : $json;
	}

	/**
	 * @param array<string, mixed> $raw Raw provider card.
	 * @return list<array<string, mixed>>
	 */
	private function normalize_variants( array $raw, string $provider_card_id ): array {
		$variants = array();
		$seen     = array();

		foreach ( $this->variant_sources( $raw ) as $source ) {
			$row = $this->variant_row( $source, $provider_card_id );

			if ( null === $row ) {
				continue;
			}

			$key = (string) $row['provider_variant_id'];
			if ( isset( $seen[ $key ] ) ) {
				continue;
			}

			$seen[ $key ] = true;
			$variants[]   = $row;
		}

		return $variants;
	}

	/**
	 * @param array<string, mixed> $raw Raw provider card.
	 * @return list<array<string, mixed>>
	 */
	private function variant_sources( array $raw ): array {
		$sources = array();

		foreach ( array( 'variants', 'versions', 'printings' ) as $key ) {
			if ( is_array( $raw[ $key ] ?? null ) ) {
				$sources = array_merge( $sources, $this->rows_from_variant_collection( $raw[ $key ] ) );
			}
		}

		if ( is_array( $raw['finishes'] ?? null ) ) {
			foreach ( $raw['finishes'] as $finish ) {
				$sources[] = array(
					'variant' => $finish,
					'finish'  => $finish,
				);
			}
		}

		return $sources;
	}

	/**
	 * @param array<int|string, mixed> $values Provider variant collection.
	 * @return list<array<string, mixed>>
	 */
	private function rows_from_variant_collection( array $values ): array {
		$rows = array();

		if ( array_is_list( $values ) ) {
			foreach ( $values as $value ) {
				if ( is_array( $value ) ) {
					$rows[] = $value;
				} elseif ( is_scalar( $value ) ) {
					$rows[] = array(
						'variant' => (string) $value,
						'finish'  => (string) $value,
					);
				}
			}

			return $rows;
		}

		foreach ( $values as $name => $value ) {
			if ( is_array( $value ) ) {
				$rows[] = array_merge( array( 'variant' => (string) $name ), $value );
			} elseif ( true === $value || is_scalar( $value ) ) {
				$rows[] = array(
					'variant' => (string) $name,
					'finish'  => is_bool( $value ) ? (string) $name : (string) $value,
				);
			}
		}

		return $rows;
	}

	/**
	 * @param array<string, mixed> $source Provider variant source.
	 * @return array<string, mixed>|null
	 */
	private function variant_row( array $source, string $provider_card_id ): ?array {
		$variant       = $this->nullable_string( $source['variant'] ?? $source['name'] ?? $source['type'] ?? null );
		$finish        = $this->nullable_string( $source['finish'] ?? $source['foil'] ?? $source['surface'] ?? null );
		$parallel_name = $this->nullable_string( $source['parallel_name'] ?? $source['parallel'] ?? null );
		$edition       = $this->nullable_string( $source['edition'] ?? $source['printing'] ?? null );
		$language      = $this->nullable_string( $source['language'] ?? $source['lang'] ?? null );
		$images        = is_array( $source['images'] ?? null ) ? $source['images'] : array();

		if ( null === $variant && null === $finish && null === $parallel_name && null === $edition && null === $language ) {
			return null;
		}

		$provider_variant_id = $this->nullable_string(
			$source['id']
				?? $source['variant_id']
				?? $source['provider_variant_id']
				?? $source['sku']
				?? null
		);
		$attributes          = array(
			'variant'               => $variant,
			'finish'                => $finish,
			'parallel_name'         => $parallel_name,
			'edition'               => $edition,
			'language'              => $language,
			'raw_or_graded_support' => $this->raw_or_graded_support( $source ),
		);

		if ( null === $provider_variant_id ) {
			$provider_variant_id = substr(
				$provider_card_id . ':' . hash( 'sha256', (string) json_encode( $attributes ) ),
				0,
				191
			);
		}

		return array(
			'provider_name'              => self::PROVIDER,
			'provider_card_id'           => $provider_card_id,
			'provider_variant_id'        => $provider_variant_id,
			'variant'                    => $variant,
			'finish'                     => $finish,
			'parallel_name'              => $parallel_name,
			'edition'                    => $edition,
			'language'                   => $language,
			'front_image_url'            => $this->first_image_url(
				$source['image_url'] ?? null,
				$source['front_image_url'] ?? null,
				$source['imageUrl'] ?? null,
				$this->front_image_value( $images )
			),
			'back_image_url'             => $this->first_image_url(
				$source['back_image_url'] ?? null,
				$source['backImageUrl'] ?? null,
				$this->back_image_value( $images )
			),
			'raw_or_graded_support'      => $attributes['raw_or_graded_support'],
			'normalized_attributes_json' => $this->attributes_json( $attributes ),
		);
	}

	/**
	 * @param array<string, mixed> $source Provider variant source.
	 */
	private function raw_or_graded_support( array $source ): string {
		$value = strtolower( $this->clean_string( $source['raw_or_graded_support'] ?? $source['support'] ?? '' ) );

		if ( in_array( $value, array( 'raw', 'graded', 'both' ), true ) ) {
			return $value;
		}

		if ( true === ( $source['graded'] ?? false ) || 'graded' === strtolower( $this->clean_string( $source['type'] ?? '' ) ) ) {
			return 'graded';
		}

		return 'both';
	}

	/**
	 * @param array<string, mixed> $attributes Normalized variant attributes.
	 */
	private function attributes_json( array $attributes ): ?string {
		$attributes = array_filter(
			$attributes,
			static fn ( mixed $value ): bool => null !== $value && '' !== $value
		);

		if ( array() === $attributes ) {
			return null;
		}

		$json = json_encode( $attributes, JSON_UNESCAPED_SLASHES );

		return false === $json ? null : $json;
	}

	/**
	 * @param array<string, mixed> $raw Raw provider card.
	 * @param array<string, mixed> $set Raw provider set.
	 * @param list<array<string, mixed>> $variants Normalized variant rows.
	 */
	private function search_text( array $raw, array $set, string $name, string $game, array $variants ): string {
		$parts = array_filter(
			array(
				$game,
				$name,
				$this->clean_string( $set['name'] ?? '' ),
				$this->clean_string( $set['code'] ?? '' ),
				$this->clean_string( $set['id'] ?? '' ),
				$this->clean_string( $raw['number'] ?? '' ),
				$this->clean_string( $raw['rarity'] ?? '' ),
			),
			static fn ( string $value ): bool => '' !== $value
		);

		foreach ( $variants as $variant ) {
			foreach ( array( 'variant', 'finish', 'parallel_name', 'edition', 'language' ) as $field ) {
				$value = $this->clean_string( $variant[ $field ] ?? '' );

				if ( '' !== $value ) {
					$parts[] = $value;
				}
			}
		}

		return implode( ' ', array_unique( $parts ) );
	}
}
