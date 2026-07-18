<?php
/**
 * Event registration mode tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Events\EventRegistrationMode;
use TCGStorePlatform\Tests\TestCase;

final class EventRegistrationModeTest extends TestCase {
	public function test_local_only_is_the_active_registration_mode(): void {
		$this->assert_same( array( EventRegistrationMode::LOCAL_ONLY ), EventRegistrationMode::all() );
	}
}
