<?php
/**
 * Explicit staged inventory search read handler.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Inventory\InventorySearchQueryPlanner;
use TCGStorePlatform\Inventory\InventorySearchRepository;
use TCGStorePlatform\Inventory\InventorySearchRequestParser;
use TCGStorePlatform\Inventory\InventorySearchResponsePresenter;

final class InventorySearchRouteHandler {
	public function __construct(
		private InventorySearchRepository $repository,
		private ?InventorySearchRequestParser $request_parser = null,
		private ?InventorySearchQueryPlanner $query_planner = null,
		private string $table_prefix = 'wp_'
	) {
	}

	/**
	 * @return array<string, mixed>
	 */
	public function search_inventory_items( OfflineRestRequestData $data ): array {
		$validation = $this->request_parser()->parse( $this->params( $data ) );

		if ( ! $validation->is_valid() || null === $validation->request() ) {
			return $this->rejected(
				'inventory_search_request_invalid',
				$validation->errors()
			);
		}

		$request    = $validation->request();
		$query_plan = $this->query_planner()->plan( $request, $this->table_prefix );

		if ( ! $query_plan->is_valid() ) {
			return $this->rejected(
				'inventory_search_query_invalid',
				$query_plan->errors(),
				array(
					'query' => $query_plan->audit_payload(),
				)
			);
		}

		$result = $this->repository->fetch( $query_plan );

		if ( ! $result->is_fetched() ) {
			return $this->rejected(
				'inventory_search_repository_rejected',
				$result->errors(),
				array(
					'repository' => $result->audit_payload(),
				)
			);
		}

		return array(
			'status'      => 'ready',
			'status_code' => 200,
			'code'        => 'inventory_search_read_ready',
			'callback'    => 'search_inventory_items',
			'data'        => InventorySearchResponsePresenter::present(
				$request,
				$result->rows(),
				$result->total()
			),
			'meta'        => array_merge(
				$this->ready_meta(),
				array(
					'query'      => $query_plan->audit_payload(),
					'repository' => $result->audit_payload(),
				)
			),
		);
	}

	private function request_parser(): InventorySearchRequestParser {
		return $this->request_parser ?? new InventorySearchRequestParser();
	}

	private function query_planner(): InventorySearchQueryPlanner {
		return $this->query_planner ?? new InventorySearchQueryPlanner();
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
			'inventory_repository_deferred'        => false,
			'route_connected_writes_deferred'      => true,
			'woocommerce_projection_deferred'      => true,
			'square_inventory_projection_deferred' => true,
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
			'callback'    => 'search_inventory_items',
			'errors'      => array_values( array_unique( $errors ) ),
			'meta'        => array_merge(
				array(
					'route_connected_reads_enabled'        => true,
					'route_connected_reads_deferred'       => true,
					'inventory_repository_deferred'        => true,
					'route_connected_writes_deferred'      => true,
					'woocommerce_projection_deferred'      => true,
					'square_inventory_projection_deferred' => true,
					'default_route_registration_deferred'  => true,
					'route_still_gated'                    => true,
				),
				$extra_meta
			),
		);
	}
}
