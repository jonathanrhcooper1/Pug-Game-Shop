<?php
/**
 * Foundation admin screens.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Admin;

use TCGStorePlatform\Api\V1\OfflineDevicePairingRouteReadinessPlanner;
use TCGStorePlatform\Api\V1\OfflineDevicePairingRouteReadinessStatusPresenter;
use TCGStorePlatform\Api\V1\OfflineDeviceRegistrationRouteHandlerFactory;
use TCGStorePlatform\Api\V1\OfflineRegisteredDevicePermissionReadinessStatusPresenter;
use TCGStorePlatform\Api\V1\OfflineRegisteredDeviceSyncRouteHandlerFactory;
use TCGStorePlatform\Api\V1\OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter;
use TCGStorePlatform\Api\V1\OfflineRouteBootstrapPlanner;
use TCGStorePlatform\Api\V1\OfflineRouteBootstrapStatusPresenter;
use TCGStorePlatform\Api\V1\OfflineRoutePermissionCallbackFactory;
use TCGStorePlatform\Api\V1\OfflineRouteRegistrationPlanner;
use TCGStorePlatform\Api\V1\InventoryRouteDependencyFactory;
use TCGStorePlatform\Api\V1\InventoryRouteDependencyStatusPresenter;
use TCGStorePlatform\Api\V1\PosPaymentRouteDependencyFactory;
use TCGStorePlatform\Api\V1\PosPaymentRouteDependencyStatusPresenter;
use TCGStorePlatform\Api\V1\PosPaymentRouteBootstrapStatusPresenter;
use TCGStorePlatform\Api\V1\PosPaymentRouteReadinessStatusPresenter;
use TCGStorePlatform\Bootstrap\DependencyChecker;
use TCGStorePlatform\FeatureFlags\FeatureFlagRegistry;
use TCGStorePlatform\FeatureFlags\FeatureFlags;
use TCGStorePlatform\Logging\Logger;
use TCGStorePlatform\Migrations\MigrationRunner;
use TCGStorePlatform\Offline\OfflineDevicePairingAuthorizerFactory;
use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolverFactory;
use TCGStorePlatform\Scheduler\DailyScheduler;
use TCGStorePlatform\Settings\BrandingSettings;
use TCGStorePlatform\Settings\Settings;
use TCGStorePlatform\Version;
use TCGStorePlatform\WooCommerce\Compatibility;

final class AdminMenu {
	private Logger $logger;

	public function __construct( Logger $logger ) {
		$this->logger = $logger;
	}

	public function register(): void {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
	}

	public function register_menu(): void {
		add_menu_page(
			__( 'TCG Store Platform', 'tcg-store-platform' ),
			__( 'TCG Store', 'tcg-store-platform' ),
			'view_inventory',
			'tcg-store-platform',
			array( $this, 'render_dashboard' ),
			'dashicons-store',
			56
		);

		add_submenu_page(
			'tcg-store-platform',
			__( 'Dashboard', 'tcg-store-platform' ),
			__( 'Dashboard', 'tcg-store-platform' ),
			'view_inventory',
			'tcg-store-platform',
			array( $this, 'render_dashboard' )
		);

		add_submenu_page(
			'tcg-store-platform',
			__( 'Inventory', 'tcg-store-platform' ),
			__( 'Inventory', 'tcg-store-platform' ),
			'view_inventory',
			'tcg-store-platform-inventory',
			array( $this, 'render_inventory' )
		);

		add_submenu_page(
			'tcg-store-platform',
			__( 'Settings', 'tcg-store-platform' ),
			__( 'Settings', 'tcg-store-platform' ),
			'manage_settings',
			'tcg-store-platform-settings',
			array( $this, 'render_settings' )
		);

		add_submenu_page(
			'tcg-store-platform',
			__( 'System Status', 'tcg-store-platform' ),
			__( 'System Status', 'tcg-store-platform' ),
			'view_reports',
			'tcg-store-platform-status',
			array( $this, 'render_system_status' )
		);
	}

	public function render_dashboard(): void {
		if ( ! current_user_can( 'view_inventory' ) ) {
			wp_die( esc_html__( 'You do not have permission to view this page.', 'tcg-store-platform' ) );
		}

		$branding = BrandingSettings::public_config( Settings::all() );

		echo '<div class="wrap"><h1>';
		echo esc_html( (string) $branding['company']['name'] );
		echo '</h1><p>';
		echo esc_html__( 'Phase 1 foundation is active. Business modules remain protected by feature flags until their implementation phases are accepted.', 'tcg-store-platform' );
		echo '</p>';

		$this->render_feature_table();

		echo '</div>';
	}

	public function render_inventory(): void {
		if ( ! current_user_can( 'view_inventory' ) ) {
			wp_die( esc_html__( 'You do not have permission to view inventory.', 'tcg-store-platform' ) );
		}

		$inventory_factory  = InventoryRouteDependencyFactory::from_settings( Settings::all() );
		$bootstrap_payload  = $inventory_factory->bootstrap_status_presenter()->health_payload(
			FeatureFlags::is_enabled( 'inventory_pricing' )
		);
		$dependency_payload = ( new InventoryRouteDependencyStatusPresenter(
			$inventory_factory
		) )->health_payload();
		$workspace          = new InventoryWorkspacePresenter();

		echo '<div class="wrap"><h1>';
		echo esc_html__( 'Inventory Workspace', 'tcg-store-platform' );
		echo '</h1>';

		echo '<h2>' . esc_html__( 'Readiness', 'tcg-store-platform' ) . '</h2>';
		$this->render_workspace_table( $workspace->readiness_rows( $bootstrap_payload, $dependency_payload ) );

		echo '<h2>' . esc_html__( 'Route Contracts', 'tcg-store-platform' ) . '</h2>';
		$this->render_workspace_table( $workspace->route_rows( $bootstrap_payload ) );

		echo '<h2>' . esc_html__( 'Checkpoints', 'tcg-store-platform' ) . '</h2>';
		$this->render_workspace_table( $workspace->checkpoint_rows( $dependency_payload ) );

		echo '</div>';
	}

	public function render_settings(): void {
		if ( ! current_user_can( 'manage_settings' ) ) {
			wp_die( esc_html__( 'You do not have permission to manage platform settings.', 'tcg-store-platform' ) );
		}

		echo '<div class="wrap"><h1>';
		echo esc_html__( 'TCG Store Platform Settings', 'tcg-store-platform' );
		echo '</h1><form action="options.php" method="post">';
		settings_fields( 'tcg_store_platform' );
		do_settings_sections( 'tcg-store-platform' );
		submit_button();
		echo '</form></div>';
	}

	public function render_system_status(): void {
		if ( ! current_user_can( 'view_reports' ) ) {
			wp_die( esc_html__( 'You do not have permission to view system status.', 'tcg-store-platform' ) );
		}

		$runner                     = new MigrationRunner( $this->logger );
		$scheduler                  = new DailyScheduler( $this->logger );
		$status                     = DependencyChecker::status();
		$branding                   = BrandingSettings::public_config( Settings::all() );
		$device_permission_factory  = new OfflineRegisteredDevicePermissionResolverFactory();
		$sync_handler_factory       = new OfflineRegisteredDeviceSyncRouteHandlerFactory();
		$offline                    = ( new OfflineRouteBootstrapStatusPresenter(
			new OfflineRouteBootstrapPlanner(
				new OfflineRouteRegistrationPlanner(
					new OfflineRoutePermissionCallbackFactory(
						$device_permission_factory->resolver()
					),
					$sync_handler_factory->controller()
				)
			)
		) )->admin_summary(
			FeatureFlags::is_enabled( 'offline_sync' )
		);
		$device_permissions         = ( new OfflineRegisteredDevicePermissionReadinessStatusPresenter(
			$device_permission_factory
		) )->admin_summary();
		$sync_handlers              = ( new OfflineRegisteredDeviceSyncRouteReadinessStatusPresenter(
			$sync_handler_factory
		) )->admin_summary();
		$pairing_authorizer_factory = new OfflineDevicePairingAuthorizerFactory();
		$pairing                    = ( new OfflineDevicePairingRouteReadinessStatusPresenter(
			new OfflineDevicePairingRouteReadinessPlanner(
				null,
				null,
				$pairing_authorizer_factory,
				new OfflineDeviceRegistrationRouteHandlerFactory( null, $pairing_authorizer_factory )
			)
		) )->admin_summary(
			FeatureFlags::is_enabled( 'offline_sync' )
		);
		$pos_payment_routes         = ( new PosPaymentRouteReadinessStatusPresenter() )->admin_summary(
			FeatureFlags::is_enabled( 'pos_payments' )
		);
		$pos_payment_bootstrap      = ( new PosPaymentRouteBootstrapStatusPresenter() )->admin_summary(
			FeatureFlags::is_enabled( 'pos_payments' )
		);
		$pos_payment_dependencies   = ( new PosPaymentRouteDependencyStatusPresenter(
			new PosPaymentRouteDependencyFactory()
		) )->admin_summary();
		$inventory_factory          = InventoryRouteDependencyFactory::from_settings( Settings::all() );
		$inventory_bootstrap        = $inventory_factory->bootstrap_status_presenter()->admin_summary(
			FeatureFlags::is_enabled( 'inventory_pricing' )
		);
		$inventory_dependencies     = ( new InventoryRouteDependencyStatusPresenter(
			$inventory_factory
		) )->admin_summary();
		echo '<div class="wrap"><h1>';
		echo esc_html__( 'TCG Store Platform System Status', 'tcg-store-platform' );
		echo '</h1><table class="widefat striped"><tbody>';

		$this->render_status_row( __( 'Plugin version', 'tcg-store-platform' ), Version::PLUGIN, 'ok' );
		$this->render_status_row(
			__( 'Database schema', 'tcg-store-platform' ),
			(string) $runner->current_version() . ' / ' . (string) Version::DATABASE,
			$runner->current_version() === Version::DATABASE ? 'ok' : 'blocked'
		);

		foreach ( $status as $name => $dependency ) {
			$this->render_status_row(
				ucwords( str_replace( '_', ' ', $name ) ),
				(string) ( $dependency['version'] ?? __( 'Unavailable', 'tcg-store-platform' ) ),
				(string) $dependency['status']
			);
		}

		$schedule = $scheduler->status();
		$this->render_status_row(
			__( 'Daily schedule', 'tcg-store-platform' ),
			$schedule['next_run_utc'] ? $schedule['next_run_utc'] : __( 'Not scheduled', 'tcg-store-platform' ),
			$schedule['available'] && $schedule['next_run_utc'] ? 'ok' : 'degraded'
		);
		$this->render_status_row(
			__( 'WooCommerce HPOS declaration', 'tcg-store-platform' ),
			Compatibility::hpos_status(),
			'verified' === Compatibility::hpos_status() ? 'ok' : 'degraded'
		);
		$this->render_status_row(
			__( 'Branding profile', 'tcg-store-platform' ),
			(string) $branding['company']['name'],
			'configured'
		);
		$this->render_status_row(
			__( 'Offline route bootstrap', 'tcg-store-platform' ),
			$offline['value'],
			$offline['status']
		);
		$this->render_status_row(
			__( 'Offline device permissions', 'tcg-store-platform' ),
			$device_permissions['value'],
			$device_permissions['status']
		);
		$this->render_status_row(
			__( 'Offline sync handlers', 'tcg-store-platform' ),
			$sync_handlers['value'],
			$sync_handlers['status']
		);
		$this->render_status_row(
			__( 'Offline pairing route readiness', 'tcg-store-platform' ),
			$pairing['value'],
			$pairing['status']
		);
		$this->render_status_row(
			__( 'POS/payment route readiness', 'tcg-store-platform' ),
			$pos_payment_routes['value'],
			$pos_payment_routes['status']
		);
		$this->render_status_row(
			__( 'POS/payment route bootstrap', 'tcg-store-platform' ),
			$pos_payment_bootstrap['value'],
			$pos_payment_bootstrap['status']
		);
		$this->render_status_row(
			__( 'POS/payment route dependencies', 'tcg-store-platform' ),
			$pos_payment_dependencies['value'],
			$pos_payment_dependencies['status']
		);
		$this->render_status_row(
			__( 'Inventory route bootstrap', 'tcg-store-platform' ),
			$inventory_bootstrap['value'],
			$inventory_bootstrap['status']
		);
		$this->render_status_row(
			__( 'Inventory route dependencies', 'tcg-store-platform' ),
			$inventory_dependencies['value'],
			$inventory_dependencies['status']
		);

		echo '</tbody></table></div>';
	}
	private function render_feature_table(): void {
		echo '<h2>' . esc_html__( 'Modules', 'tcg-store-platform' ) . '</h2>';
		echo '<table class="widefat striped"><thead><tr><th>';
		echo esc_html__( 'Module', 'tcg-store-platform' );
		echo '</th><th>';
		echo esc_html__( 'Phase', 'tcg-store-platform' );
		echo '</th><th>';
		echo esc_html__( 'Status', 'tcg-store-platform' );
		echo '</th></tr></thead><tbody>';

		foreach ( FeatureFlagRegistry::definitions() as $flag => $definition ) {
			echo '<tr><td>' . esc_html( $definition['label'] ) . '</td>';
			echo '<td>' . esc_html( (string) $definition['phase'] ) . '</td>';
			echo '<td>' . esc_html( FeatureFlags::is_enabled( $flag ) ? 'enabled' : 'disabled' ) . '</td></tr>';
		}

		echo '</tbody></table>';
	}

	private function render_status_row( string $label, string $value, string $status ): void {
		echo '<tr><th scope="row">' . esc_html( $label ) . '</th>';
		echo '<td>' . esc_html( $value ) . '</td>';
		echo '<td>' . esc_html( $status ) . '</td></tr>';
	}

	/**
	 * @param list<array{label:string,value:string,status:string,notes:string}> $rows Workspace rows.
	 */
	private function render_workspace_table( array $rows ): void {
		echo '<table class="widefat striped"><thead><tr><th>';
		echo esc_html__( 'Label', 'tcg-store-platform' );
		echo '</th><th>';
		echo esc_html__( 'Value', 'tcg-store-platform' );
		echo '</th><th>';
		echo esc_html__( 'Status', 'tcg-store-platform' );
		echo '</th><th>';
		echo esc_html__( 'Notes', 'tcg-store-platform' );
		echo '</th></tr></thead><tbody>';

		foreach ( $rows as $row ) {
			$this->render_workspace_row( $row );
		}

		echo '</tbody></table>';
	}

	/**
	 * @param array{label:string,value:string,status:string,notes:string} $row Workspace row.
	 */
	private function render_workspace_row( array $row ): void {
		echo '<tr><th scope="row">' . esc_html( $row['label'] ) . '</th>';
		echo '<td>' . esc_html( $row['value'] ) . '</td>';
		echo '<td>' . esc_html( $row['status'] ) . '</td>';
		echo '<td>' . esc_html( $row['notes'] ) . '</td></tr>';
	}
}
