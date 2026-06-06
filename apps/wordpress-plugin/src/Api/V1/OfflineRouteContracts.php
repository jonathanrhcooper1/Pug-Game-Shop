<?php
/**
 * Planned offline device and sync REST route contracts.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class OfflineRouteContracts {
	private const NAMESPACE = 'tcg-store/v1';

	/**
	 * @return list<array<string, mixed>>
	 */
	public static function route_contracts(): array {
		return array(
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/offline/devices/register',
				'method'                  => 'POST',
				'callback'                => 'register_offline_device',
				'permission'              => 'pairing_code_plus_manager',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/offline/pull',
				'method'                  => 'POST',
				'callback'                => 'pull_offline_changes',
				'permission'              => 'registered_device',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/offline/push',
				'method'                  => 'POST',
				'callback'                => 'push_offline_operations',
				'permission'              => 'registered_device',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/offline/conflicts',
				'method'                  => 'GET',
				'callback'                => 'list_offline_conflicts',
				'permission'              => 'resolve_conflicts',
				'live_enabled_by_default' => false,
			),
			array(
				'namespace'               => self::NAMESPACE,
				'path'                    => '/offline/conflicts/(?P<conflict_id>[a-zA-Z0-9_-]+)/resolve',
				'method'                  => 'POST',
				'callback'                => 'resolve_offline_conflict',
				'permission'              => 'resolve_conflicts',
				'live_enabled_by_default' => false,
			),
		);
	}

	private function __construct() {
	}
}
