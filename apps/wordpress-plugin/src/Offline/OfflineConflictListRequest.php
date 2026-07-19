<?php
/**
 * Parsed offline conflict list request.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineConflictListRequest {
	/**
	 * @param list<string> $statuses Conflict statuses.
	 * @param list<string> $entity_types Conflict entity types.
	 */
	public function __construct(
		private string $device_id,
		private array $statuses,
		private array $entity_types,
		private ?string $cursor,
		private int $page_size,
		private bool $include_resolved,
		private int $schema_version
	) {
		$this->device_id = trim( $device_id );
		$this->cursor    = null === $cursor || '' === trim( $cursor ) ? null : trim( $cursor );
	}

	public function device_id(): string {
		return $this->device_id;
	}

	/**
	 * @return list<string>
	 */
	public function statuses(): array {
		return $this->statuses;
	}

	/**
	 * @return list<string>
	 */
	public function entity_types(): array {
		return $this->entity_types;
	}

	public function cursor(): ?string {
		return $this->cursor;
	}

	public function page_size(): int {
		return $this->page_size;
	}

	public function include_resolved(): bool {
		return $this->include_resolved;
	}

	public function schema_version(): int {
		return $this->schema_version;
	}
}
