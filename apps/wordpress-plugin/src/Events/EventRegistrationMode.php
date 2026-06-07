<?php
/**
 * Event registration mode contract.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

final class EventRegistrationMode {
	public const LOCAL_ONLY = 'local_only';

	/**
	 * @return list<string>
	 */
	public static function all(): array {
		return array(
			self::LOCAL_ONLY,
		);
	}

	private function __construct() {
	}
}
