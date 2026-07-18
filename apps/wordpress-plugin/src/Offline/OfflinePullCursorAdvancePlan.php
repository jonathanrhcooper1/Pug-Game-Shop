<?php
/**
 * Planned offline pull cursor advancement.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePullCursorAdvancePlan {
	/**
	 * @param list<array<string, mixed>> $cursor_rows Planned cursor rows.
	 * @param list<string>              $errors      Planning errors.
	 */
	private function __construct(
		private bool $is_valid,
		private string $device_id,
		private int $offline_device_id,
		private string $table_name,
		private array $cursor_rows,
		private array $errors
	) {
	}

	/**
	 * @param list<array<string, mixed>> $cursor_rows Planned cursor rows.
	 */
	public static function accepted(
		string $device_id,
		int $offline_device_id,
		string $table_prefix,
		array $cursor_rows
	): self {
		return new self(
			true,
			trim( $device_id ),
			$offline_device_id,
			trim( $table_prefix ) . 'tcg_offline_pull_cursors',
			array_values( $cursor_rows ),
			array()
		);
	}

	/**
	 * @param list<string> $errors Planning errors.
	 */
	public static function rejected( string $device_id, array $errors ): self {
		return new self(
			false,
			trim( $device_id ),
			0,
			'',
			array(),
			array_values( array_unique( $errors ) )
		);
	}

	public function is_valid(): bool {
		return $this->is_valid;
	}

	public function device_id(): string {
		return $this->device_id;
	}

	public function offline_device_id(): int {
		return $this->offline_device_id;
	}

	public function table_name(): string {
		return $this->table_name;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	public function cursor_rows(): array {
		return $this->cursor_rows;
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
			'action'                          => 'offline_pull_cursor_advance_planned',
			'is_valid'                        => $this->is_valid,
			'device_id'                       => $this->device_id,
			'offline_device_id'               => $this->offline_device_id,
			'table_name'                      => $this->table_name,
			'planned_domain_count'            => count( $this->cursor_rows ),
			'planned_change_count'            => $this->planned_change_count(),
			'cursor_write_deferred'           => true,
			'route_connected_writes_deferred' => true,
			'errors'                          => $this->errors,
		);
	}

	private function planned_change_count(): int {
		$count = 0;

		foreach ( $this->cursor_rows as $row ) {
			$count += (int) ( $row['row_count'] ?? 0 );
		}

		return $count;
	}
}
