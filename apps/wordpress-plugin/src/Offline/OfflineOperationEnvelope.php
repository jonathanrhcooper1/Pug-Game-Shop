<?php
/**
 * Parsed offline operation envelope.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineOperationEnvelope {
	/**
	 * @param array<string, mixed> $payload Operation payload.
	 * @param array<string, mixed> $authorization_context Authorization context.
	 */
	public function __construct(
		private string $client_operation_id,
		private string $device_id,
		private ?int $location_id,
		private ?int $actor_id,
		private string $operation_type,
		private string $entity_type,
		private string $entity_id,
		private ?int $base_row_version,
		private string $occurred_at_local,
		private string $queued_at_utc,
		private array $payload,
		private array $authorization_context,
		private int $schema_version
	) {
		$this->client_operation_id   = trim( $client_operation_id );
		$this->device_id             = trim( $device_id );
		$this->operation_type        = trim( $operation_type );
		$this->entity_type           = trim( $entity_type );
		$this->entity_id             = trim( $entity_id );
		$this->occurred_at_local     = trim( $occurred_at_local );
		$this->queued_at_utc         = trim( $queued_at_utc );
		$this->payload               = $payload;
		$this->authorization_context = $authorization_context;
	}

	public function client_operation_id(): string {
		return $this->client_operation_id;
	}

	public function idempotency_key(): string {
		return $this->client_operation_id;
	}

	public function device_id(): string {
		return $this->device_id;
	}

	public function location_id(): ?int {
		return $this->location_id;
	}

	public function actor_id(): ?int {
		return $this->actor_id;
	}

	public function operation_type(): string {
		return $this->operation_type;
	}

	public function entity_type(): string {
		return $this->entity_type;
	}

	public function entity_id(): string {
		return $this->entity_id;
	}

	public function base_row_version(): ?int {
		return $this->base_row_version;
	}

	public function occurred_at_local(): string {
		return $this->occurred_at_local;
	}

	public function queued_at_utc(): string {
		return $this->queued_at_utc;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function payload(): array {
		return $this->payload;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function authorization_context(): array {
		return $this->authorization_context;
	}

	public function schema_version(): int {
		return $this->schema_version;
	}
}
