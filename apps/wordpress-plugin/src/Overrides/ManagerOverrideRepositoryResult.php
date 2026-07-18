<?php
/**
 * Manager override repository result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Overrides;

final class ManagerOverrideRepositoryResult {
	public const STATUS_PERSISTED = 'persisted';
	public const STATUS_SKIPPED   = 'skipped';
	public const STATUS_REJECTED  = 'rejected';

	/**
	 * @param list<string>         $errors Repository errors.
	 * @param array<string, mixed> $plan_audit Audit-safe persistence plan.
	 */
	private function __construct(
		private string $status,
		private ?int $rows_affected,
		private ?int $manager_override_id,
		private array $errors,
		private array $plan_audit
	) {
	}

	public static function persisted(
		ManagerOverridePersistencePlan $plan,
		int $rows_affected,
		?int $manager_override_id
	): self {
		return new self(
			self::STATUS_PERSISTED,
			$rows_affected,
			$manager_override_id,
			array(),
			$plan->audit_data()
		);
	}

	public static function skipped( ManagerOverridePersistencePlan $plan ): self {
		return new self(
			self::STATUS_SKIPPED,
			null,
			null,
			array(),
			$plan->audit_data()
		);
	}

	/**
	 * @param list<string> $errors Repository errors.
	 */
	public static function rejected(
		ManagerOverridePersistencePlan $plan,
		array $errors,
		?int $rows_affected = null
	): self {
		return new self(
			self::STATUS_REJECTED,
			$rows_affected,
			null,
			array_values( array_unique( $errors ) ),
			$plan->audit_data()
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_persisted(): bool {
		return self::STATUS_PERSISTED === $this->status;
	}

	public function is_skipped(): bool {
		return self::STATUS_SKIPPED === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	public function rows_affected(): ?int {
		return $this->rows_affected;
	}

	public function manager_override_id(): ?int {
		return $this->manager_override_id;
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
			'action'                               => 'manager_override_repository_persist',
			'status'                               => $this->status,
			'is_persisted'                         => $this->is_persisted(),
			'is_skipped'                           => $this->is_skipped(),
			'is_rejected'                          => $this->is_rejected(),
			'rows_affected'                        => $this->rows_affected,
			'manager_override_id'                  => $this->manager_override_id,
			'manager_override_persisted'           => $this->is_persisted(),
			'manager_override_repository_deferred' => false,
			'route_connected_writes_deferred'      => true,
			'errors'                               => $this->errors,
			'plan'                                 => $this->plan_audit,
		);
	}
}
