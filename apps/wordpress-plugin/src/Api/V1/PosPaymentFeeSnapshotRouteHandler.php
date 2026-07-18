<?php
/**
 * Explicit staged POS/payment fee snapshot read handler.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Payments\PosPaymentFeeSnapshotQueryPlanner;
use TCGStorePlatform\Payments\PosPaymentFeeSnapshotRepository;

final class PosPaymentFeeSnapshotRouteHandler {
	public function __construct(
		private PosPaymentFeeSnapshotRepository $repository,
		private ?PosPaymentFeeSnapshotQueryPlanner $query_planner = null,
		private string $table_prefix = 'wp_'
	) {
	}

	/**
	 * @return array<string, mixed>
	 */
	public function list_payment_fee_snapshots( OfflineRestRequestData $data ): array {
		$query_plan = $this->query_planner()->plan(
			$this->params( $data ),
			$this->table_prefix
		);

		if ( ! $query_plan->is_valid() ) {
			return $this->rejected(
				'pos_payment_fee_snapshot_query_invalid',
				$query_plan->errors(),
				array(
					'query' => $query_plan->audit_payload(),
				)
			);
		}

		$result = $this->repository->fetch( $query_plan );
		if ( ! $result->is_fetched() ) {
			return $this->rejected(
				'pos_payment_fee_snapshot_repository_rejected',
				$result->errors(),
				array(
					'repository' => $result->audit_payload(),
				)
			);
		}

		$filters = $query_plan->filters();

		return array(
			'status'      => 'ready',
			'status_code' => 200,
			'code'        => 'pos_payment_fee_snapshot_read_ready',
			'callback'    => 'list_payment_fee_snapshots',
			'data'        => array(
				'provider'      => $filters['provider'],
				'channel'       => $filters['channel'],
				'currency'      => $filters['currency'],
				'effective_on'  => $filters['effective_on'],
				'page_size'     => $query_plan->limit(),
				'fee_snapshots' => $result->fee_snapshots(),
			),
			'meta'        => array_merge(
				$this->ready_meta(),
				array(
					'repository' => $result->audit_payload(),
				)
			),
		);
	}

	private function query_planner(): PosPaymentFeeSnapshotQueryPlanner {
		return $this->query_planner ?? new PosPaymentFeeSnapshotQueryPlanner();
	}

	/**
	 * @return array<string, mixed>
	 */
	private function params( OfflineRestRequestData $data ): array {
		return array_merge( $data->query_params(), $data->body_params() );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function ready_meta(): array {
		return array(
			'route_connected_reads_enabled'        => true,
			'route_connected_reads_deferred'       => false,
			'fee_snapshot_repository_deferred'     => false,
			'route_connected_writes_deferred'      => true,
			'provider_capture_deferred'            => true,
			'provider_inventory_write_deferred'    => true,
			'woocommerce_gateway_capture_deferred' => true,
			'default_route_registration_deferred'  => true,
			'route_still_gated'                    => true,
		);
	}

	/**
	 * @param list<string>         $errors Validation or repository errors.
	 * @param array<string, mixed> $extra_meta Extra diagnostic metadata.
	 * @return array<string, mixed>
	 */
	private function rejected( string $code, array $errors, array $extra_meta = array() ): array {
		return array(
			'status'      => 'invalid',
			'status_code' => 400,
			'code'        => $code,
			'callback'    => 'list_payment_fee_snapshots',
			'errors'      => array_values( array_unique( $errors ) ),
			'meta'        => array_merge(
				array(
					'route_connected_reads_enabled'        => true,
					'route_connected_reads_deferred'       => true,
					'fee_snapshot_repository_deferred'     => true,
					'route_connected_writes_deferred'      => true,
					'provider_capture_deferred'            => true,
					'provider_inventory_write_deferred'    => true,
					'woocommerce_gateway_capture_deferred' => true,
					'default_route_registration_deferred'  => true,
					'route_still_gated'                    => true,
				),
				$extra_meta
			),
		);
	}
}
