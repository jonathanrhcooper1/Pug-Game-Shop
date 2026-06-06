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
	public function test_topdeck_modes_require_provider_link(): void {
		$this->assert_true( EventRegistrationMode::requires_topdeck_link( EventRegistrationMode::TOPDECK_HOSTED ) );
		$this->assert_true( EventRegistrationMode::requires_topdeck_link( EventRegistrationMode::WEBSITE_PUSH_TOPDECK ) );
		$this->assert_false( EventRegistrationMode::requires_topdeck_link( EventRegistrationMode::LOCAL_ONLY ) );
	}
}
