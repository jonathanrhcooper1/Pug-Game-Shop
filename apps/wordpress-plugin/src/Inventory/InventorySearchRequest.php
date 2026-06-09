<?php
/**
 * Normalized inventory search request.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Inventory;

final class InventorySearchRequest {
	/**
	 * @param list<string> $statuses Inventory statuses.
	 */
	public function __construct(
		private string $query,
		private string $game,
		private array $statuses,
		private ?int $location_id,
		private string $visibility,
		private string $sort,
		private int $page,
		private int $page_size,
		private string $set_filter = ''
	) {
	}

	public function query(): string {
		return $this->query;
	}

	public function game(): string {
		return $this->game;
	}

	public function set_filter(): string {
		return $this->set_filter;
	}

	/**
	 * @return list<string>
	 */
	public function statuses(): array {
		return $this->statuses;
	}

	public function location_id(): ?int {
		return $this->location_id;
	}

	public function visibility(): string {
		return $this->visibility;
	}

	public function sort(): string {
		return $this->sort;
	}

	public function page(): int {
		return $this->page;
	}

	public function page_size(): int {
		return $this->page_size;
	}
}
