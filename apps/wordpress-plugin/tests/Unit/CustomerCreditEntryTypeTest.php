<?php
/**
 * Customer credit entry type tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Credit\CustomerCreditEntryType;
use TCGStorePlatform\Tests\TestCase;

final class CustomerCreditEntryTypeTest extends TestCase {
	public function test_entry_type_signs_match_ledger_rules(): void {
		$this->assert_same( 'positive', CustomerCreditEntryType::typical_sign( CustomerCreditEntryType::BUYLIST_CREDIT ) );
		$this->assert_same( 'negative', CustomerCreditEntryType::typical_sign( CustomerCreditEntryType::PURCHASE_REDEMPTION ) );
		$this->assert_same( 'either', CustomerCreditEntryType::typical_sign( CustomerCreditEntryType::CORRECTION ) );
		$this->assert_same( 'invalid', CustomerCreditEntryType::typical_sign( 'gift_card' ) );
	}

	public function test_manager_approval_required_for_sensitive_entries(): void {
		$this->assert_true( CustomerCreditEntryType::requires_manager_approval( CustomerCreditEntryType::MANUAL_ADD ) );
		$this->assert_true( CustomerCreditEntryType::requires_manager_approval( CustomerCreditEntryType::VOID ) );
		$this->assert_true( CustomerCreditEntryType::requires_manager_approval( CustomerCreditEntryType::TRANSFER_OUT ) );
		$this->assert_false( CustomerCreditEntryType::requires_manager_approval( CustomerCreditEntryType::BUYLIST_CREDIT ) );
		$this->assert_false( CustomerCreditEntryType::requires_manager_approval( CustomerCreditEntryType::PURCHASE_REDEMPTION ) );
	}
}
