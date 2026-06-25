<?php
/**
 * Prepared offline conflict resolution update query plan.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineConflictResolutionQueryPlan {
	/**
	 * @param list<mixed>  $prepare_args Prepared SQL arguments.
	 * @param list<string> $errors Query planning errors.
	 */
	private function __construct(
		private bool $is_valid,
		private string $table_name,
		private string $sql_template,
		private array $prepare_args,
		private string $conflict_id,
		private string $resolution_id,
		private string $target_status,
		private string $resolution_action,
		private ?int $manager_id,
		private ?int $expected_row_version,
		private ?int $next_row_version,
		private array $errors
	) {
	}

	/**
	 * @param list<mixed> $prepare_args Prepared SQL arguments.
	 */
	public static function accepted(
		string $table_name,
		string $sql_template,
		array $prepare_args,
		string $conflict_id,
		string $resolution_id,
		string $target_status,
		string $resolution_action,
		int $manager_id,
		int $expected_row_version,
		int $next_row_version
	): self {
		return new self(
			true,
			$table_name,
			$sql_template,
			array_values( $prepare_args ),
			$conflict_id,
			$resolution_id,
			$target_status,
			$resolution_action,
			$manager_id,
			$expected_row_version,
			$next_row_version,
			array()
		);
	}

	/**
	 * @param list<string> $errors Query planning errors.
	 */
	public static function rejected( array $errors ): self {
		return new self(
			false,
			'',
			'',
			array(),
			'',
			'',
			'',
			'',
			null,
			null,
			null,
			array_values( array_unique( $errors ) )
		);
	}

	public function is_valid(): bool {
		return $this->is_valid;
	}

	public function table_name(): string {
		return $this->table_name;
	}

	public function sql_template(): string {
		return $this->sql_template;
	}

	/**
	 * @return list<mixed>
	 */
	public function prepare_args(): array {
		return $this->prepare_args;
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
			'action'               => 'offline_conflict_resolution_query_planned',
			'is_valid'             => $this->is_valid,
			'table_name'           => $this->table_name,
			'prepare_arg_count'    => count( $this->prepare_args ),
			'conflict_id'          => $this->conflict_id,
			'resolution_id'        => $this->resolution_id,
			'target_status'        => $this->target_status,
			'resolution_action'    => $this->resolution_action,
			'manager_id'           => $this->manager_id,
			'expected_row_version' => $this->expected_row_version,
			'next_row_version'     => $this->next_row_version,
			'errors'               => $this->errors,
		);
	}
}
