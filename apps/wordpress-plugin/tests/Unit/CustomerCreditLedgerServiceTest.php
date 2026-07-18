<?php
/**
 * Customer credit ledger service tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Credit\CustomerCreditEntryType;
use TCGStorePlatform\Credit\CustomerCreditLedgerService;
use TCGStorePlatform\Credit\CustomerCreditLedgerStorage;
use TCGStorePlatform\Credit\CustomerCreditPostingDecision;
use TCGStorePlatform\Credit\CustomerCreditPostingRequest;
use TCGStorePlatform\Tests\TestCase;

final class CustomerCreditLedgerServiceTest extends TestCase {
	public function test_service_posts_credit_and_updates_cached_balance(): void {
		$storage = new FakeCustomerCreditLedgerStorage(
			array(
				'customer_id'     => 10,
				'credit_balance'  => '12.0000',
				'credit_currency' => 'USD',
				'credit_version'  => 2,
				'row_version'     => 5,
			)
		);
		$result  = ( new CustomerCreditLedgerService( $storage ) )->post(
			new CustomerCreditPostingRequest(
				10,
				CustomerCreditEntryType::BUYLIST_CREDIT,
				'8.50',
				'buylist-10-1',
				'USD',
				123,
				null,
				null,
				456,
				7,
				'',
				'Accepted buylist offer.'
			)
		);

		$this->assert_true( $result->is_accepted() );
		$this->assert_same( 'posted', $result->code() );
		$this->assert_same( '20.5000', $result->balance_after() );
		$this->assert_same( 1, $storage->insert_count );
		$this->assert_same( '20.5000', $storage->customer['credit_balance'] );
		$this->assert_same( 3, $storage->customer['credit_version'] );
		$this->assert_same( 6, $storage->customer['row_version'] );
	}

	public function test_service_replays_duplicate_idempotency_key_without_new_post(): void {
		$storage = new FakeCustomerCreditLedgerStorage(
			array(
				'customer_id'     => 10,
				'credit_balance'  => '20.5000',
				'credit_currency' => 'USD',
				'credit_version'  => 3,
				'row_version'     => 6,
			),
			array(
				'credit_ledger_id' => 99,
				'idempotency_key'  => 'buylist-10-1',
				'balance_after'    => '20.5000',
			)
		);
		$result  = ( new CustomerCreditLedgerService( $storage ) )->post(
			new CustomerCreditPostingRequest( 10, CustomerCreditEntryType::BUYLIST_CREDIT, '8.50', 'buylist-10-1' )
		);

		$this->assert_true( $result->is_accepted() );
		$this->assert_true( $result->is_idempotent() );
		$this->assert_same( 'idempotent_replay', $result->code() );
		$this->assert_same( 99, $result->ledger_entry_id() );
		$this->assert_same( 0, $storage->insert_count );
		$this->assert_same( 0, $storage->update_count );
	}

	public function test_service_rejects_overspend_without_insert(): void {
		$storage = new FakeCustomerCreditLedgerStorage(
			array(
				'customer_id'     => 10,
				'credit_balance'  => '5.0000',
				'credit_currency' => 'USD',
				'credit_version'  => 1,
				'row_version'     => 1,
			)
		);
		$result  = ( new CustomerCreditLedgerService( $storage ) )->post(
			new CustomerCreditPostingRequest( 10, CustomerCreditEntryType::PURCHASE_REDEMPTION, '7.00', 'order-100' )
		);

		$this->assert_false( $result->is_accepted() );
		$this->assert_same( 'insufficient_credit', $result->code() );
		$this->assert_same( 0, $storage->insert_count );
		$this->assert_same( 0, $storage->update_count );
		$this->assert_same( 1, $storage->rollback_count );
	}

	public function test_service_rejects_missing_idempotency_key_before_transaction(): void {
		$storage = new FakeCustomerCreditLedgerStorage(
			array(
				'customer_id'     => 10,
				'credit_balance'  => '5.0000',
				'credit_currency' => 'USD',
			)
		);
		$result  = ( new CustomerCreditLedgerService( $storage ) )->post(
			new CustomerCreditPostingRequest( 10, CustomerCreditEntryType::BUYLIST_CREDIT, '1.00', '' )
		);

		$this->assert_false( $result->is_accepted() );
		$this->assert_same( 'missing_idempotency_key', $result->code() );
		$this->assert_same( 0, $storage->begin_count );
	}
}

final class FakeCustomerCreditLedgerStorage implements CustomerCreditLedgerStorage {
	/**
	 * @var array<string, mixed>
	 */
	public array $customer;

	/**
	 * @var array<string, mixed>|null
	 */
	private ?array $existing;

	public int $begin_count    = 0;
	public int $commit_count   = 0;
	public int $rollback_count = 0;
	public int $insert_count   = 0;
	public int $update_count   = 0;

	/**
	 * @param array<string, mixed>      $customer Customer row.
	 * @param array<string, mixed>|null $existing Existing ledger row.
	 */
	public function __construct( array $customer, ?array $existing = null ) {
		$this->customer = $customer;
		$this->existing = $existing;
	}

	public function begin_transaction(): void {
		++$this->begin_count;
	}

	public function commit(): void {
		++$this->commit_count;
	}

	public function rollback(): void {
		++$this->rollback_count;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function find_by_idempotency_key( string $idempotency_key ): ?array {
		if ( null !== $this->existing && $idempotency_key === (string) $this->existing['idempotency_key'] ) {
			return $this->existing;
		}

		return null;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function get_customer_for_update( int $customer_id ): ?array {
		return $customer_id === (int) $this->customer['customer_id'] ? $this->customer : null;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function insert_ledger_entry(
		int $customer_id,
		CustomerCreditPostingDecision $decision,
		CustomerCreditPostingRequest $request
	): ?array {
		++$this->insert_count;

		$this->existing = array(
			'credit_ledger_id' => 1,
			'customer_id'      => $customer_id,
			'entry_type'       => $decision->entry_type(),
			'amount'           => $decision->signed_amount(),
			'idempotency_key'  => $request->idempotency_key(),
			'balance_after'    => $decision->balance_after(),
		);

		return $this->existing;
	}

	public function update_customer_balance(
		int $customer_id,
		string $balance_after,
		int $credit_version,
		int $row_version
	): bool {
		++$this->update_count;

		if ( $customer_id !== (int) $this->customer['customer_id'] ) {
			return false;
		}

		$this->customer['credit_balance'] = $balance_after;
		$this->customer['credit_version'] = $credit_version;
		$this->customer['row_version']    = $row_version;

		return true;
	}
}
