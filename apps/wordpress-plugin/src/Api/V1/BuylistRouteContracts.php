<?php
/**
 * Planned buylist REST route contracts.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class BuylistRouteContracts {
	private const NAMESPACE = 'tcg-store/v1';

	/**
	 * @return list<array<string, mixed>>
	 */
	public static function route_contracts(): array {
		return array(
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/buylist/submissions',
				'method'                  => 'POST',
				'callback'                => 'create_buylist_submission',
				'permission'              => 'public_or_staff_intake',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/buylist/submissions',
				'method'                  => 'GET',
				'callback'                => 'list_buylist_submissions',
				'permission'              => 'approve_buylist',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/buylist/submissions/(?P<submission_id>\d+)',
				'method'                  => 'GET',
				'callback'                => 'get_buylist_submission',
				'permission'              => 'owner_token_or_staff',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/buylist/submissions/(?P<submission_id>\d+)/review',
				'method'                  => 'POST',
				'callback'                => 'review_buylist_submission',
				'permission'              => 'approve_buylist',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/buylist/submissions/(?P<submission_id>\d+)/offer',
				'method'                  => 'POST',
				'callback'                => 'offer_buylist_submission',
				'permission'              => 'approve_buylist',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/buylist/submissions/(?P<submission_id>\d+)/accept',
				'method'                  => 'POST',
				'callback'                => 'accept_buylist_offer',
				'permission'              => 'owner_token_or_staff',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/buylist/items/(?P<buylist_item_id>\d+)/convert-to-inventory',
				'method'                  => 'POST',
				'callback'                => 'convert_buylist_item_to_inventory',
				'permission'              => 'create_inventory',
				'live_enabled_by_default' => false,
			),
		);
	}

	private function __construct() {
	}
}
