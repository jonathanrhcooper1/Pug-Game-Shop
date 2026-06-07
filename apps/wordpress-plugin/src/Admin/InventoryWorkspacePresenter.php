<?php
/**
 * Inventory admin workspace presentation.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Admin;

final class InventoryWorkspacePresenter {
	/**
	 * @param array<string, mixed> $bootstrap_payload Inventory route bootstrap payload.
	 * @param array<string, mixed> $dependency_payload Inventory route dependency payload.
	 * @return list<array{label:string,value:string,status:string,notes:string}>
	 */
	public function readiness_rows( array $bootstrap_payload, array $dependency_payload ): array {
		return array(
			$this->row(
				'Feature flag',
				true === ( $bootstrap_payload['feature_enabled'] ?? false ) ? 'Enabled' : 'Disabled',
				true === ( $bootstrap_payload['feature_enabled'] ?? false ) ? 'ready' : 'blocked',
				'inventory_pricing'
			),
			$this->row(
				'Live routes',
				sprintf(
					'%d / %d registerable',
					(int) ( $bootstrap_payload['registerable_route_count'] ?? 0 ),
					(int) ( $bootstrap_payload['planned_route_count'] ?? 0 )
				),
				(string) ( $bootstrap_payload['status'] ?? 'blocked' ),
				$this->notes_from_list( $bootstrap_payload['bootstrap_block_reasons'] ?? array(), 'ready' )
			),
			$this->row(
				'Search',
				true === ( $dependency_payload['inventory_search_route_handler_factory_ready'] ?? false )
					? 'Factory ready'
					: 'Factory blocked',
				true === ( $dependency_payload['inventory_search_route_handler_ready'] ?? false ) ? 'ready' : 'deferred',
				true === ( $dependency_payload['inventory_search_route_reads_deferred'] ?? true )
					? 'route-connected reads deferred'
					: 'route-connected reads ready'
			),
			$this->row(
				'Create',
				true === ( $dependency_payload['inventory_intake_route_handler_factory_ready'] ?? false )
					? 'Factory ready'
					: 'Factory blocked',
				true === ( $dependency_payload['inventory_intake_route_handler_ready'] ?? false ) ? 'ready' : 'deferred',
				true === ( $dependency_payload['inventory_intake_route_writes_deferred'] ?? true )
					? 'route-connected writes deferred'
					: 'route-connected writes ready'
			),
			$this->row(
				'Public reads',
				true === ( $dependency_payload['public_read_routes_enabled'] ?? false ) ? 'Enabled' : 'Disabled',
				true === ( $dependency_payload['public_read_permission_callbacks_configured'] ?? false ) ? 'ready' : 'blocked',
				sprintf(
					'%d public route contracts',
					(int) ( $dependency_payload['public_read_route_count'] ?? 0 )
				)
			),
			$this->row(
				'Staff permissions',
				sprintf(
					'%d / %d capability callbacks',
					(int) ( $dependency_payload['permission_callback_count'] ?? 0 ),
					(int) ( $dependency_payload['capability_permission_route_count'] ?? 0 )
				),
				true === ( $dependency_payload['capability_permission_callbacks_configured'] ?? false )
					? 'ready'
					: 'blocked',
				$this->notes_from_list( $dependency_payload['configuration_issues'] ?? array(), 'ready' )
			),
			$this->row(
				'WooCommerce projection',
				true === ( $dependency_payload['woocommerce_projection_deferred'] ?? true ) ? 'Deferred' : 'Ready',
				true === ( $dependency_payload['woocommerce_projection_deferred'] ?? true ) ? 'deferred' : 'ready',
				'serialized inventory hooks stay guarded'
			),
			$this->row(
				'Square projection',
				true === ( $dependency_payload['square_inventory_projection_deferred'] ?? true ) ? 'Deferred' : 'Ready',
				true === ( $dependency_payload['square_inventory_projection_deferred'] ?? true ) ? 'deferred' : 'ready',
				'inventory projection only; Square payments handled by WooCommerce Square'
			),
			$this->row(
				'Labels',
				true === ( $dependency_payload['label_print_deferred'] ?? true ) ? 'Deferred' : 'Ready',
				true === ( $dependency_payload['label_print_deferred'] ?? true ) ? 'deferred' : 'ready',
				'barcode and shelf label actions remain gated'
			),
		);
	}

	/**
	 * @param array<string, mixed> $bootstrap_payload Inventory route bootstrap payload.
	 * @return list<array{label:string,value:string,status:string,notes:string}>
	 */
	public function route_rows( array $bootstrap_payload ): array {
		$routes = $bootstrap_payload['route_registration_summary'] ?? array();

		if ( ! is_array( $routes ) ) {
			return array();
		}

		$rows = array();

		foreach ( $routes as $route_key => $route ) {
			if ( ! is_array( $route ) ) {
				continue;
			}

			$rows[] = $this->row(
				(string) $route_key,
				sprintf(
					'%s %s',
					(string) ( $route['methods'] ?? '' ),
					(string) ( $route['path'] ?? '' )
				),
				true === ( $route['should_register'] ?? false ) ? 'ready' : 'deferred',
				$this->route_notes( $route )
			);
		}

		return $rows;
	}

	/**
	 * @param array<string, mixed> $dependency_payload Inventory route dependency payload.
	 * @return list<array{label:string,value:string,status:string,notes:string}>
	 */
	public function checkpoint_rows( array $dependency_payload ): array {
		return array(
			$this->row(
				'Route execution',
				true === ( $dependency_payload['route_registration_deferred'] ?? true ) ? 'Deferred' : 'Ready',
				true === ( $dependency_payload['route_registration_deferred'] ?? true ) ? 'pending' : 'ready',
				'activate after staging route and permission verification'
			),
			$this->row(
				'Repository writes',
				true === ( $dependency_payload['route_connected_writes_ready'] ?? false ) ? 'Ready' : 'Pending',
				true === ( $dependency_payload['route_connected_writes_ready'] ?? false ) ? 'ready' : 'pending',
				'connect guarded create/update/reserve storage execution'
			),
			$this->row(
				'Square inventory sync',
				true === ( $dependency_payload['square_inventory_projection_deferred'] ?? true ) ? 'Pending' : 'Ready',
				true === ( $dependency_payload['square_inventory_projection_deferred'] ?? true ) ? 'pending' : 'ready',
				'verify sandbox projection before production POS writes'
			),
			$this->row(
				'Admin E2E coverage',
				'Pending',
				'pending',
				'cover search, intake, cart, credit, and offline conflict flows'
			),
		);
	}

	/**
	 * @param array<string, mixed> $route Route summary.
	 */
	private function route_notes( array $route ): string {
		$notes = array();

		if ( true === ( $route['route_registration_deferred'] ?? false ) ) {
			$notes[] = 'registration deferred';
		}

		if ( true === ( $route['route_connected_reads_deferred'] ?? false ) ) {
			$notes[] = 'reads deferred';
		}

		if ( true === ( $route['route_connected_writes_deferred'] ?? false ) ) {
			$notes[] = 'writes deferred';
		}

		if ( true === ( $route['woocommerce_projection_deferred'] ?? false ) ) {
			$notes[] = 'WooCommerce projection deferred';
		}

		if ( true === ( $route['square_inventory_projection_deferred'] ?? false ) ) {
			$notes[] = 'Square projection deferred';
		}

		if ( true === ( $route['label_print_deferred'] ?? false ) ) {
			$notes[] = 'label printing deferred';
		}

		$block_reasons = $this->list_values( $route['registration_block_reasons'] ?? array() );
		foreach ( $block_reasons as $reason ) {
			$notes[] = $reason;
		}

		return array() === $notes ? 'ready' : implode( '; ', array_values( array_unique( $notes ) ) );
	}

	/**
	 * @param array<string, mixed>|list<mixed>|mixed $values Values.
	 */
	private function notes_from_list( mixed $values, string $fallback ): string {
		$list = $this->list_values( $values );

		return array() === $list ? $fallback : implode( ', ', $list );
	}

	/**
	 * @return list<string>
	 */
	private function list_values( mixed $values ): array {
		if ( ! is_array( $values ) ) {
			return array();
		}

		return array_values(
			array_filter(
				array_map(
					static fn ( mixed $value ): string => ( is_array( $value ) || is_object( $value ) )
						? ''
						: trim( (string) $value ),
					$values
				),
				static fn ( string $value ): bool => '' !== $value
			)
		);
	}

	/**
	 * @return array{label:string,value:string,status:string,notes:string}
	 */
	private function row( string $label, string $value, string $status, string $notes ): array {
		return array(
			'label'  => $label,
			'value'  => $value,
			'status' => $status,
			'notes'  => $notes,
		);
	}
}
