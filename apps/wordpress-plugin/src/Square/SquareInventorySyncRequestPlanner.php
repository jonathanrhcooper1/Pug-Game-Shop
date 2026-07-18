<?php
/**
 * Sandbox-only Square inventory sync request planner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Square;

final class SquareInventorySyncRequestPlanner {
	private const CATALOG_BATCH_UPSERT_PATH   = '/v2/catalog/batch-upsert';
	private const INVENTORY_BATCH_CHANGE_PATH = '/v2/inventory/changes/batch-create';
	private const SANDBOX_ENVIRONMENTS        = array( 'sandbox', 'test', 'local', 'staging' );

	/**
	 * @param array<string, mixed> $context Request planning context.
	 */
	public function plan( SquareInventoryProjectionPlan $projection_plan, array $context = array() ): SquareInventorySyncRequestPlan {
		$environment = $this->environment( $context['environment'] ?? 'sandbox' );
		$errors      = $this->validation_errors( $projection_plan, $environment, $context );

		if ( array() !== $errors ) {
			return SquareInventorySyncRequestPlan::rejected( $projection_plan, $environment, $errors );
		}

		if ( SquareInventoryProjectionPlan::SKIPPED === $projection_plan->status() ) {
			return SquareInventorySyncRequestPlan::skipped(
				$projection_plan,
				$environment,
				$this->empty_request_plan()
			);
		}

		return SquareInventorySyncRequestPlan::ready(
			$projection_plan,
			$environment,
			$this->request_plan( $projection_plan )
		);
	}

	/**
	 * @param array<string, mixed> $context Request planning context.
	 * @return list<string>
	 */
	private function validation_errors(
		SquareInventoryProjectionPlan $projection_plan,
		string $environment,
		array $context
	): array {
		$errors = array();

		if ( ! in_array( $environment, self::SANDBOX_ENVIRONMENTS, true ) ) {
			$errors[] = 'square_inventory_sync_sandbox_environment_required';
		}

		if ( $this->looks_like_production_credential( $context['access_token'] ?? $context['api_key'] ?? '', $context ) ) {
			$errors[] = 'square_inventory_sync_production_credentials_rejected';
		}

		if ( SquareInventoryProjectionPlan::FAILED === $projection_plan->status() ) {
			$errors[] = 'square_projection_failed';
		}

		if ( '' === trim( $projection_plan->idempotency_key() ) ) {
			$errors[] = 'square_projection_idempotency_key_required';
		}

		if (
			SquareInventoryProjectionPlan::READY === $projection_plan->status()
			&& 0 === $projection_plan->operation_count()
		) {
			$errors[] = 'square_projection_operations_required';
		}

		return array_values( array_unique( $errors ) );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function request_plan( SquareInventoryProjectionPlan $projection_plan ): array {
		$request_plan = array(
			'catalog_batch_upsert'   => null,
			'inventory_batch_change' => null,
		);

		if ( array() !== $projection_plan->catalog_objects() ) {
			$request_plan['catalog_batch_upsert'] = array(
				'method'          => 'POST',
				'path'            => self::CATALOG_BATCH_UPSERT_PATH,
				'idempotency_key' => $projection_plan->idempotency_key(),
				'body'            => array(
					'idempotency_key' => $projection_plan->idempotency_key(),
					'batches'         => array(
						array(
							'objects' => $projection_plan->catalog_objects(),
						),
					),
				),
			);
		}

		if ( array() !== $projection_plan->inventory_changes() ) {
			$idempotency_key                        = $projection_plan->idempotency_key() . ':inventory';
			$request_plan['inventory_batch_change'] = array(
				'method'          => 'POST',
				'path'            => self::INVENTORY_BATCH_CHANGE_PATH,
				'idempotency_key' => $idempotency_key,
				'body'            => array(
					'idempotency_key' => $idempotency_key,
					'changes'         => $projection_plan->inventory_changes(),
				),
			);
		}

		return $request_plan;
	}

	/**
	 * @return array{catalog_batch_upsert:null,inventory_batch_change:null}
	 */
	private function empty_request_plan(): array {
		return array(
			'catalog_batch_upsert'   => null,
			'inventory_batch_change' => null,
		);
	}

	private function environment( mixed $value ): string {
		return strtolower( trim( (string) $value ) );
	}

	/**
	 * @param array<string, mixed> $context Request planning context.
	 */
	private function looks_like_production_credential( mixed $value, array $context ): bool {
		$credential_environment = $this->environment( $context['credential_environment'] ?? $context['token_environment'] ?? '' );
		$credential             = strtolower( trim( (string) $value ) );

		if (
			'production' === $credential_environment
			|| 'prod' === $credential_environment
			|| 'live' === $credential_environment
		) {
			return true;
		}

		return str_contains( $credential, 'production' )
			|| str_contains( $credential, 'prod' )
			|| str_contains( $credential, 'live' );
	}
}
