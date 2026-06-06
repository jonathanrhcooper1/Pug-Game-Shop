<?php
/**
 * Customer credit REST posting payload parser.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Credit;

final class CustomerCreditRestPostingParser {
	/**
	 * @param array<string, mixed> $payload Request body.
	 */
	public function parse(
		int $path_customer_id,
		array $payload,
		?string $idempotency_header = null,
		?int $actor_user_id = null
	): CustomerCreditRestPostingValidationResult {
		$errors      = array();
		$customer_id = $path_customer_id;
		$entry_type  = trim( (string) ( $payload['entry_type'] ?? '' ) );
		$amount      = trim( (string) ( $payload['amount'] ?? '' ) );
		$currency    = strtoupper( trim( (string) ( $payload['currency'] ?? 'USD' ) ) );
		$reason      = trim( (string) ( $payload['reason'] ?? '' ) );
		$metadata    = $payload['metadata'] ?? array();

		$idempotency_source = $idempotency_header;

		if ( null === $idempotency_source || '' === trim( $idempotency_source ) ) {
			$idempotency_source = (string) ( $payload['idempotency_key'] ?? '' );
		}

		$idempotency = trim( $idempotency_source );

		$manager_id  = $this->optional_positive_int(
			$payload['manager_user_id'] ?? null,
			'manager_user_id',
			$errors
		);
		$order_id    = $this->optional_positive_int(
			$payload['order_id'] ?? null,
			'order_id',
			$errors
		);
		$buylist_id  = $this->optional_positive_int(
			$payload['buylist_submission_id'] ?? null,
			'buylist_submission_id',
			$errors
		);
		$location_id = $this->optional_positive_int( $payload['location_id'] ?? null, 'location_id', $errors );
		$offline_id  = trim( (string) ( $payload['offline_operation_id'] ?? '' ) );

		if ( $customer_id <= 0 ) {
			$errors[] = 'customer_id_required';
		}

		if (
			isset( $payload['customer_id'] )
			&& (int) $payload['customer_id'] !== $customer_id
		) {
			$errors[] = 'customer_id_mismatch';
		}

		if ( ! CustomerCreditEntryType::is_valid( $entry_type ) ) {
			$errors[] = 'entry_type_invalid';
		}

		if ( '' === $amount ) {
			$errors[] = 'amount_required';
		} elseif ( 1 !== preg_match( '/^-?\d+(?:\.\d{1,4})?$/', $amount ) ) {
			$errors[] = 'amount_invalid';
		}

		if ( '' === $idempotency ) {
			$errors[] = 'idempotency_key_required';
		}

		if ( 1 !== preg_match( '/^[A-Z]{3}$/', $currency ) ) {
			$errors[] = 'currency_invalid';
		}

		if ( ! is_array( $metadata ) ) {
			$errors[] = 'metadata_must_be_object';
			$metadata = array();
		}

		if (
			CustomerCreditEntryType::is_valid( $entry_type )
			&& CustomerCreditEntryType::requires_manager_approval( $entry_type )
		) {
			if ( null === $manager_id ) {
				$errors[] = 'manager_user_id_required';
			}

			if ( '' === $reason ) {
				$errors[] = 'reason_required';
			}
		}

		if ( $errors ) {
			return CustomerCreditRestPostingValidationResult::rejected( array_values( array_unique( $errors ) ) );
		}

		return CustomerCreditRestPostingValidationResult::accepted(
			new CustomerCreditPostingRequest(
				$customer_id,
				$entry_type,
				$amount,
				$idempotency,
				$currency,
				$actor_user_id,
				$manager_id,
				$order_id,
				$buylist_id,
				$location_id,
				$offline_id,
				$reason,
				$metadata
			)
		);
	}

	/**
	 * @param array<int, string> $errors Validation errors.
	 */
	private function optional_positive_int( mixed $value, string $field, array &$errors ): ?int {
		if ( null === $value || '' === $value ) {
			return null;
		}

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
