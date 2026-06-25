<?php
/**
 * Local and staging safety controls for wp-env/staging clones.
 *
 * @package TCGStorePlatform
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'admin_bar_menu',
	static function ( WP_Admin_Bar $admin_bar ): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$environment = defined( 'TCG_STORE_PLATFORM_ENVIRONMENT' )
			? TCG_STORE_PLATFORM_ENVIRONMENT
			: wp_get_environment_type();

		if ( 'production' === $environment ) {
			return;
		}

		$admin_bar->add_node(
			array(
				'id'    => 'tcg-store-platform-environment-banner',
				'title' => strtoupper( (string) $environment ),
				'href'  => admin_url(),
				'meta'  => array(
					'class' => 'tcg-store-platform-environment-banner',
				),
			)
		);
	},
	100
);

add_action(
	'admin_head',
	static function (): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		echo '<style>#wpadminbar #wp-admin-bar-tcg-store-platform-environment-banner > .ab-item{background:#b42318;color:#fff;font-weight:700;}</style>';
	}
);

add_filter(
	'pre_option_blog_public',
	static function ( mixed $value ): int {
		unset( $value );

		return 0;
	}
);

add_filter(
	'wp_robots',
	static function ( array $robots ): array {
		$robots['noindex']  = true;
		$robots['nofollow'] = true;

		return $robots;
	}
);

add_filter(
	'pre_wp_mail',
	static function ( mixed $return, array $atts ): bool {
		if ( defined( 'TCG_STORE_PLATFORM_DISABLE_REAL_EMAILS' ) && TCG_STORE_PLATFORM_DISABLE_REAL_EMAILS ) {
			error_log( 'TCG local safety blocked email: ' . wp_json_encode( $atts ) ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			return true;
		}

		return (bool) $return;
	},
	10,
	2
);

add_filter(
	'woocommerce_available_payment_gateways',
	static function ( array $gateways ): array {
		if ( defined( 'TCG_STORE_PLATFORM_DISABLE_REAL_PAYMENTS' ) && TCG_STORE_PLATFORM_DISABLE_REAL_PAYMENTS ) {
			foreach ( $gateways as $gateway_id => $gateway ) {
				if ( ! in_array( $gateway_id, array( 'cod', 'cheque' ), true ) ) {
					unset( $gateways[ $gateway_id ] );
				}
			}
		}

		return $gateways;
	}
);
