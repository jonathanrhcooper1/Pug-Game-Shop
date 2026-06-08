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

		$set                 = is_array( $raw['set'] ?? null ) ? $raw['set'] : array();
		$images              = is_array( $raw['images'] ?? null ) ? $raw['images'] : array();
		$provider_updated_at = $this->normalize_datetime( $raw['updated_at'] ?? '' );
		$variants            = $this->normalize_variants( $raw, $provider_card_id );
		$card                = array(
			'provider_name'       => self::PROVIDER,
			'provider_card_id'    => $provider_card_id,
			'game'                => $game,
			'name'                => $name,
			'normalized_name'     => $this->normalize_name( $name ),
			'set_name'            => $this->nullable_string( $set['name'] ?? null ),
			'set_code'            => $this->nullable_string( $set['code'] ?? null ),
			'card_number'         => $this->nullable_string( $raw['number'] ?? null ),
			'printed_number'      => $this->nullable_string( $raw['printed_number'] ?? null ),
			'rarity'              => $this->nullable_string( $raw['rarity'] ?? null ),
			'front_image_url'     => $this->image_url(
				$raw['image_url'] ?? $images['front'] ?? $images['large'] ?? $images['small'] ?? null
			),
			'back_image_url'      => $this->image_url( $images['back'] ?? $raw['back_image_url'] ?? null ),
			'provider_updated_at' => $provider_updated_at,
			'search_text'         => $this->search_text( $raw, $set, $name, $game, $variants ),
		);

		return ScryDexCardNormalizationResult::valid(
			$card,
			$this->normalize_price( $raw, $provider_card_id, $provider_updated_at ),
			$variants
		);
	}

	/**
	 * @param array<string, mixed> $raw Raw provider card.
	 * @return array<string, mixed>|null
	 */
	private function normalize_price(
		array $raw,
		string $provider_card_id,
		?string $provider_updated_at
	): ?array {
		$market_price = $raw['market_price'] ?? null;

		if ( ! is_array( $market_price ) ) {
			return null;
		}

		$amount   = $this->decimal_amount( $market_price['amount'] ?? null );
		$currency = $this->currency( $market_price['currency'] ?? '' );

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
			'provider_name'               => self::PROVIDER,
			'provider_card_id'            => $provider_card_id,
			'provider_variant_id'         => $provider_variant_id,
			'variant'                     => $variant,
			'finish'                      => $finish,
			'parallel_name'               => $parallel_name,
			'edition'                     => $edition,
			'language'                    => $language,
			'raw_or_graded_support'       => $attributes['raw_or_graded_support'],
			'normalized_attributes_json'  => $this->attributes_json( $attributes ),
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
