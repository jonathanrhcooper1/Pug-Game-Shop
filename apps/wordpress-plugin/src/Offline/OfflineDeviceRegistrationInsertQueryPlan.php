<?php
/**
 * Prepared insert query plan for offline device registration.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineDeviceRegistrationInsertQueryPlan {
	/**
	 * @param list<string> $columns Insert columns.
	 * @param list<mixed>  $prepare_args Prepared SQL arguments.
	 * @param list<string> $errors Query planning errors.
	 */
	private function __construct(
		private bool $is_valid,
		private string $table_name,
		private array $columns,
		private string $sql_template,
		private array $prepare_args,
		private string $device_id,
		private array $errors
	) {
	}

	/**
	 * @param list<string> $columns Insert columns.
	 * @param list<mixed>  $prepare_args Prepared SQL arguments.
	 */
	public static function accepted(
		string $table_name,
		array $columns,
		string $sql_template,
		array $prepare_args,
		string $device_id
	): self {
		return new self(
			true,
			$table_name,
			$columns,
			$sql_template,
			$prepare_args,
			$device_id,
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
			array(),
			'',
			array(),
			'',
			array_values( array_unique( $errors ) )
		);
	}

	public function is_valid(): bool {
		return $this->is_valid;
	}

	public function table_name(): string {
		return $this->table_name;
	}

	/**
	 * @return list<string>
	 */
	public function columns(): array {
		return $this->columns;
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
			'action'            => 'offline_device_registration_insert_query_planned',
			'is_valid'          => $this->is_valid,
			'table_name'        => $this->table_name,
			'device_id'         => $this->device_id,
			'column_count'      => count( $this->columns ),
			'prepare_arg_count' => count( $this->prepare_args ),
			'errors'            => $this->errors,
		);
	}
}
