<?php
/**
 * Customer credit ledger storage contract.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Credit;

interface CustomerCreditLedgerStorage {
	public function begin_transaction(): void;

	public function commit(): void;

	public function rollback(): void;

	/**
	 * @return array<string, mixed>|null
	 */
	public function find_by_idempotency_key( string $idempotency_key ): ?array;

	/**
	 * @return array<string, mixed>|null
	 */
	public function get_customer_for_update( int $customer_id ): ?array;

	/**
	 * @return array<string, mixed>|null
	 */
	public function insert_ledger_entry(
		int $customer_id,
		CustomerCreditPostingDecision $decision,
		CustomerCreditPostingRequest $request
	): ?array;

	public function update_customer_balance(
		int $customer_id,
		string $balance_after,
		int $credit_version,
		int $row_version
	): bool;
}
