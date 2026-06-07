<?php
/**
 * Planned offline pull change-query contracts.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePullChangeQueryPlan {
	/**
	 * @param array<string, array<string, mixed>> $domain_queries Planned domain read contracts.
	 * @param list<string>                       $errors Planning errors.
	 */
	private function __construct(
		private bool $is_valid,
		private string $device_id,
		private int $offline_device_id,
		private string $table_prefix,
		private array $domain_queries,
		private array $errors
	) {
	}

	/**
	 * @param array<string, array<string, mixed>> $domain_queries Planned domain read contracts.
	 */
	public static function accepted(
		string $device_id,
		int $offline_device_id,
		string $table_prefix,
		array $domain_queries
	): self {
		return new self(
			true,
			trim( $device_id ),
			$offline_device_id,
			trim( $table_prefix ),
			$domain_queries,
			array()
		);
	}

	/**
	 * @param list<string> $errors Planning errors.
	 */
	public static function rejected( string $device_id, int $offline_device_id, array $errors ): self {
		return new self(
			false,
			trim( $device_id ),
			$offline_device_id,
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

	public function table_prefix(): string {
		return $this->table_prefix;
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	public function domain_queries(): array {
		return $this->domain_queries;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function domain_query( string $domain ): ?array {
		$domain = strtolower( trim( $domain ) );

		return $this->domain_queries[ $domain ] ?? null;
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
			'action'             => 'offline_pull_change_query_planned',
			'is_valid'           => $this->is_valid,
			'device_id'          => $this->device_id,
			'offline_device_id'  => $this->offline_device_id,
			'domain_count'       => count( $this->domain_queries ),
			'domains'            => array_values( array_keys( $this->domain_queries ) ),
			'query_ready'        => $this->is_valid,
			'execution_deferred' => true,
			'cursor_deferred'    => true,
			'errors'             => $this->errors,
		);
	}
}
