<?php
/**
 * Parsed offline conflict resolution request.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineConflictResolutionRequest {
	/**
	 * @param array<string, mixed> $resolution_payload Resolution payload.
	 */
	public function __construct(
		private string $conflict_id,
		private string $resolution_id,
		private string $device_id,
		private int $manager_id,
		private string $resolution_action,
		private string $resolution_note,
		private int $expected_conflict_version,
		private string $resolved_at_utc,
		private array $resolution_payload,
		private int $schema_version
	) {
		$this->conflict_id       = trim( $conflict_id );
		$this->resolution_id     = trim( $resolution_id );
		$this->device_id         = trim( $device_id );
		$this->resolution_action = strtolower( trim( $resolution_action ) );
		$this->resolution_note   = $this->normalize_text( $resolution_note );
		$this->resolved_at_utc   = trim( $resolved_at_utc );
	}

	public function conflict_id(): string {
		return $this->conflict_id;
	}

	public function resolution_id(): string {
		return $this->resolution_id;
	}

	public function device_id(): string {
		return $this->device_id;
	}

	public function manager_id(): int {
		return $this->manager_id;
	}

	public function resolution_action(): string {
		return $this->resolution_action;
	}

	public function resolution_note(): string {
		return $this->resolution_note;
	}

	public function expected_conflict_version(): int {
		return $this->expected_conflict_version;
	}

	public function resolved_at_utc(): string {
		return $this->resolved_at_utc;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function resolution_payload(): array {
		return $this->resolution_payload;
	}

	public function schema_version(): int {
		return $this->schema_version;
	}

	private function normalize_text( string $value ): string {
		return trim( (string) preg_replace( '/\s+/', ' ', $value ) );
	}
}
