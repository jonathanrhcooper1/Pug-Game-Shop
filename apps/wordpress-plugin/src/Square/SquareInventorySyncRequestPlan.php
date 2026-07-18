<?php
/**
 * Planned Square API request envelope for sandbox inventory sync.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Square;

final class SquareInventorySyncRequestPlan {
	public const READY    = 'ready';
	public const REJECTED = 'rejected';
	public const SKIPPED  = 'skipped';

	/**
	 * @param array<string, mixed> $request_plan Planned Square request envelope.
	 * @param list<string>         $errors Validation errors.
	 */
	private function __construct(
		private string $status,
		private string $code,
		private SquareInventoryProjectionPlan $projection_plan,
		private string $environment,
		private array $request_plan,
		private array $errors
	) {
	}

	/**
	 * @param array<string, mixed> $request_plan Planned Square request envelope.
	 */
	public static function ready(
		SquareInventoryProjectionPlan $projection_plan,
		string $environment,
		array $request_plan
	): self {
		return new self(
			self::READY,
			'square_inventory_sync_request_ready',
			$projection_plan,
			$environment,
			$request_plan,
			array()
		);
	}

	/**
	 * @param array<string, mixed> $request_plan Planned Square request envelope.
	 */
	public static function skipped(
		SquareInventoryProjectionPlan $projection_plan,
		string $environment,
		array $request_plan
	): self {
		return new self(
			self::SKIPPED,
			'square_inventory_projection_skipped',
			$projection_plan,
			$environment,
			$request_plan,
			array()
		);
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	public static function rejected(
		SquareInventoryProjectionPlan $projection_plan,
		string $environment,
		array $errors
	): self {
		return new self(
			self::REJECTED,
			'square_inventory_sync_request_rejected',
			$projection_plan,
			$environment,
			array(),
			array_values( array_unique( $errors ) )
		);
	}

	public function status(): string {
		return $this->status;
	}

	public function code(): string {
		return $this->code;
	}

	public function environment(): string {
		return $this->environment;
	}

	public function is_ready(): bool {
		return self::READY === $this->status;
	}

	public function is_rejected(): bool {
		return self::REJECTED === $this->status;
	}

	public function is_skipped(): bool {
		return self::SKIPPED === $this->status;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function request_plan(): array {
		return $this->request_plan;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	/**
	 * @return list<string>
	 */
	public function idempotency_keys(): array {
		$keys = array();

		foreach ( $this->request_plan as $request ) {
			if ( ! is_array( $request ) ) {
				continue;
			}

			$key = $this->string_value( $request['idempotency_key'] ?? '' );

			if ( '' !== $key ) {
				$keys[] = $key;
			}
		}

		if ( array() === $keys && '' !== $this->projection_plan->idempotency_key() ) {
			$keys[] = $this->projection_plan->idempotency_key();
		}

		return array_values( array_unique( $keys ) );
	}

	/**
	 * @return array{catalog_object_ids:list<string>,skus:list<string>}
	 */
	public function external_ids(): array {
		$catalog_object_ids = array();
		$skus               = array();

		foreach ( $this->projection_plan->catalog_objects() as $catalog_object ) {
			$this->collect_id( $catalog_object_ids, $catalog_object['id'] ?? '' );

			$variations = is_array( $catalog_object['item_data']['variations'] ?? null )
				? $catalog_object['item_data']['variations']
				: array();

			foreach ( $variations as $variation ) {
				if ( ! is_array( $variation ) ) {
					continue;
				}

				$this->collect_id( $catalog_object_ids, $variation['id'] ?? '' );
				$this->collect_id( $skus, $variation['item_variation_data']['sku'] ?? '' );
			}
		}

		foreach ( $this->projection_plan->inventory_changes() as $inventory_change ) {
			if ( ! is_array( $inventory_change['physical_count'] ?? null ) ) {
				continue;
			}

			$this->collect_id( $catalog_object_ids, $inventory_change['physical_count']['catalog_object_id'] ?? '' );
		}

		return array(
			'catalog_object_ids' => array_values( array_unique( $catalog_object_ids ) ),
			'skus'               => array_values( array_unique( $skus ) ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array_merge(
			array(
				'action'                              => 'square_inventory_sync_request_plan',
				'status'                              => $this->status,
				'code'                                => $this->code,
				'environment'                         => $this->environment,
				'projection_status'                   => $this->projection_plan->status(),
				'projection_code'                     => $this->projection_plan->code(),
				'idempotency_keys'                    => $this->idempotency_keys(),
				'external_ids'                        => $this->external_ids(),
				'request_plan'                        => $this->request_plan,
				'network_request_deferred'            => true,
				'provider_inventory_write_deferred'   => true,
				'production_network_request_deferred' => true,
				'source_of_truth'                     => 'tcg_store_platform',
				'errors'                              => $this->errors,
			),
			SquarePaymentDelegationPolicy::audit_payload()
		);
	}

	/**
	 * @param list<string> $target Target list.
	 */
	private function collect_id( array &$target, mixed $value ): void {
		$id = $this->string_value( $value );

		if ( '' !== $id ) {
			$target[] = $id;
		}
	}

	private function string_value( mixed $value ): string {
		return substr( trim( (string) ( is_array( $value ) || is_object( $value ) ? '' : $value ) ), 0, 191 );
	}
}
