<?php
/**
 * WooCommerce Square extension status tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Square\WooCommerceSquareExtensionStatus;
use TCGStorePlatform\Tests\TestCase;

final class WooCommerceSquareExtensionStatusTest extends TestCase {
	public function test_default_status_is_blocked_without_official_extension_signals(): void {
		$status = ( new WooCommerceSquareExtensionStatus(
			static fn (): array => array(),
			static fn (): array => array(),
			static fn (): bool => false
		) )->readiness_summary();

		$this->assert_same( 'blocked', $status['status'] );
		$this->assert_false( $status['extension_installed'] );
		$this->assert_false( $status['extension_active'] );
		$this->assert_true( $status['official_woocommerce_square_extension_required'] );
		$this->assert_same( WooCommerceSquareExtensionStatus::PLUGIN_FILE, $status['official_woocommerce_square_plugin_file'] );
		$this->assert_same( 'official_woocommerce_square_extension', $status['payment_capture_authority'] );
		$this->assert_false( $status['plugin_square_payment_capture_allowed'] );
		$this->assert_true( $status['square_network_writes_deferred'] );
		$this->assert_true( $status['provider_credentials_redacted'] );
		$this->assert_same(
			array(
				'official_woocommerce_square_extension_not_installed',
				'official_woocommerce_square_extension_not_active',
			),
			$status['configuration_issues']
		);
	}

	public function test_active_plugin_file_reports_ready_extension_status(): void {
		$status = ( new WooCommerceSquareExtensionStatus(
			static fn (): array => array( WooCommerceSquareExtensionStatus::PLUGIN_FILE ),
			static fn (): array => array(),
			static fn (): bool => false
		) )->readiness_summary();

		$this->assert_same( 'ready', $status['status'] );
		$this->assert_true( $status['extension_installed'] );
		$this->assert_true( $status['extension_active'] );
		$this->assert_same( array(), $status['configuration_issues'] );
	}

	public function test_installed_but_inactive_plugin_reports_blocked_active_issue(): void {
		$status = ( new WooCommerceSquareExtensionStatus(
			static fn (): array => array(),
			static fn (): array => array( WooCommerceSquareExtensionStatus::PLUGIN_FILE ),
			static fn (): bool => false
		) )->readiness_summary();

		$this->assert_same( 'blocked', $status['status'] );
		$this->assert_true( $status['extension_installed'] );
		$this->assert_false( $status['extension_active'] );
		$this->assert_same(
			array( 'official_woocommerce_square_extension_not_active' ),
			$status['configuration_issues']
		);
	}

	public function test_loaded_official_class_signal_reports_ready_status(): void {
		$status = ( new WooCommerceSquareExtensionStatus(
			static fn (): array => array(),
			static fn (): array => array(),
			static fn ( string $class_name ): bool => 'WooCommerce_Square_Loader' === $class_name
		) )->readiness_summary();

		$this->assert_same( 'ready', $status['status'] );
		$this->assert_true( $status['extension_installed'] );
		$this->assert_true( $status['extension_active'] );
		$this->assert_true( $status['class_signal_detected'] );
	}
}
