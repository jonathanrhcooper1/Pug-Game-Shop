<?php
/**
 * Customer credit ledger wpdb repository.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Credit;

final class CustomerCreditLedgerRepository implements CustomerCreditLedgerStorage {
	private \wpdb $database;

	public function __construct( \wpdb $database ) {
		$this->database = $database;
	}

	public function begin_transaction(): void {
		$this->database->query( 'START TRANSACTION' );
	}

	public function commit(): void {
		$this->database->query( 'COMMIT' );
	}

	public function rollback(): void {
		$this->database->query( 'ROLLBACK' );
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function find_by_idempotency_key( string $idempotency_key ): ?array {
		if ( '' === $idempotency_key ) {
			return null;
		}

		$table_name = $this->database->prefix . 'tcg_customer_credit_ledger';

		$row = $this->database->get_row(
			$this->database->prepare(
				"SELECT * FROM {$table_name} WHERE idempotency_key = %s LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$idempotency_key
			),
			ARRAY_A
		);

		return is_array( $row ) ? $row : null;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function get_customer_for_update( int $customer_id ): ?array {
		$table_name = $this->database->prefix . 'tcg_customers';

		$row = $this->database->get_row(
			$this->database->prepare(
				"SELECT * FROM {$table_name} WHERE customer_id = %d LIMIT 1 FOR UPDATE", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$customer_id
			),
			ARRAY_A
		);

		return is_array( $row ) ? $row : null;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function insert_ledger_entry(
		int $customer_id,
		CustomerCreditPostingDecision $decision,
		CustomerCreditPostingRequest $request
	): ?array {
		$table_name           = $this->database->prefix . 'tcg_customer_credit_ledger';
		$offline_operation_id = $request->offline_operation_id();
		$reason               = $request->reason();
		$inserted             = $this->database->insert(
			$table_name,
			array(
				'public_id'              => $this->uuid(),
				'customer_id'            => $customer_id,
				'entry_type'             => $decision->entry_type(),
				'amount'                 => $decision->signed_amount(),
				'currency'               => $request->currency(),
				'balance_before'         => $decision->balance_before(),
				'balance_after'          => $decision->balance_after(),
				'related_ledger_id'      => null,
				'idempotency_key'        => $request->idempotency_key(),
				'actor_user_id'          => $request->actor_user_id(),
				'manager_user_id'        => $request->manager_user_id(),
				'order_id'               => $request->order_id(),
				'buylist_submission_id'  => $request->buylist_submission_id(),
				'location_id'            => $request->location_id(),
				'offline_operation_id'   => '' === $offline_operation_id ? null : $offline_operation_id,
				'reason'                 => '' === $reason ? null : substr( $reason, 0, 255 ),
				'metadata_json'          => $this->encode_json( $request->metadata() ),
				'created_at'             => $this->now(),
			),
			array(
				'%s',
				'%d',
				'%s',
				'%s',
				'%s',
				'%s',
				'%s',
				'%d',
				'%s',
				'%d',
				'%d',
				'%d',
				'%d',
				'%d',
				'%s',
				'%s',
				'%s',
				'%s',
			)
		);

		if ( false === $inserted ) {
			return null;
		}

		return $this->get_ledger_entry( (int) $this->database->insert_id );
	}

	public function update_customer_balance(
		int $customer_id,
		string $balance_after,
		int $credit_version,
		int $row_version
	): bool {
		$table_name = $this->database->prefix . 'tcg_customers';
		$updated    = $this->database->update(
			$table_name,
			array(
				'credit_balance'  => $balance_after,
				'credit_version'  => $credit_version,
				'updated_at'      => $this->now(),
				'row_version'     => $row_version,
			),
			array( 'customer_id' => $customer_id ),
			array( '%s', '%d', '%s', '%d' ),
			array( '%d' )
		);

		return false !== $updated;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	private function get_ledger_entry( int $credit_ledger_id ): ?array {
		$table_name = $this->database->prefix . 'tcg_customer_credit_ledger';

		$row = $this->database->get_row(
			$this->database->prepare(
				"SELECT * FROM {$table_name} WHERE credit_ledger_id = %d LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$credit_ledger_id
			),
			ARRAY_A
		);

		return is_array( $row ) ? $row : null;
	}

	private function now(): string {
		return gmdate( 'Y-m-d H:i:s' );
	}

	private function uuid(): string {
		if ( function_exists( 'wp_generate_uuid4' ) ) {
			return wp_generate_uuid4();
		}

		$bytes    = random_bytes( 16 );
		$bytes[6] = chr( ( ord( $bytes[6] ) & 0x0f ) | 0x40 );
		$bytes[8] = chr( ( ord( $bytes[8] ) & 0x3f ) | 0x80 );

		return vsprintf( '%s%s-%s-%s-%s-%s%s%s', str_split( bin2hex( $bytes ), 4 ) );
	}

	/**
	 * @param array<string, mixed> $metadata Metadata payload.
	 */
	private function encode_json( array $metadata ): string {
		if ( function_exists( 'wp_json_encode' ) ) {
			return (string) wp_json_encode( $metadata );
		}

		return (string) json_encode( $metadata );
	}
}
