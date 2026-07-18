<?php
/**
 * Customer credit ledger posting service.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Credit;

use Throwable;

final class CustomerCreditLedgerService {
	public function __construct(
		private CustomerCreditLedgerStorage $storage,
		private ?CustomerCreditPostingPolicy $policy = null
	) {
		$this->policy = $policy ?? new CustomerCreditPostingPolicy();
	}

	public function post( CustomerCreditPostingRequest $request ): CustomerCreditPostingResult {
		if ( $request->customer_id() <= 0 ) {
			return CustomerCreditPostingResult::rejected( 'invalid_customer', 'Customer ID is required.' );
		}

		if ( '' === $request->idempotency_key() ) {
			return CustomerCreditPostingResult::rejected(
				'missing_idempotency_key',
				'Customer credit posts require an idempotency key.'
			);
		}

		if ( 3 !== strlen( $request->currency() ) ) {
			return CustomerCreditPostingResult::rejected(
				'invalid_currency',
				'Customer credit currency must be a three-letter code.'
			);
		}

		$this->storage->begin_transaction();

		try {
			$existing = $this->storage->find_by_idempotency_key( $request->idempotency_key() );

			if ( null !== $existing ) {
				$this->storage->commit();

				return CustomerCreditPostingResult::idempotent( $existing );
			}

			$customer = $this->storage->get_customer_for_update( $request->customer_id() );

			if ( null === $customer ) {
				$this->storage->rollback();

				return CustomerCreditPostingResult::rejected( 'customer_not_found', 'Customer was not found.' );
			}

			$customer_currency = strtoupper( (string) ( $customer['credit_currency'] ?? 'USD' ) );

			if ( $request->currency() !== $customer_currency ) {
				$this->storage->rollback();

				return CustomerCreditPostingResult::rejected(
					'currency_mismatch',
					'Customer credit currency does not match the account currency.'
				);
			}

			$decision = $this->policy->preview(
				$request->entry_type(),
				$request->amount(),
				(string) ( $customer['credit_balance'] ?? '0.0000' ),
				$request->has_manager_approval()
			);

			if ( ! $decision->is_accepted() ) {
				$this->storage->rollback();

				return CustomerCreditPostingResult::rejected( $decision->code(), $decision->message() );
			}

			$entry = $this->storage->insert_ledger_entry( $request->customer_id(), $decision, $request );

			if ( null === $entry ) {
				$this->storage->rollback();

				return CustomerCreditPostingResult::rejected(
					'ledger_insert_failed',
					'Customer credit ledger entry could not be inserted.'
				);
			}

			$updated = $this->storage->update_customer_balance(
				$request->customer_id(),
				$decision->balance_after(),
				(int) ( $customer['credit_version'] ?? 0 ) + 1,
				(int) ( $customer['row_version'] ?? 1 ) + 1
			);

			if ( ! $updated ) {
				$this->storage->rollback();

				return CustomerCreditPostingResult::rejected(
					'customer_update_failed',
					'Customer credit balance could not be updated.'
				);
			}

			$this->storage->commit();

			return CustomerCreditPostingResult::posted( $entry, $decision );
		} catch ( Throwable $error ) {
			$this->storage->rollback();

			return CustomerCreditPostingResult::rejected( 'ledger_post_failed', $error->getMessage() );
		}
	}
}
