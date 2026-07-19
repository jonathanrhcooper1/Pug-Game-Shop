<?php
/**
 * Planned offline pull trusted-device context.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePullDeviceContextPlan {
	/**
	 * @param array<string, mixed> $session_context Authenticated session context.
	 * @param list<string>         $errors Planning errors.
	 */
	private function __construct(
		private bool $is_valid,
		private string $device_id,
		private int $offline_device_id,
		private string $table_prefix,
		private array $session_context,
		private array $errors
	) {
	}

	/**
	 * @param array<string, mixed> $session_context Authenticated session context.
	 */
	public static function accepted(
		string $device_id,
		int $offline_device_id,
		string $table_prefix,
		array $session_context
	): self {
		return new self(
			true,
			trim( $device_id ),
			$offline_device_id,
			trim( $table_prefix ),
			$session_context,
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

	public function table_prefix(): string {
		return $this->table_prefix;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function session_context(): array {
		return $this->session_context;
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
			'action'                    => 'offline_pull_device_context_planned',
			'is_valid'                  => $this->is_valid,
			'device_id'                 => $this->device_id,
			'offline_device_id'         => $this->offline_device_id,
			'required_scope'            => strtolower( trim( (string) ( $this->session_context['required_scope'] ?? '' ) ) ),
			'has_session_context'       => array() !== $this->session_context,
			'table_prefix_ready'        => '' !== $this->table_prefix,
			'provider_context_ready'    => $this->is_valid,
			'route_connection_deferred' => true,
			'cursor_advance_deferred'   => true,
			'tombstone_read_deferred'   => true,
			'errors'                    => $this->errors,
		);
	}
}
