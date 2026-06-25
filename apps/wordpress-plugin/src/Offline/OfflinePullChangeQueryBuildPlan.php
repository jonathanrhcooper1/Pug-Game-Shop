<?php
/**
 * Prepared SQL template plan for offline pull change queries.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePullChangeQueryBuildPlan {
	/**
	 * @param array<string, array<string, mixed>> $domain_queries Prepared domain SQL query plans.
	 * @param list<string>                       $errors Query planning errors.
	 */
	private function __construct(
		private bool $is_valid,
		private string $device_id,
		private int $offline_device_id,
		private array $domain_queries,
		private array $errors
	) {
	}

	/**
	 * @param array<string, array<string, mixed>> $domain_queries Prepared domain SQL query plans.
	 */
	public static function accepted(
		string $device_id,
		int $offline_device_id,
		array $domain_queries
	): self {
		return new self(
			true,
			trim( $device_id ),
			$offline_device_id,
			$domain_queries,
			array()
		);
	}

	/**
	 * @param list<string> $errors Query planning errors.
	 */
	public static function rejected( string $device_id, int $offline_device_id, array $errors ): self {
		return new self(
			false,
			trim( $device_id ),
			$offline_device_id,
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
		$prepare_arg_count = 0;

		foreach ( $this->domain_queries as $domain_query ) {
			$prepare_args       = is_array( $domain_query['prepare_args'] ?? null ) ? $domain_query['prepare_args'] : array();
			$prepare_arg_count += count( $prepare_args );
		}

		return array(
			'action'                      => 'offline_pull_change_query_sql_planned',
			'is_valid'                    => $this->is_valid,
			'device_id'                   => $this->device_id,
			'offline_device_id'           => $this->offline_device_id,
			'domain_count'                => count( $this->domain_queries ),
			'domains'                     => array_values( array_keys( $this->domain_queries ) ),
			'prepare_arg_count'           => $prepare_arg_count,
			'sql_query_ready'             => $this->is_valid,
			'execution_deferred'          => true,
			'cursor_filter_deferred'      => true,
			'cursor_advance_deferred'     => true,
			'tombstone_read_deferred'     => true,
			'change_set_provider_pending' => true,
			'errors'                      => $this->errors,
		);
	}
}
