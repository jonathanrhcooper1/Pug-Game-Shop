<?php
/**
 * Runtime dependency checks.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Bootstrap;

use RuntimeException;
use TCGStorePlatform\Version;

final class DependencyChecker {
	/**
	 * Stop activation for platform-level incompatibilities.
	 *
	 * WooCommerce is reported as degraded instead of blocking activation so an
	 * administrator can install or repair WooCommerce after this plugin.
	 */
	public static function assert_activation_requirements(): void {
		global $wp_version;

		if ( version_compare( PHP_VERSION, Version::MINIMUM_PHP, '<' ) ) {
			throw new RuntimeException(
				sprintf(
					'TCG Store Platform requires PHP %s or newer.',
					Version::MINIMUM_PHP
				)
			);
		}

		if ( version_compare( (string) $wp_version, Version::MINIMUM_WORDPRESS, '<' ) ) {
			throw new RuntimeException(
				sprintf(
					'TCG Store Platform requires WordPress %s or newer.',
					Version::MINIMUM_WORDPRESS
				)
			);
		}
	}

	/**
	 * Return non-secret dependency health.
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public static function status(): array {
		global $wp_version;

		$woocommerce_version = defined( 'WC_VERSION' ) ? WC_VERSION : null;
		$action_scheduler    = function_exists( 'as_schedule_single_action' );

		return array(
			'php'              => array(
				'status'  => version_compare( PHP_VERSION, Version::MINIMUM_PHP, '>=' ) ? 'ok' : 'blocked',
				'version' => PHP_VERSION,
				'minimum' => Version::MINIMUM_PHP,
			),
			'wordpress'        => array(
				'status'  => version_compare( (string) $wp_version, Version::MINIMUM_WORDPRESS, '>=' ) ? 'ok' : 'blocked',
				'version' => (string) $wp_version,
				'minimum' => Version::MINIMUM_WORDPRESS,
			),
			'woocommerce'      => array(
				'status'  => $woocommerce_version && version_compare( $woocommerce_version, Version::MINIMUM_WOOCOMMERCE, '>=' )
					? 'ok'
					: 'degraded',
				'version' => $woocommerce_version,
				'minimum' => Version::MINIMUM_WOOCOMMERCE,
			),
			'action_scheduler' => array(
				'status'  => $action_scheduler ? 'ok' : 'degraded',
				'version' => defined( 'ACTION_SCHEDULER_VERSION' ) ? ACTION_SCHEDULER_VERSION : null,
			),
		);
	}

	/**
	 * Show actionable dependency notices to platform administrators.
	 */
	public static function render_admin_notices(): void {
		if ( ! current_user_can( 'manage_settings' ) && ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$status = self::status();

		if ( 'ok' !== $status['woocommerce']['status'] ) {
			self::render_notice(
				sprintf(
					/* translators: %s is the minimum WooCommerce version. */
					__( 'TCG Store Platform requires WooCommerce %s or newer for commerce features.', 'tcg-store-platform' ),
					Version::MINIMUM_WOOCOMMERCE
				)
			);
		}

		if ( 'ok' !== $status['action_scheduler']['status'] ) {
			self::render_notice(
				__( 'Action Scheduler is unavailable. Background platform jobs will not run until WooCommerce or Action Scheduler is active.', 'tcg-store-platform' )
			);
		}
	}

	private static function render_notice( string $message ): void {
		echo '<div class="notice notice-warning"><p>';
		echo esc_html( $message );
		echo '</p></div>';
	}
}
