<?php
/**
 * Inventory admin workspace presentation.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Admin;

use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\Square\SquarePaymentDelegationPolicy;

final class InventoryWorkspacePresenter {
	private const SEARCH_ROUTE_KEY = 'GET /inventory/search';
	private const CREATE_ROUTE_KEY = 'POST /inventory';

	/**
	 * @param array<string, mixed> $bootstrap_payload Inventory route bootstrap payload.
	 * @param array<string, mixed> $dependency_payload Inventory route dependency payload.
	 * @return list<array{label:string,value:string,status:string,notes:string}>
	 */
	public function readiness_rows( array $bootstrap_payload, array $dependency_payload ): array {
		$projection_planning_row = $this->projection_planning_row( $dependency_payload );

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
			$projection_planning_row,
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
				'Square payments',
				SquarePaymentDelegationPolicy::status_label(),
				'ready',
				SquarePaymentDelegationPolicy::admin_note()
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
	 * @param array<string, mixed> $dependency_payload Inventory route dependency payload.
	 * @param array<string, mixed> $query Submitted admin query values.
	 * @return array<string, mixed>
	 */
	public function search_panel( array $bootstrap_payload, array $dependency_payload, array $query = array() ): array {
		$routes       = is_array( $bootstrap_payload['route_registration_summary'] ?? null )
			? $bootstrap_payload['route_registration_summary']
			: array();
		$search_route = is_array( $routes[ self::SEARCH_ROUTE_KEY ] ?? null )
			? $routes[ self::SEARCH_ROUTE_KEY ]
			: array();
		$ready        = true === ( $bootstrap_payload['feature_enabled'] ?? false )
			&& true === ( $search_route['should_register'] ?? false )
			&& false === ( $search_route['route_connected_reads_deferred'] ?? true )
			&& true === ( $dependency_payload['inventory_search_route_handler_ready'] ?? false )
			&& false === ( $dependency_payload['inventory_search_route_reads_deferred'] ?? true );

		return array(
			'ready'          => $ready,
			'status'         => $ready ? 'ready' : 'locked',
			'status_label'   => $ready
				? 'Ready for staff inventory search'
				: 'Locked until staging inventory search gates are enabled',
			'endpoint_path'  => '/tcg-store/v1/inventory/search',
			'method'         => 'GET',
			'query'          => $this->search_query( $query ),
			'notes'          => $ready
				? 'Staff search reads are enabled; writes and projections remain deferred.'
				: $this->search_lock_notes( $bootstrap_payload, $dependency_payload, $search_route ),
			'status_options' => array_merge( array( '' ), InventoryStatus::all() ),
			'sort_options'   => array( 'relevance', 'updated_desc', 'price_asc', 'price_desc', 'name_asc' ),
			'page_sizes'     => array( 10, 25, 50, 100 ),
		);
	}

	/**
	 * @param array<string, mixed> $bootstrap_payload Inventory route bootstrap payload.
	 * @param array<string, mixed> $dependency_payload Inventory route dependency payload.
	 * @param array<string, mixed> $form Submitted intake form values.
	 * @return array<string, mixed>
	 */
	public function intake_panel( array $bootstrap_payload, array $dependency_payload, array $form = array() ): array {
		$routes       = is_array( $bootstrap_payload['route_registration_summary'] ?? null )
			? $bootstrap_payload['route_registration_summary']
			: array();
		$create_route = is_array( $routes[ self::CREATE_ROUTE_KEY ] ?? null )
			? $routes[ self::CREATE_ROUTE_KEY ]
			: array();
		$ready        = true === ( $bootstrap_payload['feature_enabled'] ?? false )
			&& true === ( $create_route['should_register'] ?? false )
			&& false === ( $create_route['route_connected_writes_deferred'] ?? true )
			&& true === ( $dependency_payload['inventory_intake_route_handler_ready'] ?? false )
			&& false === ( $dependency_payload['inventory_intake_route_writes_deferred'] ?? true );

		return array(
			'ready'                 => $ready,
			'status'                => $ready ? 'ready' : 'locked',
			'status_label'          => $ready
				? 'Ready for staff inventory intake'
				: 'Locked until staging inventory create gates are enabled',
			'endpoint_path'         => '/tcg-store/v1/inventory',
			'method'                => 'POST',
			'form'                  => $this->intake_form( $form ),
			'notes'                 => $ready
				? 'Staff intake writes are enabled; WooCommerce, Square, POS, and labels remain deferred.'
				: $this->intake_lock_notes( $bootstrap_payload, $dependency_payload, $create_route ),
			'status_options'        => InventoryStatus::all(),
			'condition_options'     => array( 'NM', 'LP', 'MP', 'HP', 'DMG' ),
			'raw_or_graded_options' => array( 'raw', 'graded' ),
			'visibility_options'    => array( 'hidden', 'visible', 'staff_only' ),
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
				'Projection contracts',
				true === ( $dependency_payload['external_projection_planning_deferred'] ?? true ) ? 'Pending' : 'Ready',
				true === ( $dependency_payload['external_projection_planning_deferred'] ?? true ) ? 'pending' : 'ready',
				'plan WooCommerce/Square contracts before enabling external writes'
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
	 * @param array<string, mixed> $dependency_payload Inventory route dependency payload.
	 * @return array{label:string,value:string,status:string,notes:string}
	 */
	private function projection_planning_row( array $dependency_payload ): array {
		$woocommerce_ready = true === ( $dependency_payload['woocommerce_projection_planner_ready'] ?? false );
		$square_ready      = true === ( $dependency_payload['square_inventory_projection_planner_ready'] ?? false );
		$planning_deferred = true === ( $dependency_payload['external_projection_planning_deferred'] ?? true );

		if ( $planning_deferred ) {
			return $this->row(
				'Projection planning',
				'Deferred',
				'deferred',
				$this->projection_planning_notes(
					$planning_deferred,
					$woocommerce_ready,
					$square_ready
				)
			);
		}

		if ( $woocommerce_ready && $square_ready ) {
			return $this->row(
				'Projection planning',
				'Ready',
				'ready',
				'WooCommerce and Square contracts planned; external writes stay deferred'
			);
		}

		return $this->row(
			'Projection planning',
			sprintf( '%d / 2 planners ready', (int) $woocommerce_ready + (int) $square_ready ),
			'blocked',
			$this->projection_planning_notes(
				$planning_deferred,
				$woocommerce_ready,
				$square_ready
			)
		);
	}

	private function projection_planning_notes( bool $planning_deferred, bool $woocommerce_ready, bool $square_ready ): string {
		$notes = array();

		if ( $planning_deferred ) {
			$notes[] = 'waiting for staged inventory create handler';
		}

		if ( ! $woocommerce_ready ) {
			$notes[] = 'WooCommerce planner missing';
		}

		if ( ! $square_ready ) {
			$notes[] = 'Square planner missing';
		}

		return array() === $notes
			? 'WooCommerce and Square contracts planned; external writes stay deferred'
			: implode( '; ', $notes );
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
	 * @param array<string, mixed> $query Submitted admin query values.
	 * @return array{q:string,game:string,status:string,sort:string,page_size:int,visibility:string}
	 */
	private function search_query( array $query ): array {
		$q         = substr( trim( (string) ( $query['q'] ?? '' ) ), 0, 120 );
		$game      = strtolower( trim( (string) ( $query['game'] ?? '' ) ) );
		$status    = strtolower( trim( (string) ( $query['status'] ?? '' ) ) );
		$sort      = strtolower( trim( (string) ( $query['sort'] ?? 'relevance' ) ) );
		$page_size = (int) ( $query['page_size'] ?? 25 );

		if ( '' !== $game && 1 !== preg_match( '/^[a-z0-9_-]{2,64}$/', $game ) ) {
			$game = '';
		}

		if ( '' !== $status && ! InventoryStatus::is_valid( $status ) ) {
			$status = '';
		}

		if ( ! in_array( $sort, array( 'relevance', 'updated_desc', 'price_asc', 'price_desc', 'name_asc' ), true ) ) {
			$sort = 'relevance';
		}

		if ( ! in_array( $page_size, array( 10, 25, 50, 100 ), true ) ) {
			$page_size = 25;
		}

		return array(
			'q'          => $q,
			'game'       => $game,
			'status'     => $status,
			'sort'       => $sort,
			'page_size'  => $page_size,
			'visibility' => 'staff',
		);
	}

	/**
	 * @param array<string, mixed> $form Submitted intake form values.
	 * @return array<string, mixed>
	 */
	private function intake_form( array $form ): array {
		$status        = strtolower( trim( (string) ( $form['status'] ?? InventoryStatus::AVAILABLE ) ) );
		$raw_or_graded = strtolower( trim( (string) ( $form['raw_or_graded'] ?? 'raw' ) ) );

		if ( ! InventoryStatus::is_valid( $status ) ) {
			$status = InventoryStatus::AVAILABLE;
		}

		if ( ! in_array( $raw_or_graded, array( 'raw', 'graded' ), true ) ) {
			$raw_or_graded = 'raw';
		}

		return array(
			'source'                         => 'staff',
			'game'                           => $this->slug_value( $form['game'] ?? 'pokemon', 'pokemon' ),
			'card_name'                      => $this->text_value( $form['card_name'] ?? '', 120 ),
			'set_name'                       => $this->text_value( $form['set_name'] ?? '', 120 ),
			'set_code'                       => strtoupper( $this->slug_value( $form['set_code'] ?? '', '' ) ),
			'card_number'                    => $this->text_value( $form['card_number'] ?? '', 40 ),
			'printed_number'                 => $this->text_value( $form['printed_number'] ?? '', 40 ),
			'variant'                        => $this->text_value( $form['variant'] ?? '', 80 ),
			'finish'                         => $this->text_value( $form['finish'] ?? '', 80 ),
			'language'                       => strtoupper( $this->slug_value( $form['language'] ?? 'EN', 'EN' ) ),
			'status'                         => $status,
			'raw_or_graded'                  => $raw_or_graded,
			'condition_code'                 => $this->condition_code( $form['condition_code'] ?? 'NM' ),
			'barcode'                        => strtoupper( $this->text_value( $form['barcode'] ?? '', 80 ) ),
			'sku'                            => strtoupper( $this->text_value( $form['sku'] ?? '', 80 ) ),
			'location_id'                    => $this->positive_int_string( $form['location_id'] ?? '' ),
			'sale_currency'                  => $this->currency_code( $form['sale_currency'] ?? 'USD' ),
			'minimum_sale_price_minor_units' => $this->non_negative_int( $form['minimum_sale_price_minor_units'] ?? 100 ),
			'sale_price_minor_units'         => $this->non_negative_int( $form['sale_price_minor_units'] ?? 100 ),
			'online_visibility'              => $this->visibility_value( $form['online_visibility'] ?? 'visible' ),
			'kiosk_visibility'               => $this->visibility_value( $form['kiosk_visibility'] ?? 'visible' ),
			'pos_visibility'                 => $this->visibility_value( $form['pos_visibility'] ?? 'visible' ),
		);
	}

	/**
	 * @param array<string, mixed> $bootstrap_payload Inventory route bootstrap payload.
	 * @param array<string, mixed> $dependency_payload Inventory route dependency payload.
	 * @param array<string, mixed> $search_route Search route summary.
	 */
	private function search_lock_notes( array $bootstrap_payload, array $dependency_payload, array $search_route ): string {
		$notes = array();

		if ( true !== ( $bootstrap_payload['feature_enabled'] ?? false ) ) {
			$notes[] = 'inventory_pricing feature flag disabled';
		}

		$notes = array_merge(
			$notes,
			$this->list_values( $search_route['registration_block_reasons'] ?? array() ),
			$this->list_values( $dependency_payload['inventory_search_route_dependency_issues'] ?? array() ),
			$this->list_values( $dependency_payload['configuration_issues'] ?? array() )
		);

		return array() === $notes ? 'route not ready' : implode( '; ', array_values( array_unique( $notes ) ) );
	}

	/**
	 * @param array<string, mixed> $bootstrap_payload Inventory route bootstrap payload.
	 * @param array<string, mixed> $dependency_payload Inventory route dependency payload.
	 * @param array<string, mixed> $create_route Create route summary.
	 */
	private function intake_lock_notes( array $bootstrap_payload, array $dependency_payload, array $create_route ): string {
		$notes = array();

		if ( true !== ( $bootstrap_payload['feature_enabled'] ?? false ) ) {
			$notes[] = 'inventory_pricing feature flag disabled';
		}

		$notes = array_merge(
			$notes,
			$this->list_values( $create_route['registration_block_reasons'] ?? array() ),
			$this->list_values( $dependency_payload['inventory_intake_route_dependency_issues'] ?? array() ),
			$this->list_values( $dependency_payload['configuration_issues'] ?? array() )
		);

		return array() === $notes ? 'route not ready' : implode( '; ', array_values( array_unique( $notes ) ) );
	}

	private function text_value( mixed $value, int $max_length ): string {
		return substr( trim( (string) ( is_array( $value ) || is_object( $value ) ? '' : $value ) ), 0, $max_length );
	}

	private function slug_value( mixed $value, string $fallback ): string {
		$value = strtolower( $this->text_value( $value, 64 ) );

		return 1 === preg_match( '/^[a-z0-9_-]{2,64}$/', $value ) ? $value : $fallback;
	}

	private function condition_code( mixed $value ): string {
		$value = strtoupper( $this->text_value( $value, 12 ) );

		return in_array( $value, array( 'NM', 'LP', 'MP', 'HP', 'DMG' ), true ) ? $value : 'NM';
	}

	private function currency_code( mixed $value ): string {
		$value = strtoupper( $this->text_value( $value, 3 ) );

		return 1 === preg_match( '/^[A-Z]{3}$/', $value ) ? $value : 'USD';
	}

	private function positive_int_string( mixed $value ): string {
		$value = $this->text_value( $value, 20 );

		return 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ? $value : '';
	}

	private function non_negative_int( mixed $value ): int {
		if ( is_int( $value ) && $value >= 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return (int) $value;
		}

		return 0;
	}

	private function visibility_value( mixed $value ): string {
		$value = strtolower( $this->text_value( $value, 20 ) );

		return in_array( $value, array( 'hidden', 'visible', 'staff_only' ), true ) ? $value : 'hidden';
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
