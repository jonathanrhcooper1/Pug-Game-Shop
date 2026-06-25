<?php
/**
 * ScryDex sync checkpoint value.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexSyncCheckpoint {
	public const PROVIDER = 'scrydex';

	public function __construct(
		private int $job_id,
		private string $resource_type,
		private string $resource_key,
		private int $page_number,
		private string $cursor,
		private string $high_water_mark,
		private string $payload_hash,
		private int $committed_count
	) {
		$this->resource_type   = trim( $resource_type );
		$this->resource_key    = trim( $resource_key );
		$this->cursor          = trim( $cursor );
		$this->high_water_mark = trim( $high_water_mark );
		$this->payload_hash    = trim( $payload_hash );
		$this->page_number     = max( 0, $page_number );
		$this->committed_count = max( 0, $committed_count );
	}

	public static function initial( int $job_id, string $resource_type, string $resource_key ): self {
		return new self( $job_id, $resource_type, $resource_key, 0, '', '', '', 0 );
	}

	/**
	 * @param array<string, mixed> $row Checkpoint row.
	 */
	public static function from_row( array $row ): self {
		return new self(
			(int) ( $row['sync_job_id'] ?? 0 ),
			(string) ( $row['resource_type'] ?? '' ),
			(string) ( $row['resource_key'] ?? '' ),
			(int) ( $row['page_number'] ?? 0 ),
			(string) ( $row['cursor_value'] ?? '' ),
			(string) ( $row['high_water_mark'] ?? '' ),
			(string) ( $row['payload_hash'] ?? '' ),
			(int) ( $row['committed_count'] ?? 0 )
		);
	}

	public function after_successful_page(
		int $page_number,
		string $next_cursor,
		string $payload_hash,
		int $committed_count,
		string $high_water_mark = ''
	): self {
		return new self(
			$this->job_id,
			$this->resource_type,
			$this->resource_key,
			$page_number,
			$next_cursor,
			$high_water_mark,
			$payload_hash,
			$this->committed_count + max( 0, $committed_count )
		);
	}

	public function job_id(): int {
		return $this->job_id;
	}

	public function resource_type(): string {
		return $this->resource_type;
	}

	public function resource_key(): string {
		return $this->resource_key;
	}

	public function page_number(): int {
		return $this->page_number;
	}

	public function next_page(): int {
		return $this->page_number + 1;
	}

	public function cursor(): string {
		return $this->cursor;
	}

	public function high_water_mark(): string {
		return $this->high_water_mark;
	}

	public function payload_hash(): string {
		return $this->payload_hash;
	}

	public function committed_count(): int {
		return $this->committed_count;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function to_row(): array {
		return array(
			'sync_job_id'     => $this->job_id,
			'provider_name'   => self::PROVIDER,
			'resource_type'   => $this->resource_type,
			'resource_key'    => $this->resource_key,
			'page_number'     => $this->page_number,
			'cursor_value'    => '' === $this->cursor ? null : $this->cursor,
			'high_water_mark' => '' === $this->high_water_mark ? null : $this->high_water_mark,
			'payload_hash'    => '' === $this->payload_hash ? null : $this->payload_hash,
			'committed_count' => $this->committed_count,
		);
	}
}
