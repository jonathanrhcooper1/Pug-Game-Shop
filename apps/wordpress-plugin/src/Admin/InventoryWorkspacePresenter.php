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
	private const REFERENCE_SEARCH_ROUTE_KEY = 'GET /reference/search';
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
				$this->woocommerce_projection_notes( $dependency_payload )
			),
			$this->row(
				'Square projection',
				true === ( $dependency_payload['square_inventory_projection_deferred'] ?? true ) ? 'Deferred' : 'Ready',
				true === ( $dependency_payload['square_inventory_projection_deferred'] ?? true ) ? 'deferred' : 'ready',
				$this->square_projection_notes( $dependency_payload )
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
				: 'Locked until inventory search gates are enabled',
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
	 * @param array<string, mixed> $search_panel Staff search panel model.
	 * @return array<string, mixed>
	 */
	public function square_mapping_panel( array $search_panel ): array {
		$ready = true === ( $search_panel['ready'] ?? false );

		return array(
			'ready'        => $ready,
			'status'       => $ready ? 'ready' : 'locked',
			'status_label' => $ready
				? 'Ready to review Square POS mappings from staff search results'
				: 'Locked until staff inventory search is available',
			'notes'        => $ready
				? 'Search inventory to review POS-visible rows, Square variation mappings, duplicate scan IDs, and reconciliation-only Square count readiness.'
				: 'Square POS mapping review uses staff inventory search data and does not perform Square network writes.',
			'summary'      => $this->square_mapping_summary( array() ),
		);
	}

	/**
	 * @param list<array<string, mixed>> $inventory_rows Staff inventory rows.
	 * @return array<string, mixed>
	 */
	public function square_mapping_summary( array $inventory_rows ): array {
		$inventory_rows = array_values(
			array_filter(
				$inventory_rows,
				static fn ( mixed $row ): bool => is_array( $row )
			)
		);
		$scan_counts  = array_count_values(
			array_filter(
				array_map( array( $this, 'square_scan_identity' ), $inventory_rows ),
				static fn ( string $value ): bool => '' !== $value
			)
		);
		$ready_items  = array();
		$review_items = array();
		$hidden_count = 0;

		foreach ( $inventory_rows as $row ) {
			$pos_visibility = $this->visibility_value( $row['pos_visibility'] ?? 'hidden' );
			if ( 'visible' !== $pos_visibility ) {
				++$hidden_count;
				continue;
			}

			$scan_identity = $this->square_scan_identity( $row );
			$errors        = array();

			if ( '' === $scan_identity ) {
				$errors[] = 'barcode_or_sku_required';
			}

			if ( '' !== $scan_identity && (int) ( $scan_counts[ $scan_identity ] ?? 0 ) > 1 ) {
				$errors[] = 'duplicate_barcode_or_sku';
			}

			if ( '' === $this->safe_text( $row['square_catalog_variation_id'] ?? '' ) ) {
				$errors[] = 'square_catalog_variation_id_required_for_inventory_pull';
			}

			$item = array(
				'inventory_id'                 => $this->non_negative_int( $row['inventory_id'] ?? 0 ),
				'public_id'                   => $this->safe_text( $row['public_id'] ?? '' ),
				'card_name'                   => $this->safe_text( $row['card_name'] ?? '' ),
				'set_code'                    => $this->safe_text( $row['set_code'] ?? '' ),
				'condition_code'              => $this->safe_text( $row['condition_code'] ?? '' ),
				'barcode'                     => $this->safe_text( $row['barcode'] ?? '' ),
				'sku'                         => $this->safe_text( $row['sku'] ?? '' ),
				'scan_identity'               => $scan_identity,
				'square_catalog_item_id'      => $this->safe_text( $row['square_catalog_item_id'] ?? '' ),
				'square_catalog_variation_id' => $this->safe_text( $row['square_catalog_variation_id'] ?? '' ),
				'status'                      => $this->safe_text( $row['status'] ?? '' ),
				'pos_visibility'              => $pos_visibility,
				'errors'                      => $errors,
				'next_action'                 => $this->square_mapping_next_action( $errors ),
			);

			if ( array() === $errors ) {
				$ready_items[] = $item;
			} else {
				$review_items[] = $item;
			}
		}

		return array(
			'total_rows'                    => count( $inventory_rows ),
			'pos_visible_count'             => count( $ready_items ) + count( $review_items ),
			'pos_hidden_or_staff_only_count' => $hidden_count,
			'ready_count'                   => count( $ready_items ),
			'review_count'                  => count( $review_items ),
			'duplicate_scan_identity_count' => count(
				array_filter(
					$scan_counts,
					static fn ( int $count ): bool => $count > 1
				)
			),
			'square_inventory_authority'    => 'tcg_store_platform',
			'square_counts_used_for'        => 'pos_reconciliation_and_exception_detection',
			'ready_items'                   => array_slice( $ready_items, 0, 10 ),
			'review_items'                  => array_slice( $review_items, 0, 10 ),
		);
	}

	/**
	 * @param array<string, mixed> $bootstrap_payload Inventory route bootstrap payload.
	 * @param array<string, mixed> $dependency_payload Inventory route dependency payload.
	 * @param array<string, mixed> $query Submitted admin query values.
	 * @return array<string, mixed>
	 */
	public function lookup_panel( array $bootstrap_payload, array $dependency_payload, array $query = array() ): array {
		$routes          = is_array( $bootstrap_payload['route_registration_summary'] ?? null )
			? $bootstrap_payload['route_registration_summary']
			: array();
		$reference_route = is_array( $routes[ self::REFERENCE_SEARCH_ROUTE_KEY ] ?? null )
			? $routes[ self::REFERENCE_SEARCH_ROUTE_KEY ]
			: array();
		$ready           = true === ( $bootstrap_payload['feature_enabled'] ?? false )
			&& true === ( $reference_route['should_register'] ?? false )
			&& false === ( $reference_route['route_connected_reads_deferred'] ?? true )
			&& true === ( $dependency_payload['reference_search_handler_ready'] ?? false );

		return array(
			'ready'             => $ready,
			'status'            => $ready ? 'ready' : 'locked',
			'status_label'      => $ready
				? 'Ready for card lookup and intake drafts'
				: 'Locked until card lookup gates are enabled',
			'endpoint_path'     => '/tcg-store/v1/reference/search',
			'method'            => 'GET',
			'query'             => $this->lookup_query( $query ),
			'notes'             => $ready
				? 'Lookup reads the website reference catalog first and can hand selected cards into staff intake.'
				: $this->lookup_lock_notes( $bootstrap_payload, $dependency_payload, $reference_route ),
			'condition_options' => array( 'NM', 'LP', 'MP', 'HP', 'DMG' ),
			'quantity_options'  => array( 1, 2, 3, 4, 5, 10, 25 ),
			'page_sizes'        => array( 12, 25, 50 ),
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
				: 'Locked until inventory create gates are enabled',
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
				'activate after route and permission verification'
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
		$woocommerce_ready         = true === ( $dependency_payload['woocommerce_projection_planner_ready'] ?? false );
		$woocommerce_request_ready = true === ( $dependency_payload['woocommerce_product_write_request_planner_ready'] ?? false );
		$square_ready              = true === ( $dependency_payload['square_inventory_projection_planner_ready'] ?? false );
		$planning_deferred         = true === ( $dependency_payload['external_projection_planning_deferred'] ?? true );

		if ( $planning_deferred ) {
			return $this->row(
				'Projection planning',
				'Deferred',
				'deferred',
				$this->projection_planning_notes(
					$planning_deferred,
					$woocommerce_ready,
					$woocommerce_request_ready,
					$square_ready
				)
			);
		}

		if ( $woocommerce_ready && $woocommerce_request_ready && $square_ready ) {
			return $this->row(
				'Projection planning',
				'Ready',
				'ready',
				'WooCommerce requests and Square contracts planned; external writes stay deferred'
			);
		}

		return $this->row(
			'Projection planning',
			sprintf(
				'%d / 3 planners ready',
				(int) $woocommerce_ready + (int) $woocommerce_request_ready + (int) $square_ready
			),
			'blocked',
			$this->projection_planning_notes(
				$planning_deferred,
				$woocommerce_ready,
				$woocommerce_request_ready,
				$square_ready
			)
		);
	}

	/**
	 * @param array<string, mixed> $dependency_payload Inventory route dependency payload.
	 */
	private function woocommerce_projection_notes( array $dependency_payload ): string {
		$request_status = true === ( $dependency_payload['woocommerce_product_write_request_planner_ready'] ?? false )
			? 'write request planner staged'
			: 'write request planner pending';

		return 'serialized inventory hooks stay guarded; ' . $request_status;
	}

	/**
	 * @param array<string, mixed> $dependency_payload Inventory route dependency payload.
	 */
	private function square_projection_notes( array $dependency_payload ): string {
		$sync_status = true === ( $dependency_payload['square_inventory_sync_request_planner_ready'] ?? false )
			? 'sync request planner staged'
			: 'sync request planner pending';

		return 'inventory projection only; ' . $sync_status . '; Square payments handled by WooCommerce Square';
	}

	private function projection_planning_notes(
		bool $planning_deferred,
		bool $woocommerce_ready,
		bool $woocommerce_request_ready,
		bool $square_ready
	): string {
		$notes = array();

		if ( $planning_deferred ) {
			$notes[] = 'waiting for staged inventory create handler';
		}

		if ( ! $woocommerce_ready ) {
			$notes[] = 'WooCommerce planner missing';
		}

		if ( ! $woocommerce_request_ready ) {
			$notes[] = 'WooCommerce write request planner missing';
		}

		if ( ! $square_ready ) {
			$notes[] = 'Square planner missing';
		}

		return array() === $notes
			? 'WooCommerce requests and Square contracts planned; external writes stay deferred'
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
			'provider_name'                   => $this->slug_value( $form['provider_name'] ?? 'scrydex', 'scrydex' ),
			'provider_card_id'                => $this->text_value( $form['provider_card_id'] ?? '', 120 ),
			'reference_card_id'               => $this->positive_int_string( $form['reference_card_id'] ?? '' ),
			'reference_variant_id'            => $this->positive_int_string( $form['reference_variant_id'] ?? '' ),
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
			'market_price_minor_units'       => $this->non_negative_int( $form['market_price_minor_units'] ?? 0 ),
			'front_image_remote_url'         => $this->url_value( $form['front_image_remote_url'] ?? '' ),
			'back_image_remote_url'          => $this->url_value( $form['back_image_remote_url'] ?? '' ),
			'intake_quantity'                => $this->bounded_int( $form['intake_quantity'] ?? 1, 1, 100 ),
			'online_visibility'              => $this->visibility_value( $form['online_visibility'] ?? 'visible' ),
			'kiosk_visibility'               => $this->visibility_value( $form['kiosk_visibility'] ?? 'visible' ),
			'pos_visibility'                 => $this->visibility_value( $form['pos_visibility'] ?? 'visible' ),
		);
	}

	/**
	 * @param array<string, mixed> $query Submitted admin query values.
	 * @return array{q:string,game:string,page_size:int}
	 */
	private function lookup_query( array $query ): array {
		$q         = substr( trim( (string) ( $query['q'] ?? '' ) ), 0, 120 );
		$game      = strtolower( trim( (string) ( $query['game'] ?? 'pokemon' ) ) );
		$page_size = (int) ( $query['page_size'] ?? 12 );

		if ( '' !== $game && 1 !== preg_match( '/^[a-z0-9_-]{2,64}$/', $game ) ) {
			$game = 'pokemon';
		}

		if ( ! in_array( $page_size, array( 12, 25, 50 ), true ) ) {
			$page_size = 12;
		}

		return array(
			'q'         => $q,
			'game'      => $game,
			'page_size' => $page_size,
		);
	}

	/**
	 * @param array<string, mixed> $bootstrap_payload Inventory route bootstrap payload.
	 * @param array<string, mixed> $dependency_payload Inventory route dependency payload.
	 * @param array<string, mixed> $reference_route Reference route summary.
	 */
	private function lookup_lock_notes( array $bootstrap_payload, array $dependency_payload, array $reference_route ): string {
		$notes = array();

		if ( true !== ( $bootstrap_payload['feature_enabled'] ?? false ) ) {
			$notes[] = 'inventory_pricing feature flag disabled';
		}

		if ( true !== ( $dependency_payload['reference_search_handler_ready'] ?? false ) ) {
			$notes[] = 'reference search handler not ready';
		}

		$notes = array_merge(
			$notes,
			$this->list_values( $reference_route['registration_block_reasons'] ?? array() ),
			$this->list_values( $dependency_payload['inventory_search_route_dependency_issues'] ?? array() ),
			$this->list_values( $dependency_payload['configuration_issues'] ?? array() )
		);

		return array() === $notes ? 'reference search route not ready' : implode( '; ', array_values( array_unique( $notes ) ) );
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

	private function url_value( mixed $value ): string {
		$value = $this->text_value( $value, 255 );

		return 1 === preg_match( '#^https?://[^\s<>"\']+$#', $value ) ? $value : '';
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

	private function bounded_int( mixed $value, int $minimum, int $maximum ): int {
		if ( is_int( $value ) ) {
			$integer = $value;
		} elseif ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			$integer = (int) $value;
		} else {
			return $minimum;
		}

		return min( $maximum, max( $minimum, $integer ) );
	}

	private function visibility_value( mixed $value ): string {
		$value = strtolower( $this->text_value( $value, 20 ) );

		return in_array( $value, array( 'hidden', 'visible', 'staff_only' ), true ) ? $value : 'hidden';
	}

	/**
	 * @param array<string, mixed> $row Inventory row.
	 */
	private function square_scan_identity( array $row ): string {
		$sku     = $this->safe_text( $row['sku'] ?? '' );
		$barcode = $this->safe_text( $row['barcode'] ?? '' );

		return '' !== $sku ? $sku : $barcode;
	}

	private function square_mapping_next_action( array $errors ): string {
		if ( in_array( 'duplicate_barcode_or_sku', $errors, true ) ) {
			return 'Assign a unique barcode/SKU before Square can match this row.';
		}

		if ( in_array( 'square_catalog_variation_id_required_for_inventory_pull', $errors, true ) ) {
			return 'Create or link a Square catalog variation for this website inventory row.';
		}

		if ( in_array( 'barcode_or_sku_required', $errors, true ) ) {
			return 'Add a barcode/SKU so Square POS can scan and reconcile the item.';
		}

		return 'Ready for Square count reconciliation; payment capture remains delegated.';
	}

	private function safe_text( mixed $value ): string {
		return $this->text_value( $value, 191 );
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
