<?php
/**
 * Fail-closed inventory REST controller scaffold.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class InventoryController {
	private OfflineRestRequestAdapter $request_adapter;

	/**
	 * @var array<string, callable(OfflineRestRequestData): array<string, mixed>>
	 */
	private array $handlers;

	/**
	 * @param array<string, callable(OfflineRestRequestData): array<string, mixed>> $handlers Route handlers.
	 */
	public function __construct( ?OfflineRestRequestAdapter $request_adapter = null, array $handlers = array() ) {
		$this->request_adapter = $request_adapter ?? new OfflineRestRequestAdapter();
		$this->handlers        = $handlers;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function list_inventory( mixed $request ): array {
		return $this->dispatch( 'list_inventory', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function get_inventory_item( mixed $request ): array {
		return $this->dispatch( 'get_inventory_item', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function create_inventory_item( mixed $request ): array {
		return $this->dispatch( 'create_inventory_item', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function update_inventory_item( mixed $request ): array {
		return $this->dispatch( 'update_inventory_item', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function reserve_inventory_item( mixed $request ): array {
		return $this->dispatch( 'reserve_inventory_item', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function release_inventory_item( mixed $request ): array {
		return $this->dispatch( 'release_inventory_item', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function mark_inventory_item_sold( mixed $request ): array {
		return $this->dispatch( 'mark_inventory_item_sold', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function move_inventory_item( mixed $request ): array {
		return $this->dispatch( 'move_inventory_item', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function lock_inventory_item_price( mixed $request ): array {
		return $this->dispatch( 'lock_inventory_item_price', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function bulk_intake_inventory( mixed $request ): array {
		return $this->dispatch( 'bulk_intake_inventory', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function import_inventory( mixed $request ): array {
		return $this->dispatch( 'import_inventory', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function export_inventory( mixed $request ): array {
		return $this->dispatch( 'export_inventory', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function search_public_catalog( mixed $request ): array {
		return $this->dispatch( 'search_public_catalog', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function search_reference_cards( mixed $request ): array {
		return $this->dispatch( 'search_reference_cards', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function search_inventory_items( mixed $request ): array {
		return $this->dispatch( 'search_inventory_items', $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function search_card_versions( mixed $request ): array {
		return $this->dispatch( 'search_card_versions', $request );
	}

	public function has_handler( string $callback ): bool {
		return is_callable( $this->handlers[ $callback ] ?? null );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function dispatch( string $callback, mixed $request ): array {
		$handler = $this->handlers[ $callback ] ?? null;

		if ( is_callable( $handler ) ) {
			return $handler( $this->request_adapter->from_request( $request ) );
		}

		return $this->disabled_response( $callback, $request );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function disabled_response( string $callback, mixed $request ): array {
		unset( $request );

		return array(
			'status'                               => 'disabled',
			'status_code'                          => 501,
			'code'                                 => 'inventory_route_disabled',
			'callback'                             => $callback,
			'message'                              => 'Inventory route registration is disabled until staging verification passes.',
			'route_registration_deferred'          => true,
			'route_connected_reads_deferred'       => true,
			'route_connected_writes_deferred'      => true,
			'woocommerce_projection_deferred'      => true,
			'square_inventory_projection_deferred' => true,
			'label_print_deferred'                 => true,
		);
	}
}
