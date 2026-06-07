<?php
/**
 * Planned offline push canonical mutation SQL templates.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushCanonicalMutationQueryBuildPlan {
	/**
	 * @param list<array<string, mixed>> $mutation_queries Prepared canonical mutation guard/write templates.
	 * @param list<string>              $errors Build errors.
	 * @param array<string, mixed>      $source_audit Canonical mutation plan audit.
	 */
	private function __construct(
		private bool $is_valid,
		private array $table_names,
		private array $mutation_queries,
		private array $errors,
		private array $source_audit
	) {
	}

	/**
	 * @param array<string, string>      $table_names Canonical table names.
	 * @param list<array<string, mixed>> $mutation_queries Prepared canonical mutation templates.
	 */
	public static function accepted(
		OfflinePushCanonicalMutationPlan $canonical_plan,
		array $table_names,
		array $mutation_queries
	): self {
		return new self(
			true,
			$table_names,
			array_values( $mutation_queries ),
			array(),
			$canonical_plan->audit_payload()
		);
	}

	/**
	 * @param array<string, string> $table_names Canonical table names.
	 * @param list<string>         $errors Build errors.
	 */
	public static function rejected(
		OfflinePushCanonicalMutationPlan $canonical_plan,
		array $table_names,
		array $errors
	): self {
		return new self(
			false,
			$table_names,
			array(),
			array_values( array_unique( $errors ) ),
			$canonical_plan->audit_payload()
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
	public function mutation_queries(): array {
		return $this->mutation_queries;
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
		return array(
			'action'                                 => 'offline_push_canonical_mutation_sql_planned',
			'is_valid'                               => $this->is_valid,
			'table_names'                            => $this->table_names,
			'mutation_query_count'                   => count( $this->mutation_queries ),
			'prepare_arg_count'                      => $this->prepare_arg_count(),
			'source'                                 => $this->source_audit,
			'inventory_write_execution_deferred'     => true,
			'event_registration_write_deferred'      => true,
			'customer_credit_ledger_write_deferred'  => true,
			'canonical_mutation_repository_deferred' => true,
			'route_connected_writes_deferred'        => true,
			'queue_replay_deferred'                  => true,
			'errors'                                 => $this->errors,
		);
	}

	public function prepare_arg_count(): int {
		$count = 0;

		foreach ( $this->mutation_queries as $query ) {
			$count += count( $query['prepare_args'] ?? array() );
		}

		return $count;
	}
}
