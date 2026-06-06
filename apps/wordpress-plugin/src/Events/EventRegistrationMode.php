<?php
/**
 * Event registration mode contract.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

final class EventRegistrationMode {
	public const TOPDECK_HOSTED       = 'topdeck_hosted';
	public const WEBSITE_PUSH_TOPDECK = 'website_push_topdeck';
	public const LOCAL_ONLY           = 'local_only';

	/**
	 * @return list<string>
	 */
	public static function all(): array {
		return array(
			self::TOPDECK_HOSTED,
			self::WEBSITE_PUSH_TOPDECK,
			self::LOCAL_ONLY,
		);
	}

	public static function requires_topdeck_link( string $mode ): bool {
		return in_array(
			$mode,
			array(
				self::TOPDECK_HOSTED,
				self::WEBSITE_PUSH_TOPDECK,
			),
			true
		);
	}

	private function __construct() {
	}
}
