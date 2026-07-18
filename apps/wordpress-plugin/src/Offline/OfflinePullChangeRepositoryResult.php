<?php
/**
 * Offline pull change repository result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePullChangeRepositoryResult {
	public const STATUS_FETCHED  = 'fetched';
	public const STATUS_REJECTED = 'rejected';

	/**
	 * @param array<string, array<string, mixed>> $change_sets   Domain change sets.
	 * @param list<string>                        $errors        Repository or row errors.
	 * @param array<string, mixed>                $query_audit   Query build audit payload.
	 * @param array<string, array<string, mixed>> $domain_audits Per-domain audit payloads.
	 */
	private function __construct(
		private string $status,
		private array $change_sets,
		private array $errors,
		private array $query_audit,
		private array $domain_audits
	) {
	}

	/**
	 * @param array<string, array<string, mixed>> $change_sets Domain change sets.
	 * @param array<string, array<string, mixed>> $domain_audits Per-domain audit payloads.
	 */
	public static function fetched(
		OfflinePullChangeQueryBuildPlan $query_plan,
		array $change_sets,
		array $domain_audits
	): self {
		return new self(
			self::STATUS_FETCHED,
			$change_sets,
			array(),
			$query_plan->audit_payload(),
			$domain_audits
		);
	}

	/**
	 * @param list<string>                        $errors        Repository or row errors.
	 * @param array<string, array<string, mixed>> $domain_audits Per-domain audit payloads.
	 */
	public static function rejected(
		OfflinePullChangeQueryBuildPlan $query_plan,
		array $errors,
		array $domain_audits = array()
	): self {
		return new self(
			self::STATUS_REJECTED,
			array(),
			array_values( array_unique( $errors ) ),
			$query_plan->audit_payload(),
			$domain_audits
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function is_fetched(): bool {
		return self::STATUS_FETCHED === $this->status;
	}

	public function is_rejected(): bool {
		return self::STATUS_REJECTED === $this->status;
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	public function change_sets(): array {
		return $this->change_sets;
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
		$row_count = 0;

		foreach ( $this->domain_audits as $domain_audit ) {
			$row_count += (int) ( $domain_audit['row_count'] ?? 0 );
		}

		return array(
			'action'                  => 'offline_pull_change_repository_fetch',
			'status'                  => $this->status,
			'fetched'                 => $this->is_fetched(),
			'is_rejected'             => $this->is_rejected(),
			'domain_count'            => count( $this->domain_audits ),
			'row_count'               => $row_count,
			'query'                   => $this->query_audit,
			'domains'                 => $this->domain_audits,
			'cursor_advance_deferred' => true,
			'tombstone_read_deferred' => true,
			'errors'                  => $this->errors,
		);
	}
}
