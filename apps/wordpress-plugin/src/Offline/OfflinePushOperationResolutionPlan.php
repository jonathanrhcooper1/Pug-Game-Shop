<?php
/**
 * Planned offline push operation resolution output.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePushOperationResolutionPlan {
	/**
	 * @param array<string, mixed>      $details Operation resolution details.
	 * @param array<string, mixed>      $operation_result_row Future operation result row.
	 * @param array<string, mixed>      $response_payload API response payload.
	 * @param array<string, mixed>|null $conflict_row Future conflict row when manager review is required.
	 * @param array<string, mixed>      $audit_payload Audit payload without full operation payload details.
	 */
	public function __construct(
		private string $status,
		private string $code,
		private array $details,
		private array $operation_result_row,
		private array $response_payload,
		private ?array $conflict_row,
		private array $audit_payload
	) {
		$this->status = trim( $status );
		$this->code   = trim( $code );
	}

	public function status(): string {
		return $this->status;
	}

	public function code(): string {
		return $this->code;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function details(): array {
		return $this->details;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function operation_result_row(): array {
		return $this->operation_result_row;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function response_payload(): array {
		return $this->response_payload;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function conflict_row(): ?array {
		return $this->conflict_row;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return $this->audit_payload;
	}
}
