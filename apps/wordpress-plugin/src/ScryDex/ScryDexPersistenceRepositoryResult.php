<?php
/**
 * ScryDex persistence repository staging result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexPersistenceRepositoryResult {
	public const STATUS_DEFERRED = 'deferred';
	public const STATUS_EXECUTED = 'executed';
	public const STATUS_REJECTED = 'rejected';

	/**
	 * @param list<array<string, mixed>> $reference_insert_results Reference insert staging results.
	 * @param list<array<string, mixed>> $reference_update_results Reference update staging results.
	 * @param list<array<string, mixed>> $reference_variant_upsert_results Reference variant upsert staging results.
	 * @param list<array<string, mixed>> $price_observation_results Provider price observation staging results.
	 * @param list<array<string, mixed>> $price_point_results Provider price-point staging results.
	 * @param array<string, mixed>|null  $checkpoint_result Checkpoint upsert staging result.
	 * @param list<string>              $errors Repository errors.
	 * @param array<string, mixed>      $query_audit ScryDex persistence query audit.
	 * @param list<string>              $transaction_commands Transaction commands attempted.
	 */
	private function __construct(
		private string $status,
		private array $reference_insert_results,
		private array $reference_update_results,
		private array $reference_variant_upsert_results,
		private array $price_observation_results,
		private array $price_point_results,
		private ?array $checkpoint_result,
		private array $errors,
		private array $query_audit,
		private array $transaction_commands = array()
	) {
	}

	/**
	 * @param list<array<string, mixed>> $reference_insert_results Reference insert staging results.
	 * @param list<array<string, mixed>> $reference_update_results Reference update staging results.
	 * @param list<array<string, mixed>> $reference_variant_upsert_results Reference variant upsert staging results.
	 * @param list<array<string, mixed>> $price_observation_results Provider price observation staging results.
	 * @param list<array<string, mixed>> $price_point_results Provider price-point staging results.
	 * @param array<string, mixed>|null  $checkpoint_result Checkpoint upsert staging result.
	 */
	public static function deferred(
		ScryDexPersistenceQueryBuildPlan $query_plan,
		array $reference_insert_results,
		array $reference_update_results,
		array $reference_variant_upsert_results,
		array $price_observation_results,
		array $price_point_results,
		?array $checkpoint_result
	): self {
		return new self(
			self::STATUS_DEFERRED,
			array_values( $reference_insert_results ),
			array_values( $reference_update_results ),
			array_values( $reference_variant_upsert_results ),
			array_values( $price_observation_results ),
			array_values( $price_point_results ),
			$checkpoint_result,
			array(),
			$query_plan->audit_payload()
		);
	}

	/**
	 * @param list<string> $errors Repository errors.
	 * @param list<array<string, mixed>> $reference_insert_results Reference insert execution results.
	 * @param list<array<string, mixed>> $reference_update_results Reference update execution results.
	 * @param list<array<string, mixed>> $reference_variant_upsert_results Reference variant upsert execution results.
	 * @param list<array<string, mixed>> $price_observation_results Provider price observation execution results.
	 * @param list<array<string, mixed>> $price_point_results Provider price-point execution results.
	 * @param array<string, mixed>|null  $checkpoint_result Checkpoint upsert execution result.
	 * @param list<string>              $transaction_commands Transaction commands attempted.
	 */
	public static function rejected(
		ScryDexPersistenceQueryBuildPlan $query_plan,
		array $errors,
		array $reference_insert_results = array(),
		array $reference_update_results = array(),
		array $reference_variant_upsert_results = array(),
		array $price_observation_results = array(),
		array $price_point_results = array(),
		?array $checkpoint_result = null,
		array $transaction_commands = array()
	): self {
		return new self(
			self::STATUS_REJECTED,
			array_values( $reference_insert_results ),
			array_values( $reference_update_results ),
			array_values( $reference_variant_upsert_results ),
			array_values( $price_observation_results ),
			array_values( $price_point_results ),
			$checkpoint_result,
			array_values( array_unique( $errors ) ),
			$query_plan->audit_payload(),
			array_values( $transaction_commands )
		);
	}

	/**
	 * @param list<array<string, mixed>> $reference_insert_results Reference insert execution results.
	 * @param list<array<string, mixed>> $reference_update_results Reference update execution results.
	 * @param list<array<string, mixed>> $reference_variant_upsert_results Reference variant upsert execution results.
	 * @param list<array<string, mixed>> $price_observation_results Provider price observation execution results.
	 * @param list<array<string, mixed>> $price_point_results Provider price-point execution results.
	 * @param array<string, mixed>|null  $checkpoint_result Checkpoint upsert execution result.
	 * @param list<string>              $transaction_commands Transaction commands attempted.
	 */
	public static function executed(
		ScryDexPersistenceQueryBuildPlan $query_plan,
		array $reference_insert_results,
		array $reference_update_results,
		array $reference_variant_upsert_results,
		array $price_observation_results,
		array $price_point_results,
		?array $checkpoint_result,
		array $transaction_commands
	): self {
		return new self(
			self::STATUS_EXECUTED,
			array_values( $reference_insert_results ),
			array_values( $reference_update_results ),
			array_values( $reference_variant_upsert_results ),
			array_values( $price_observation_results ),
			array_values( $price_point_results ),
			$checkpoint_result,
			array(),
			$query_plan->audit_payload(),
			array_values( $transaction_commands )
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_deferred(): bool {
		return self::STATUS_DEFERRED === $this->status;
	}

	public function is_executed(): bool {
		return self::STATUS_EXECUTED === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	public function rows_affected(): int {
		$rows = 0;

		foreach ( $this->all_results() as $result ) {
			$rows += $this->non_negative_int( $result['rows_affected'] ?? 0 );
		}

		return $rows;
	}

	public function reference_insert_query_count(): int {
		return count( $this->reference_insert_results );
	}

	public function reference_update_query_count(): int {
		return count( $this->reference_update_results );
	}

	public function reference_variant_upsert_query_count(): int {
		return count( $this->reference_variant_upsert_results );
	}

	public function price_observation_query_count(): int {
		return count( $this->price_observation_results );
	}

	public function price_point_query_count(): int {
		return count( $this->price_point_results );
	}

	public function checkpoint_query_count(): int {
		return null === $this->checkpoint_result ? 0 : 1;
	}

	public function total_query_count(): int {
		return $this->reference_insert_query_count()
			+ $this->reference_update_query_count()
			+ $this->reference_variant_upsert_query_count()
			+ $this->price_observation_query_count()
			+ $this->price_point_query_count()
			+ $this->checkpoint_query_count();
	}

	public function prepare_arg_count(): int {
		$count = 0;

		foreach ( $this->all_results() as $result ) {
			$count += $this->non_negative_int( $result['prepare_arg_count'] ?? 0 );
		}

		return $count;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function reference_insert_results(): array {
		return $this->reference_insert_results;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function reference_update_results(): array {
		return $this->reference_update_results;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function reference_variant_upsert_results(): array {
		return $this->reference_variant_upsert_results;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function price_observation_results(): array {
		return $this->price_observation_results;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function price_point_results(): array {
		return $this->price_point_results;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function checkpoint_result(): ?array {
		return $this->checkpoint_result;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		$executed = $this->is_executed();

		return array(
			'action'                                     => 'scrydex_persistence_repository',
			'status'                                     => $this->status,
			'is_deferred'                                => $this->is_deferred(),
			'is_executed'                                => $executed,
			'is_rejected'                                => $this->is_rejected(),
			'reference_insert_query_count'               => $this->reference_insert_query_count(),
			'reference_update_query_count'               => $this->reference_update_query_count(),
			'reference_variant_upsert_query_count'       => $this->reference_variant_upsert_query_count(),
			'price_observation_query_count'              => $this->price_observation_query_count(),
			'price_point_query_count'                    => $this->price_point_query_count(),
			'checkpoint_query_count'                     => $this->checkpoint_query_count(),
			'total_query_count'                          => $this->total_query_count(),
			'prepare_arg_count'                          => $this->prepare_arg_count(),
			'rows_affected'                              => $this->rows_affected(),
			'query'                                      => $this->query_audit,
			'reference_insert_results'                   => $this->reference_insert_results,
			'reference_update_results'                   => $this->reference_update_results,
			'reference_variant_upsert_results'           => $this->reference_variant_upsert_results,
			'price_observation_results'                  => $this->price_observation_results,
			'price_point_results'                        => $this->price_point_results,
			'checkpoint_result'                          => $this->checkpoint_result,
			'explicit_execution_required'                => true,
			'transaction_started'                        => in_array( 'START TRANSACTION', $this->transaction_commands, true ),
			'transaction_committed'                      => $executed && in_array( 'COMMIT', $this->transaction_commands, true ),
			'transaction_rolled_back'                    => in_array( 'ROLLBACK', $this->transaction_commands, true ),
			'transaction_commands'                       => $this->transaction_commands,
			'persistence_query_execution_deferred'       => ! $executed,
			'persistence_repository_deferred'            => ! $executed,
			'reference_card_writes_deferred'             => ! $executed,
			'provider_price_observation_writes_deferred' => ! $executed,
			'provider_price_point_writes_deferred'       => ! $executed,
			'reference_variant_writes_deferred'          => ! $executed,
			'checkpoint_upsert_execution_deferred'       => ! $executed,
			'errors'                                     => $this->errors,
		);
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function all_results(): array {
		$results = array_merge(
			$this->reference_insert_results,
			$this->reference_update_results,
			$this->reference_variant_upsert_results,
			$this->price_observation_results,
			$this->price_point_results
		);

		if ( null !== $this->checkpoint_result ) {
			$results[] = $this->checkpoint_result;
		}

		return $results;
	}

	private function non_negative_int( mixed $value ): int {
		if ( is_int( $value ) && 0 <= $value ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return (int) $value;
		}

		return 0;
	}
}
