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
			'search_text'         => $this->search_text( $raw, $set, $name, $game ),
		);

		return ScryDexCardNormalizationResult::valid(
			$card,
			$this->normalize_price( $raw, $provider_card_id, $provider_updated_at )
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
	 * @param array<string, mixed> $set Raw provider set.
	 */
	private function search_text( array $raw, array $set, string $name, string $game ): string {
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

		return implode( ' ', array_unique( $parts ) );
	}
}
