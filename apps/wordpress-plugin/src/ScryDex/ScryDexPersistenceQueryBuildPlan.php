<?php
/**
 * Planned ScryDex persistence SQL templates.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexPersistenceQueryBuildPlan {
	/**
	 * @param array<string, string>      $table_names ScryDex persistence table names.
	 * @param list<array<string, mixed>> $reference_insert_queries Reference-card insert templates.
	 * @param list<array<string, mixed>> $reference_update_queries Reference-card update templates.
	 * @param list<array<string, mixed>> $price_observation_queries Provider price observation insert templates.
	 * @param array<string, mixed>|null  $checkpoint_upsert_query Checkpoint upsert template.
	 * @param list<string>              $errors Query build errors.
	 */
	private function __construct(
		private bool $is_valid,
		private array $table_names,
		private array $reference_insert_queries,
		private array $reference_update_queries,
		private array $price_observation_queries,
		private ?array $checkpoint_upsert_query,
		private array $errors,
		private ScryDexPersistencePlan $source_plan
	) {
	}

	/**
	 * @param array<string, string>      $table_names ScryDex persistence table names.
	 * @param list<array<string, mixed>> $reference_insert_queries Reference-card insert templates.
	 * @param list<array<string, mixed>> $reference_update_queries Reference-card update templates.
	 * @param list<array<string, mixed>> $price_observation_queries Provider price observation insert templates.
	 * @param array<string, mixed>|null  $checkpoint_upsert_query Checkpoint upsert template.
	 */
	public static function accepted(
		ScryDexPersistencePlan $source_plan,
		array $table_names,
		array $reference_insert_queries,
		array $reference_update_queries,
		array $price_observation_queries,
		?array $checkpoint_upsert_query
	): self {
		return new self(
			true,
			$table_names,
			array_values( $reference_insert_queries ),
			array_values( $reference_update_queries ),
			array_values( $price_observation_queries ),
			$checkpoint_upsert_query,
			array(),
			$source_plan
		);
	}

	/**
	 * @param array<string, string> $table_names ScryDex persistence table names.
	 * @param list<string>         $errors Query build errors.
	 */
	public static function rejected( ScryDexPersistencePlan $source_plan, array $table_names, array $errors ): self {
		return new self(
			false,
			$table_names,
			array(),
			array(),
			array(),
			null,
			array_values( array_unique( $errors ) ),
			$source_plan
		);
	}

	public function is_valid(): bool {
		return $this->is_valid;
	}

	/**
	 * @return array<string, string>
	 */
	public function table_names(): array {
		return $this->table_names;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function reference_insert_queries(): array {
		return $this->reference_insert_queries;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function reference_update_queries(): array {
		return $this->reference_update_queries;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function price_observation_queries(): array {
		return $this->price_observation_queries;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function checkpoint_upsert_query(): ?array {
		return $this->checkpoint_upsert_query;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	public function total_query_count(): int {
		return count( $this->reference_insert_queries )
			+ count( $this->reference_update_queries )
			+ count( $this->price_observation_queries )
			+ ( null === $this->checkpoint_upsert_query ? 0 : 1 );
	}

	public function prepare_arg_count(): int {
		$count = 0;

		foreach ( $this->all_queries() as $query ) {
			$count += count( $query['prepare_args'] ?? array() );
		}

		return $count;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'                                     => 'scrydex_persistence_sql_planned',
			'is_valid'                                   => $this->is_valid,
			'table_names'                                => $this->table_names,
			'source_status'                              => $this->source_plan->status(),
			'reference_insert_query_count'               => count( $this->reference_insert_queries ),
			'reference_update_query_count'               => count( $this->reference_update_queries ),
			'price_observation_query_count'              => count( $this->price_observation_queries ),
			'checkpoint_upsert_query_present'            => null !== $this->checkpoint_upsert_query,
			'total_query_count'                          => $this->total_query_count(),
			'prepare_arg_count'                          => $this->prepare_arg_count(),
			'reference_write_count'                      => $this->source_plan->reference_write_count(),
			'unchanged_reference_count'                  => count( $this->source_plan->unchanged_reference_keys() ),
			'price_observation_count'                    => count( $this->source_plan->price_observations() ),
			'persistence_query_execution_deferred'       => true,
			'persistence_repository_deferred'            => true,
			'checkpoint_upsert_execution_deferred'       => true,
			'provider_price_observation_writes_deferred' => true,
			'reference_card_writes_deferred'             => true,
			'errors'                                     => $this->errors,
		);
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function all_queries(): array {
		$queries = array_merge(
			$this->reference_insert_queries,
			$this->reference_update_queries,
			$this->price_observation_queries
		);

		if ( null !== $this->checkpoint_upsert_query ) {
			$queries[] = $this->checkpoint_upsert_query;
		}

		return $queries;
	}
}
