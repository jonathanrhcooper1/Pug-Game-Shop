<?php
/**
 * WordPress role installation.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Auth;

final class RoleManager {
	public const VERSION_OPTION = 'tcg_store_platform_role_version';
	private const VERSION       = 3;

	/**
	 * Install custom roles and add platform capabilities to trusted core roles.
	 */
	public static function install(): void {
		$role_labels = array(
			'tcg_store_staff'   => __( 'TCG Store Staff', 'tcg-store-platform' ),
			'tcg_store_manager' => __( 'TCG Store Manager', 'tcg-store-platform' ),
			'tcg_store_system'  => __( 'TCG Store System', 'tcg-store-platform' ),
		);

		foreach ( CapabilityRegistry::roles() as $role_slug => $capabilities ) {
			$role = get_role( $role_slug );

			if ( ! $role ) {
				$role = add_role(
					$role_slug,
					$role_labels[ $role_slug ],
					array( 'read' => true )
				);
			}

			if ( ! $role ) {
				continue;
			}

			foreach ( $capabilities as $capability ) {
				$role->add_cap( $capability );
			}
		}

		add_role(
			'tcg_store_kiosk',
			__( 'TCG Store Kiosk', 'tcg-store-platform' ),
			array( 'read' => true )
		);

		self::add_capabilities_to_role( 'administrator', CapabilityRegistry::all() );
		self::add_capabilities_to_role( 'shop_manager', CapabilityRegistry::manager() );
		update_option( self::VERSION_OPTION, self::VERSION, false );
	}

	public static function maybe_install(): void {
		if ( (int) get_option( self::VERSION_OPTION, 0 ) >= self::VERSION ) {
			return;
		}

		self::install();
	}

	/**
	 * Add capabilities if WooCommerce creates the shop_manager role later.
	 *
	 * @param string $plugin Activated plugin basename.
	 */
	public static function handle_plugin_activation( string $plugin ): void {
		if ( ! str_starts_with( $plugin, 'woocommerce/' ) ) {
			return;
		}

		self::install();
	}

	/**
	 * Remove plugin-owned roles and capabilities.
	 */
	public static function uninstall(): void {
		foreach ( array_keys( CapabilityRegistry::roles() ) as $role_slug ) {
			remove_role( $role_slug );
		}

		remove_role( 'tcg_store_kiosk' );
		self::remove_capabilities_from_role( 'administrator', CapabilityRegistry::all() );
		self::remove_capabilities_from_role( 'shop_manager', CapabilityRegistry::all() );
		delete_option( self::VERSION_OPTION );
	}

	/**
	 * @param list<string> $capabilities Capabilities to add.
	 */
	private static function add_capabilities_to_role( string $role_slug, array $capabilities ): void {
		$role = get_role( $role_slug );

		if ( ! $role ) {
			return;
		}

		foreach ( $capabilities as $capability ) {
			$role->add_cap( $capability );
		}
	}

	/**
	 * @param list<string> $capabilities Capabilities to remove.
	 */
	private static function remove_capabilities_from_role( string $role_slug, array $capabilities ): void {
		$role = get_role( $role_slug );

		if ( ! $role ) {
			return;
		}

		foreach ( $capabilities as $capability ) {
			$role->remove_cap( $capability );
		}
	}

	private function __construct() {
	}
}
