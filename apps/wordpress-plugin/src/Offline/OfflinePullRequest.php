<?php
/**
 * Parsed offline pull request.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePullRequest {
	/**
	 * @param list<string>          $domains Requested domains.
	 * @param array<string, string> $cursors Domain cursors.
	 */
	public function __construct(
		private string $device_id,
		private array $domains,
		private array $cursors,
		private int $page_size,
		private bool $include_tombstones,
		private int $schema_version
	) {
		$this->device_id = trim( $device_id );
		$this->domains   = $domains;
		$this->cursors   = $cursors;
	}

	public function device_id(): string {
		return $this->device_id;
	}

	/**
	 * @return list<string>
	 */
	public function domains(): array {
		return $this->domains;
	}

	/**
	 * @return array<string, string>
	 */
	public function cursors(): array {
		return $this->cursors;
	}

	public function page_size(): int {
		return $this->page_size;
	}

	public function include_tombstones(): bool {
		return $this->include_tombstones;
	}

	public function schema_version(): int {
		return $this->schema_version;
	}
}
