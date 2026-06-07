<?php
/**
 * Manager override persistence plan.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Overrides;

final class ManagerOverridePersistencePlan {
	/**
	 * @param array<string, mixed> $row_data Row payload for tcg_manager_overrides.
	 * @param array<string, mixed> $audit_data Audit-safe payload.
	 */
	private function __construct(
		private bool $should_persist,
		private string $code,
		private array $row_data,
		private array $audit_data
	) {
	}

	/**
	 * @param array<string, mixed> $row_data Row payload for tcg_manager_overrides.
	 * @param array<string, mixed> $audit_data Audit-safe payload.
	 */
	public static function persist( array $row_data, array $audit_data ): self {
		return new self( true, 'manager_override_persistence_required', $row_data, $audit_data );
	}

	public static function skip( string $code ): self {
		return new self( false, $code, array(), array() );
	}

	public function should_persist(): bool {
		return $this->should_persist;
	}

	public function code(): string {
		return $this->code;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function row_data(): array {
		return $this->row_data;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_data(): array {
		return $this->audit_data;
	}
}
