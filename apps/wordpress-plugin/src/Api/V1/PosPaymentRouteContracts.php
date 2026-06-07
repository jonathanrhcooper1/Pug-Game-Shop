<?php
/**
 * Planned POS/payment REST route contracts.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class PosPaymentRouteContracts {
	private const NAMESPACE = 'tcg-store/v1';

	/**
	 * @return list<array<string, mixed>>
	 */
	public static function route_contracts(): array {
		return array(
			self::contract(
				'/pos/events',
				'POST',
				'ingest_pos_event',
				'manage_pos',
				'pos_event_ingestion'
			),
			self::contract(
				'/pos/events/(?P<provider_event_id>[a-zA-Z0-9:_-]+)',
				'GET',
				'get_pos_event_status',
				'manage_pos',
				'pos_event_lookup'
			),
			self::contract(
				'/pos/reconciliation/run',
				'POST',
				'run_pos_reconciliation',
				'manage_pos',
				'pos_reconciliation'
			),
			self::contract(
				'/pos/reconciliation/conflicts',
				'GET',
				'list_pos_reconciliation_conflicts',
				'resolve_conflicts',
				'pos_conflict_review'
			),
			self::contract(
				'/pos/reconciliation/conflicts/(?P<conflict_id>\d+)/resolve',
				'POST',
				'resolve_pos_reconciliation_conflict',
				'resolve_conflicts',
				'pos_conflict_resolution'
			),
			self::contract(
				'/payments/webhooks/(?P<provider>[a-zA-Z0-9_-]+)',
				'POST',
				'receive_payment_provider_webhook',
				'signed_provider_webhook',
				'payment_webhook_ingestion'
			),
			self::contract(
				'/payments/fee-snapshots',
				'GET',
				'list_payment_fee_snapshots',
				'manage_settings',
				'payment_fee_review'
			),
			self::contract(
				'/payments/fee-snapshots',
				'POST',
				'create_payment_fee_snapshot',
				'manage_settings',
				'payment_fee_configuration'
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private static function contract(
		string $path,
		string $method,
		string $callback,
		string $permission,
		string $workflow
	): array {
		return array(
			'namespace'                         => self::NAMESPACE,
			'path'                              => $path,
			'method'                            => $method,
			'callback'                          => $callback,
			'permission'                        => $permission,
			'workflow'                          => $workflow,
			'live_enabled_by_default'           => false,
			'route_registration_deferred'       => true,
			'route_connected_writes_deferred'   => true,
			'transaction_execution_deferred'    => true,
			'provider_capture_deferred'         => true,
			'provider_inventory_write_deferred' => true,
			'webhook_registration_deferred'     => true,
			'woocommerce_gateway_capture_deferred' => true,
		);
	}

	private function __construct() {
	}
}
