<?php
/**
 * Plan-only offline pull change-query contracts.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflinePullChangeQueryPlanner {
	/**
	 * @var array<string, array<string, mixed>>
	 */
	private const DOMAIN_CONTRACTS = array(
		'branding'        => array(
			'table'            => 'tcg_settings',
			'row_id_column'    => 'setting_id',
			'entity_type'      => 'branding_settings',
			'selected_columns' => array(
				'setting_id',
				'setting_namespace',
				'setting_key',
				'value_type',
				'value_text',
				'setting_version',
				'updated_at',
			),
			'payload_fields'   => array(
				'setting_key',
				'value_type',
				'value_text',
				'setting_version',
			),
			'where'            => array(
				'setting_namespace' => 'branding',
				'is_encrypted'      => 0,
			),
		),
		'inventory'       => array(
			'table'            => 'tcg_inventory_items',
			'row_id_column'    => 'inventory_id',
			'entity_type'      => 'inventory_item',
			'selected_columns' => array(
				'inventory_id',
				'public_id',
				'game',
				'card_name',
				'set_name',
				'set_code',
				'card_number',
				'barcode',
				'sku',
				'sale_price',
				'sale_currency',
				'location_id',
				'status',
				'online_visibility',
				'kiosk_visibility',
				'pos_visibility',
				'updated_at',
				'row_version',
			),
			'payload_fields'   => array(
				'public_id',
				'game',
				'card_name',
				'set_name',
				'set_code',
				'card_number',
				'barcode',
				'sku',
				'sale_price',
				'sale_currency',
				'location_id',
				'status',
				'online_visibility',
				'kiosk_visibility',
				'pos_visibility',
			),
			'where'            => array(),
		),
		'customer_credit' => array(
			'table'            => 'tcg_customers',
			'row_id_column'    => 'customer_id',
			'entity_type'      => 'customer_credit_account',
			'selected_columns' => array(
				'customer_id',
				'public_id',
				'display_name',
				'display_phone',
				'credit_balance',
				'credit_currency',
				'credit_version',
				'status',
				'updated_at',
				'row_version',
			),
			'payload_fields'   => array(
				'public_id',
				'display_name',
				'display_phone',
				'credit_balance',
				'credit_currency',
				'credit_version',
				'status',
			),
			'where'            => array(
				'status' => 'active',
			),
		),
		'events'          => array(
			'table'            => 'tcg_events',
			'row_id_column'    => 'event_id',
			'entity_type'      => 'event',
			'selected_columns' => array(
				'event_id',
				'public_id',
				'title',
				'slug',
				'event_type',
				'game',
				'format',
				'start_datetime',
				'end_datetime',
				'timezone',
				'location_id',
				'entry_fee',
				'currency',
				'player_cap',
				'registered_count',
				'waitlist_enabled',
				'registration_status',
				'registration_mode',
				'topdeck_enabled',
				'topdeck_tid',
				'topdeck_registration_url',
				'offline_reservation_enabled',
				'updated_at',
				'row_version',
			),
			'payload_fields'   => array(
				'public_id',
				'title',
				'slug',
				'event_type',
				'game',
				'format',
				'start_datetime',
				'end_datetime',
				'timezone',
				'location_id',
				'entry_fee',
				'currency',
				'player_cap',
				'registered_count',
				'waitlist_enabled',
				'registration_status',
				'registration_mode',
				'topdeck_enabled',
				'topdeck_tid',
				'topdeck_registration_url',
				'offline_reservation_enabled',
			),
			'where'            => array(
				'public_visibility' => 'published',
			),
		),
		'conflicts'       => array(
			'table'            => 'tcg_sync_conflicts',
			'row_id_column'    => 'sync_conflict_id',
			'entity_type'      => 'sync_conflict',
			'selected_columns' => array(
				'sync_conflict_id',
				'conflict_id',
				'offline_device_id',
				'device_public_id',
				'status',
				'entity_type',
				'entity_id',
				'conflict_type',
				'severity',
				'summary',
				'server_row_version',
				'device_row_version',
				'updated_at',
				'row_version',
			),
			'payload_fields'   => array(
				'conflict_id',
				'status',
				'entity_type',
				'entity_id',
				'conflict_type',
				'severity',
				'summary',
				'server_row_version',
				'device_row_version',
			),
			'where'            => array(
				'status' => 'open',
			),
		),
	);

	/**
	 * @return list<string>
	 */
	public static function supported_domains(): array {
		return array_values( array_keys( self::DOMAIN_CONTRACTS ) );
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	public static function domain_contracts(): array {
		return self::DOMAIN_CONTRACTS;
	}

	public function plan(
		OfflinePullRequest $request,
		int $offline_device_id,
		string $table_prefix
	): OfflinePullChangeQueryPlan {
		$errors       = array();
		$table_prefix = trim( $table_prefix );

		if ( $offline_device_id <= 0 ) {
			$errors[] = 'offline_device_id_invalid';
		}

		if (
			'' === $table_prefix
			|| 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix )
		) {
			$errors[] = 'table_prefix_invalid';
		}

		$unsupported = array_diff( $request->domains(), array_keys( self::DOMAIN_CONTRACTS ) );
		if ( array() !== $unsupported ) {
			$errors[] = 'domain_unsupported';
		}

		if ( array() !== $errors ) {
			return OfflinePullChangeQueryPlan::rejected(
				$request->device_id(),
				$offline_device_id,
				$errors
			);
		}

		$queries = array();

		foreach ( $request->domains() as $domain ) {
			$domain             = strtolower( trim( $domain ) );
			$queries[ $domain ] = $this->domain_query(
				$domain,
				self::DOMAIN_CONTRACTS[ $domain ],
				$request,
				$offline_device_id,
				$table_prefix
			);
		}

		return OfflinePullChangeQueryPlan::accepted(
			$request->device_id(),
			$offline_device_id,
			$table_prefix,
			$queries
		);
	}

	/**
	 * @param array<string, mixed> $contract Domain contract.
	 * @return array<string, mixed>
	 */
	private function domain_query(
		string $domain,
		array $contract,
		OfflinePullRequest $request,
		int $offline_device_id,
		string $table_prefix
	): array {
		$where         = $contract['where'];
		$row_id_column = (string) $contract['row_id_column'];
		$order_by      = array(
			'updated_at'   => 'ASC',
			$row_id_column => 'ASC',
		);

		if ( 'conflicts' === $domain ) {
			$where['offline_device_id'] = $offline_device_id;
			$where['device_public_id']  = $request->device_id();
		}

		return array(
			'domain'                   => $domain,
			'table_name'               => $table_prefix . $contract['table'],
			'row_id_column'            => $row_id_column,
			'entity_type'              => $contract['entity_type'],
			'selected_columns'         => $contract['selected_columns'],
			'payload_fields'           => $contract['payload_fields'],
			'where'                    => $where,
			'cursor_after'             => $request->cursors()[ $domain ] ?? '',
			'limit'                    => $request->page_size(),
			'order_by'                 => $order_by,
			'include_tombstones'       => $request->include_tombstones(),
			'query_ready'              => true,
			'execution_deferred'       => true,
			'cursor_advance_deferred'  => true,
			'tombstone_read_deferred'  => true,
			'change_set_provider_next' => true,
		);
	}
}
