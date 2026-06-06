<?php
/**
 * Prepared lookup query plan for registered offline devices.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineRegisteredDeviceLookupQueryPlan {
	/**
	 * @param list<string> $selected_columns Selected device columns.
	 * @param list<mixed>  $prepare_args Prepared SQL arguments.
	 * @param list<string> $errors Query planning errors.
	 */
	private function __construct(
		private bool $is_valid,
		private string $token_fingerprint,
		private string $table_name,
		private array $selected_columns,
		private string $sql_template,
		private array $prepare_args,
		private string $row_normalizer,
		private array $errors
	) {
	}

	/**
	 * @param list<string> $selected_columns Selected device columns.
	 * @param list<mixed>  $prepare_args Prepared SQL arguments.
	 */
	public static function accepted(
		string $token_fingerprint,
		string $table_name,
		array $selected_columns,
		string $sql_template,
		array $prepare_args,
		string $row_normalizer
	): self {
		return new self(
			true,
			$token_fingerprint,
			$table_name,
			$selected_columns,
			$sql_template,
			$prepare_args,
			$row_normalizer,
			array()
		);
	}

	/**
	 * @param list<string> $errors Query planning errors.
	 */
	public static function rejected( string $token_fingerprint, array $errors ): self {
		return new self(
			false,
			$token_fingerprint,
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

	public function token_fingerprint(): string {
		return $this->token_fingerprint;
	}

	public function table_name(): string {
		return $this->table_name;
	}

	/**
	 * @return list<string>
	 */
	public function selected_columns(): array {
		return $this->selected_columns;
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

	public function row_normalizer(): string {
		return $this->row_normalizer;
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
			'action'                => 'offline_registered_device_lookup_query_planned',
			'is_valid'              => $this->is_valid,
			'token_fingerprint'     => $this->token_fingerprint,
			'table_name'            => $this->table_name,
			'selected_column_count' => count( $this->selected_columns ),
			'prepare_arg_count'     => count( $this->prepare_args ),
			'row_normalizer'        => $this->row_normalizer,
			'errors'                => $this->errors,
		);
	}
}
