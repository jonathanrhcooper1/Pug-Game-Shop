<?php
/**
 * Buylist submission intake REST payload parser.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Buylist;

final class BuylistSubmissionIntakeParser {
	private const SOURCES = array( 'website', 'kiosk', 'staff', 'offline' );

	/**
	 * @param array<string, mixed> $payload Request body.
	 */
	public function parse(
		array $payload,
		?string $idempotency_header = null,
		?int $actor_user_id = null
	): BuylistSubmissionIntakeValidationResult {
		$errors              = array();
		$source              = strtolower( trim( (string) ( $payload['source'] ?? '' ) ) );
		$idempotency_source  = $idempotency_header;
		$currency            = strtoupper( trim( (string) ( $payload['currency'] ?? 'USD' ) ) );
		$customer_first_name = trim( (string) ( $payload['customer_first_name'] ?? '' ) );
		$customer_last_name  = trim( (string) ( $payload['customer_last_name'] ?? '' ) );
		$customer_phone      = trim( (string) ( $payload['customer_phone'] ?? '' ) );
		$customer_email      = strtolower( trim( (string) ( $payload['customer_email'] ?? '' ) ) );
		$device_id           = trim( (string) ( $payload['device_id'] ?? '' ) );
		$owner_token_hash    = trim( (string) ( $payload['owner_token_hash'] ?? '' ) );
		$items_payload       = $payload['items'] ?? array();
		$customer_id         = $this->optional_positive_int( $payload['customer_id'] ?? null, 'customer_id', $errors );
		$location_id         = $this->optional_positive_int( $payload['location_id'] ?? null, 'location_id', $errors );

		if ( null === $idempotency_source || '' === trim( $idempotency_source ) ) {
			$idempotency_source = (string) ( $payload['idempotency_key'] ?? '' );
		}

		$idempotency_key = trim( $idempotency_source );

		if ( ! in_array( $source, self::SOURCES, true ) ) {
			$errors[] = 'source_invalid';
		}

		if ( '' === $idempotency_key ) {
			$errors[] = 'idempotency_key_required';
		}

		if ( '' === $customer_phone ) {
			$errors[] = 'customer_phone_required';
		}

		if ( '' !== $customer_email && ! filter_var( $customer_email, FILTER_VALIDATE_EMAIL ) ) {
			$errors[] = 'customer_email_invalid';
		}

		if ( 1 !== preg_match( '/^[A-Z]{3}$/', $currency ) ) {
			$errors[] = 'currency_invalid';
		}

		if ( '' !== $owner_token_hash && 1 !== preg_match( '/^[a-f0-9]{64}$/', $owner_token_hash ) ) {
			$errors[] = 'owner_token_hash_invalid';
		}

		if ( ! is_array( $items_payload ) || array() === $items_payload ) {
			$errors[]      = 'items_required';
			$items_payload = array();
		}

		$items = $this->parse_items( $items_payload, $errors );

		if ( $errors ) {
			return BuylistSubmissionIntakeValidationResult::rejected( array_values( array_unique( $errors ) ) );
		}

		return BuylistSubmissionIntakeValidationResult::accepted(
			new BuylistSubmissionIntakeRequest(
				$source,
				$idempotency_key,
				$currency,
				$customer_phone,
				$customer_first_name,
				$customer_last_name,
				$customer_email,
				$customer_id,
				$location_id,
				$device_id,
				$owner_token_hash,
				$actor_user_id,
				$items
			)
		);
	}

	/**
	 * @param array<int, mixed> $items_payload Item payloads.
	 * @param list<string>     $errors Validation errors.
	 * @return list<array<string, mixed>>
	 */
	private function parse_items( array $items_payload, array &$errors ): array {
		$items = array();

		foreach ( array_values( $items_payload ) as $index => $item ) {
			if ( ! is_array( $item ) ) {
				$errors[] = "items_{$index}_must_be_object";
				continue;
			}

			$items[] = $this->parse_item( $item, $index, $errors );
		}

		return $items;
	}

	/**
	 * @param array<string, mixed> $item Item payload.
	 * @param list<string>        $errors Validation errors.
	 * @return array<string, mixed>
	 */
	private function parse_item( array $item, int $index, array &$errors ): array {
		$manual_name          = trim( (string) ( $item['manual_card_name'] ?? '' ) );
		$raw_or_graded        = strtolower( trim( (string) ( $item['raw_or_graded'] ?? 'raw' ) ) );
		$reference_card_id    = $this->optional_positive_int(
			$item['reference_card_id'] ?? null,
			"items_{$index}_reference_card_id",
			$errors
		);
		$reference_variant_id = $this->optional_positive_int(
			$item['reference_variant_id'] ?? null,
			"items_{$index}_reference_variant_id",
			$errors
		);
		$quantity             = $this->positive_int( $item['quantity'] ?? 1, "items_{$index}_quantity", $errors );
		$grading_company      = trim( (string) ( $item['grading_company'] ?? '' ) );
		$grade                = trim( (string) ( $item['grade'] ?? '' ) );

		if ( null === $reference_card_id && '' === $manual_name ) {
			$errors[] = "items_{$index}_identity_required";
		}

		if ( ! in_array( $raw_or_graded, array( 'raw', 'graded' ), true ) ) {
			$errors[] = "items_{$index}_raw_or_graded_invalid";
		}

		if ( 'graded' === $raw_or_graded && ( '' === $grading_company || '' === $grade ) ) {
			$errors[] = "items_{$index}_grade_required";
		}

		return array(
			'reference_card_id'    => $reference_card_id,
			'reference_variant_id' => $reference_variant_id,
			'manual_card_name'     => $manual_name,
			'game'                 => trim( (string) ( $item['game'] ?? '' ) ),
			'set_name'             => trim( (string) ( $item['set_name'] ?? '' ) ),
			'set_code'             => trim( (string) ( $item['set_code'] ?? '' ) ),
			'card_number'          => trim( (string) ( $item['card_number'] ?? '' ) ),
			'quantity'             => $quantity,
			'submitted_condition'  => trim( (string) ( $item['submitted_condition'] ?? '' ) ),
			'raw_or_graded'        => $raw_or_graded,
			'grading_company'      => $grading_company,
			'grade'                => $grade,
			'cert_number'          => trim( (string) ( $item['cert_number'] ?? '' ) ),
		);
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	private function optional_positive_int( mixed $value, string $field, array &$errors ): ?int {
		if ( null === $value || '' === $value ) {
			return null;
		}

		return $this->positive_int( $value, $field, $errors );
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	private function positive_int( mixed $value, string $field, array &$errors ): ?int {
		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		$errors[] = $field . '_invalid';

		return null;
	}
}
