<?php
/**
 * Planned customer credit REST route contracts.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class CustomerCreditRouteContracts {
	private const NAMESPACE = 'tcg-store/v1';

	/**
	 * @return list<array<string, mixed>>
	 */
	public static function route_contracts(): array {
		return array(
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/customers/(?P<customer_id>\d+)/credit',
				'method'                  => 'GET',
				'callback'                => 'get_customer_credit',
				'permission'              => 'view_credit',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/customers/(?P<customer_id>\d+)/ledger',
				'method'                  => 'GET',
				'callback'                => 'list_customer_credit_ledger',
				'permission'              => 'view_credit',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/customers/(?P<customer_id>\d+)/credit/adjust',
				'method'                  => 'POST',
				'callback'                => 'adjust_customer_credit',
				'permission'              => 'adjust_credit',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/customers/(?P<customer_id>\d+)/credit/redeem',
				'method'                  => 'POST',
				'callback'                => 'redeem_customer_credit',
				'permission'              => 'redeem_credit',
				'live_enabled_by_default' => false,
			),
		);
	}

	private function __construct() {
	}
}
