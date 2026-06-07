<?php
/**
 * Offline push canonical mutation repository execution gate result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushCanonicalMutationRepositoryExecutionResult {
	public const STATUS_BLOCKED = 'blocked';
	public const STATUS_READY   = 'ready';
	public const STATUS_REJECTED = 'rejected';

	/**
	 * @param list<string>         $block_reasons Execution gate block reasons.
	 * @param list<string>         $errors Execution gate errors.
	 * @param array<string, mixed> $repository_audit Repository staging audit.
	 */
	private function __construct(
		private string $status,
		private array $block_reasons,
		private array $errors,
		private array $repository_audit
	) {
	}

	/**
	 * @param list<string> $block_reasons Execution gate block reasons.
	 */
	public static function blocked(
		OfflinePushCanonicalMutationRepositoryResult $repository_result,
		array $block_reasons
	): self {
		return new self(
			self::STATUS_BLOCKED,
			array_values( array_unique( $block_reasons ) ),
			array(),
			$repository_result->audit_payload()
		);
	}

	public static function ready( OfflinePushCanonicalMutationRepositoryResult $repository_result ): self {
		return new self(
			self::STATUS_READY,
			array(),
			array(),
			$repository_result->audit_payload()
		);
	}

	/**
	 * @param list<string> $errors Execution gate errors.
	 */
	public static function rejected(
		OfflinePushCanonicalMutationRepositoryResult $repository_result,
		array $errors
	): self {
		return new self(
			self::STATUS_REJECTED,
			array(),
			array_values( array_unique( $errors ) ),
			$repository_result->audit_payload()
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_blocked(): bool {
		return self::STATUS_BLOCKED === $this->status;
	}

	public function is_ready(): bool {
		return self::STATUS_READY === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	/**
	 * @return list<string>
	 */
	public function block_reasons(): array {
		return $this->block_reasons;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	public function rows_affected(): int {
		return 0;
	}

	public function mutation_query_count(): int {
		return $this->non_negative_int( $this->repository_audit['mutation_query_count'] ?? 0 );
	}

	public function prepare_arg_count(): int {
		return $this->non_negative_int( $this->repository_audit['prepare_arg_count'] ?? 0 );
	}

	/**
	 * @return list<string>
	 */
	public function mutation_operation_ids(): array {
		return $this->string_list( $this->repository_audit['mutation_operation_ids'] ?? array() );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'                                  => 'offline_push_canonical_mutation_repository_execution_gate',
			'status'                                  => $this->status,
			'is_blocked'                              => $this->is_blocked(),
			'is_ready'                                => $this->is_ready(),
			'is_rejected'                             => $this->is_rejected(),
			'block_reasons'                           => $this->block_reasons,
			'mutation_query_count'                    => $this->mutation_query_count(),
			'mutation_operation_ids'                  => $this->mutation_operation_ids(),
			'prepare_arg_count'                       => $this->prepare_arg_count(),
			'rows_affected'                           => $this->rows_affected(),
			'repository'                              => $this->repository_audit,
			'explicit_execution_required'             => true,
			'canonical_mutation_repository_execution_deferred' => true,
			'canonical_mutation_repository_transaction_deferred' => ! $this->is_ready(),
			'route_connected_writes_deferred'         => true,
			'queue_replay_deferred'                   => true,
			'errors'                                  => $this->errors,
		);
	}

	private function non_negative_int( mixed $value ): int {
		if ( is_int( $value ) && 0 <= $value ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return (int) $value;
		}

		return 0;
	}

	/**
	 * @return list<string>
	 */
	private function string_list( mixed $value ): array {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$items = array();

		foreach ( $value as $item ) {
			$item = trim( (string) $item );

			if ( '' !== $item ) {
				$items[] = $item;
			}
		}

		return array_values( array_unique( $items ) );
	}
}
