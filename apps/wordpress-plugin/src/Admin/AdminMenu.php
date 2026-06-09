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
use TCGStorePlatform\Api\V1\OfflineConnectorManifestPlanner;
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
use TCGStorePlatform\Settings\ScryDexScheduleSettings;
use TCGStorePlatform\Settings\ScryDexUsageBudgetSettings;
use TCGStorePlatform\Settings\Settings;
use TCGStorePlatform\ScryDex\ScryDexProviderFactory;
use TCGStorePlatform\ScryDex\ScryDexScheduledRefreshPlanner;
use TCGStorePlatform\Square\SquareInventoryBatchSyncReadinessPlanner;
use TCGStorePlatform\Square\SquareInventorySyncReadinessPlanner;
use TCGStorePlatform\Square\WooCommerceSquareExtensionStatus;
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
		$branding = BrandingSettings::from_settings( Settings::all() );

		add_menu_page(
			(string) $branding['company_name'],
			(string) $branding['company_short_name'],
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
			__( 'ScryDex Catalog', 'tcg-store-platform' ),
			__( 'ScryDex Catalog', 'tcg-store-platform' ),
			'edit_inventory',
			'tcg-store-platform-scrydex-catalog',
			array( $this, 'render_scrydex_catalog' )
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
		$search_panel       = $workspace->search_panel(
			$bootstrap_payload,
			$dependency_payload,
			$this->inventory_search_query()
		);
		$square_mapping     = $workspace->square_mapping_panel( $search_panel );
		$lookup_panel       = $workspace->lookup_panel(
			$bootstrap_payload,
			$dependency_payload,
			$this->inventory_lookup_query()
		);
		$intake_panel       = $workspace->intake_panel(
			$bootstrap_payload,
			$dependency_payload
		);

		echo '<div class="wrap"><h1>';
		echo esc_html__( 'Inventory Workspace', 'tcg-store-platform' );
		echo '</h1>';

		echo '<h2>' . esc_html__( 'Staff Search', 'tcg-store-platform' ) . '</h2>';
		$this->render_inventory_search_panel( $search_panel );

		echo '<h2>' . esc_html__( 'Square POS Mapping', 'tcg-store-platform' ) . '</h2>';
		$this->render_square_mapping_panel( $square_mapping );

		echo '<h2>' . esc_html__( 'Card Lookup', 'tcg-store-platform' ) . '</h2>';
		$this->render_inventory_lookup_panel( $lookup_panel );

		echo '<h2>' . esc_html__( 'Staff Intake', 'tcg-store-platform' ) . '</h2>';
		$this->render_inventory_intake_panel( $intake_panel );

		echo '<h2>' . esc_html__( 'Readiness', 'tcg-store-platform' ) . '</h2>';
		$this->render_workspace_table( $workspace->readiness_rows( $bootstrap_payload, $dependency_payload ) );

		echo '<h2>' . esc_html__( 'Route Contracts', 'tcg-store-platform' ) . '</h2>';
		$this->render_workspace_table( $workspace->route_rows( $bootstrap_payload ) );

		echo '<h2>' . esc_html__( 'Checkpoints', 'tcg-store-platform' ) . '</h2>';
		$this->render_workspace_table( $workspace->checkpoint_rows( $dependency_payload ) );

		echo '</div>';
	}

	public function render_scrydex_catalog(): void {
		if ( ! current_user_can( 'edit_inventory' ) && ! current_user_can( 'manage_settings' ) ) {
			wp_die( esc_html__( 'You do not have permission to view the ScryDex catalog.', 'tcg-store-platform' ) );
		}

		$can_index       = current_user_can( 'manage_settings' );
		$status_endpoint = rest_url( 'tcg-store/v1/scrydex/catalog/status' );
		$index_endpoint  = rest_url( 'tcg-store/v1/scrydex/catalog/index' );
		$export_endpoint = rest_url( 'tcg-store/v1/scrydex/catalog/export' );
		$schedule        = ScryDexScheduleSettings::from_settings( Settings::all() );
		$game_options    = $this->scrydex_catalog_game_options( $schedule['game_keys'] ?? array() );

		echo '<div class="wrap"><h1>';
		echo esc_html__( 'ScryDex Catalog', 'tcg-store-platform' );
		echo '</h1>';

		echo '<div id="tcg-store-scrydex-catalog-status" data-endpoint="';
		echo esc_url( $status_endpoint );
		echo '" data-nonce="' . esc_attr( wp_create_nonce( 'wp_rest' ) ) . '">';
		echo '<p>' . esc_html__( 'Loading catalog status...', 'tcg-store-platform' ) . '</p>';
		echo '</div>';

		echo '<h2>' . esc_html__( 'Full Game Index', 'tcg-store-platform' ) . '</h2>';
		echo '<form id="tcg-store-scrydex-catalog-import-form" method="post" action="';
		echo esc_url( $index_endpoint );
		echo '">';
		echo '<table class="form-table" role="presentation"><tbody>';
		$this->render_scrydex_catalog_game_checkboxes( $game_options );
		$this->render_scrydex_catalog_text_input( 'expansion_id', __( 'Expansion ID', 'tcg-store-platform' ), '', 'Optional single expansion; leave blank for full game' );
		$this->render_scrydex_catalog_number_input( 'page_size', __( 'Page size', 'tcg-store-platform' ), 100, 1, 100 );
		echo '<tr><th scope="row">' . esc_html__( 'Expansion index', 'tcg-store-platform' ) . '</th><td><label>';
		echo '<input type="checkbox" name="index_expansions" value="1" checked="checked" /> ';
		echo esc_html__( 'Pull expansions first, then index cards by expansion automatically until each page returns fewer than 100 rows.', 'tcg-store-platform' );
		echo '</label></td></tr>';
		echo '<tr><th scope="row">' . esc_html__( 'Database writes', 'tcg-store-platform' ) . '</th><td><label>';
		echo '<input type="checkbox" name="execute_database_writes" value="1" checked="checked" /> ';
		echo esc_html__( 'Write imported rows to the website catalog database.', 'tcg-store-platform' );
		echo '</label></td></tr>';
		echo '</tbody></table>';
		submit_button( __( 'Start Full ScryDex Index', 'tcg-store-platform' ), 'primary', 'submit', false, $can_index ? array() : array( 'disabled' => 'disabled' ) );
		echo '</form>';

		echo '<div id="tcg-store-scrydex-catalog-import-result" data-endpoint="';
		echo esc_url( $index_endpoint );
		echo '" data-status-endpoint="' . esc_url( $status_endpoint );
		echo '" data-export-endpoint="' . esc_url( $export_endpoint );
		echo '" data-nonce="' . esc_attr( wp_create_nonce( 'wp_rest' ) );
		echo '" data-can-index="' . esc_attr( $can_index ? '1' : '0' ) . '">';
		echo '<p>';
		echo esc_html(
			$can_index
				? __( 'Batch results will appear here.', 'tcg-store-platform' )
				: __( 'Manager settings access is required to run catalog imports.', 'tcg-store-platform' )
		);
		echo '</p></div>';

		echo '<h2>' . esc_html__( 'Catalog Export', 'tcg-store-platform' ) . '</h2>';
		echo '<p>' . esc_html__( 'Use the REST export endpoint for paginated JSON exports of reference sets, cards, variants, prices, and checkpoints.', 'tcg-store-platform' ) . '</p>';
		echo '<div id="tcg-store-scrydex-catalog-browser" data-export-endpoint="';
		echo esc_url( $export_endpoint );
		echo '" data-nonce="' . esc_attr( wp_create_nonce( 'wp_rest' ) ) . '">';
		echo '<p>' . esc_html__( 'Loading catalog browser...', 'tcg-store-platform' ) . '</p>';
		echo '</div>';

		$this->render_scrydex_catalog_script();
		echo '</div>';
	}

	public function render_settings(): void {
		if ( ! current_user_can( 'manage_settings' ) ) {
			wp_die( esc_html__( 'You do not have permission to manage platform settings.', 'tcg-store-platform' ) );
		}

		echo '<div class="wrap"><h1>';
		echo esc_html(
			sprintf(
				/* translators: %s: configured company name. */
				__( '%s Settings', 'tcg-store-platform' ),
				(string) BrandingSettings::from_settings( Settings::all() )['company_name']
			)
		);
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
		$offline_connector          = ( new OfflineConnectorManifestPlanner() )->admin_summary( Settings::all() );
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
		$woocommerce_square         = ( new WooCommerceSquareExtensionStatus() )->admin_summary();
		$square_inventory_sync      = ( new SquareInventorySyncReadinessPlanner() )->admin_summary();
		$square_inventory_batch     = ( new SquareInventoryBatchSyncReadinessPlanner() )->admin_summary();
		$inventory_factory          = InventoryRouteDependencyFactory::from_settings( Settings::all() );
		$inventory_bootstrap        = $inventory_factory->bootstrap_status_presenter()->admin_summary(
			FeatureFlags::is_enabled( 'inventory_pricing' )
		);
		$inventory_dependencies     = ( new InventoryRouteDependencyStatusPresenter(
			$inventory_factory
		) )->admin_summary();
		$scrydex                    = ( new ScryDexProviderFactory( Settings::all() ) )->admin_summary();
		$scrydex_budget             = ScryDexUsageBudgetSettings::admin_summary( Settings::all() );
		$scrydex_schedule           = ScryDexScheduleSettings::admin_summary( Settings::all() );
		$scrydex_scheduled_refresh  = ( new ScryDexScheduledRefreshPlanner() )->admin_summary(
			Settings::all(),
			FeatureFlags::is_enabled( 'scrydex_sync' ),
			$this->environment_type(),
			$this->database_prefix()
		);
		echo '<div class="wrap"><h1>';
		echo esc_html(
			sprintf(
				/* translators: %s: configured company name. */
				__( '%s System Status', 'tcg-store-platform' ),
				(string) $branding['company']['name']
			)
		);
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
			__( 'WooCommerce Square extension', 'tcg-store-platform' ),
			$woocommerce_square['value'],
			$woocommerce_square['status']
		);
		$this->render_status_row(
			__( 'Square inventory sync', 'tcg-store-platform' ),
			$square_inventory_sync['value'],
			$square_inventory_sync['status']
		);
		$this->render_status_row(
			__( 'Square inventory batch sync', 'tcg-store-platform' ),
			$square_inventory_batch['value'],
			$square_inventory_batch['status']
		);
		$this->render_status_row(
			__( 'Branding profile', 'tcg-store-platform' ),
			(string) $branding['company']['name'],
			'configured'
		);
		$this->render_status_row(
			__( 'ScryDex provider', 'tcg-store-platform' ),
			$scrydex['value'],
			$scrydex['status']
		);
		$this->render_status_row(
			__( 'ScryDex usage budget', 'tcg-store-platform' ),
			$scrydex_budget['value'],
			$scrydex_budget['status']
		);
		$this->render_status_row(
			__( 'ScryDex daily refresh settings', 'tcg-store-platform' ),
			$scrydex_schedule['value'],
			$scrydex_schedule['status']
		);
		$this->render_status_row(
			__( 'ScryDex daily refresh plan', 'tcg-store-platform' ),
			$scrydex_scheduled_refresh['value'],
			$scrydex_scheduled_refresh['status']
		);
		$this->render_status_row(
			__( 'Offline route bootstrap', 'tcg-store-platform' ),
			$offline['value'],
			$offline['status']
		);
		$this->render_status_row(
			__( 'Offline connector manifest', 'tcg-store-platform' ),
			$offline_connector['value'],
			$offline_connector['status']
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
			$module_state = FeatureFlags::is_available( $flag )
				? ( FeatureFlags::is_enabled( $flag ) ? 'enabled' : 'disabled' )
				: 'unavailable';

			echo '<tr><td>' . esc_html( $definition['label'] ) . '</td>';
			echo '<td>' . esc_html( (string) $definition['phase'] ) . '</td>';
			echo '<td>' . esc_html( $module_state ) . '</td></tr>';
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

	/**
	 * @return array<string, mixed>
	 */
	private function inventory_search_query(): array {
		$source = is_array( $_GET ) ? wp_unslash( $_GET ) : array(); // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		return array(
			'q'         => $source['q'] ?? '',
			'game'      => $source['game'] ?? '',
			'status'    => $source['status'] ?? '',
			'sort'      => $source['sort'] ?? '',
			'page_size' => $source['page_size'] ?? '',
		);
	}

	private function inventory_lookup_query(): array {
		$source = is_array( $_GET ) ? wp_unslash( $_GET ) : array(); // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		return array(
			'q'         => $source['lookup_q'] ?? '',
			'game'      => $source['lookup_game'] ?? 'pokemon',
			'page_size' => $source['lookup_page_size'] ?? 12,
		);
	}

	/**
	 * @param array<string, mixed> $panel Search panel model.
	 */
	private function render_inventory_search_panel( array $panel ): void {
		$query          = is_array( $panel['query'] ?? null ) ? $panel['query'] : array();
		$ready          = true === ( $panel['ready'] ?? false );
		$endpoint       = rest_url( ltrim( (string) ( $panel['endpoint_path'] ?? '' ), '/' ) );
		$status_options = is_array( $panel['status_options'] ?? null ) ? $panel['status_options'] : array();
		$sort_options   = is_array( $panel['sort_options'] ?? null ) ? $panel['sort_options'] : array();
		$page_sizes     = is_array( $panel['page_sizes'] ?? null ) ? $panel['page_sizes'] : array();

		echo '<div class="notice notice-' . esc_attr( $ready ? 'success' : 'warning' ) . ' inline"><p><strong>';
		echo esc_html( (string) ( $panel['status_label'] ?? '' ) );
		echo '</strong> ';
		echo esc_html( (string) ( $panel['notes'] ?? '' ) );
		echo '</p></div>';

		echo '<form id="tcg-store-inventory-search-form" class="tcg-store-inventory-search" method="get" action="';
		echo esc_url( admin_url( 'admin.php' ) );
		echo '">';
		echo '<input type="hidden" name="page" value="tcg-store-platform-inventory" />';
		echo '<input type="hidden" name="inventory_search" value="1" />';
		echo '<table class="form-table" role="presentation"><tbody><tr>';
		echo '<th scope="row"><label for="tcg-store-inventory-q">' . esc_html__( 'Card search', 'tcg-store-platform' ) . '</label></th>';
		echo '<td><input type="search" class="regular-text" id="tcg-store-inventory-q" name="q" value="';
		echo esc_attr( (string) ( $query['q'] ?? '' ) );
		echo '" placeholder="' . esc_attr__( 'Name, set, barcode, SKU, or cert', 'tcg-store-platform' ) . '" /></td></tr>';
		echo '<tr><th scope="row"><label for="tcg-store-inventory-game">' . esc_html__( 'Game', 'tcg-store-platform' ) . '</label></th>';
		echo '<td><input type="text" id="tcg-store-inventory-game" name="game" value="';
		echo esc_attr( (string) ( $query['game'] ?? '' ) );
		echo '" placeholder="' . esc_attr__( 'pokemon, magic, lorcana', 'tcg-store-platform' ) . '" /></td></tr>';
		echo '<tr><th scope="row"><label for="tcg-store-inventory-status">' . esc_html__( 'Status', 'tcg-store-platform' ) . '</label></th><td>';
		echo '<select id="tcg-store-inventory-status" name="status">';
		foreach ( $status_options as $status ) {
			$status = (string) $status;
			echo '<option value="' . esc_attr( $status ) . '" ' . selected( (string) ( $query['status'] ?? '' ), $status, false ) . '>';
			echo esc_html( '' === $status ? __( 'Any status', 'tcg-store-platform' ) : ucwords( str_replace( '_', ' ', $status ) ) );
			echo '</option>';
		}
		echo '</select></td></tr>';
		echo '<tr><th scope="row"><label for="tcg-store-inventory-sort">' . esc_html__( 'Sort', 'tcg-store-platform' ) . '</label></th><td>';
		echo '<select id="tcg-store-inventory-sort" name="sort">';
		foreach ( $sort_options as $sort ) {
			$sort = (string) $sort;
			echo '<option value="' . esc_attr( $sort ) . '" ' . selected( (string) ( $query['sort'] ?? '' ), $sort, false ) . '>';
			echo esc_html( ucwords( str_replace( '_', ' ', $sort ) ) );
			echo '</option>';
		}
		echo '</select> ';
		echo '<select id="tcg-store-inventory-page-size" name="page_size" aria-label="' . esc_attr__( 'Rows per page', 'tcg-store-platform' ) . '">';
		foreach ( $page_sizes as $page_size ) {
			$page_size = (int) $page_size;
			echo '<option value="' . esc_attr( (string) $page_size ) . '" ' . selected( (int) ( $query['page_size'] ?? 25 ), $page_size, false ) . '>';
			/* translators: %d: number of inventory rows to show per page. */
			echo esc_html( sprintf( __( '%d rows', 'tcg-store-platform' ), $page_size ) );
			echo '</option>';
		}
		echo '</select></td></tr></tbody></table>';
		submit_button( __( 'Search Inventory', 'tcg-store-platform' ), 'primary', 'submit', false, $ready ? array() : array( 'disabled' => 'disabled' ) );
		echo '</form>';

		echo '<div id="tcg-store-inventory-search-results" data-ready="' . esc_attr( $ready ? '1' : '0' ) . '" data-endpoint="';
		echo esc_url( $endpoint );
		echo '" data-nonce="' . esc_attr( wp_create_nonce( 'wp_rest' ) ) . '">';
		echo '<p>' . esc_html__( 'Results will appear here after a staff search runs.', 'tcg-store-platform' ) . '</p>';
		echo '</div>';

		if ( $ready ) {
			$this->render_inventory_search_script();
		}
	}

	/**
	 * @param array<string, mixed> $panel Square mapping panel model.
	 */
	private function render_square_mapping_panel( array $panel ): void {
		$ready   = true === ( $panel['ready'] ?? false );
		$summary = is_array( $panel['summary'] ?? null ) ? $panel['summary'] : array();

		echo '<div class="notice notice-' . esc_attr( $ready ? 'info' : 'warning' ) . ' inline"><p><strong>';
		echo esc_html( (string) ( $panel['status_label'] ?? '' ) );
		echo '</strong> ';
		echo esc_html( (string) ( $panel['notes'] ?? '' ) );
		echo '</p></div>';

		echo '<div id="tcg-store-square-mapping-readiness" class="tcg-store-square-mapping-readiness" data-ready="';
		echo esc_attr( $ready ? '1' : '0' );
		echo '" data-summary="';
		echo esc_attr( wp_json_encode( $summary ) ?: '{}' );
		echo '">';
		echo '<p>';
		echo esc_html__( 'Run a staff inventory search to review Square POS-visible mappings, duplicate barcode/SKU values, and rows that need Square variation IDs.', 'tcg-store-platform' );
		echo '</p>';
		echo '</div>';
	}

	/**
	 * @param array<string, mixed> $panel Card lookup panel model.
	 */
	private function render_inventory_lookup_panel( array $panel ): void {
		$query             = is_array( $panel['query'] ?? null ) ? $panel['query'] : array();
		$ready             = true === ( $panel['ready'] ?? false );
		$endpoint          = rest_url( ltrim( (string) ( $panel['endpoint_path'] ?? '' ), '/' ) );
		$page_sizes        = is_array( $panel['page_sizes'] ?? null ) ? $panel['page_sizes'] : array();
		$condition_options = is_array( $panel['condition_options'] ?? null ) ? $panel['condition_options'] : array();

		echo '<div class="notice notice-' . esc_attr( $ready ? 'success' : 'warning' ) . ' inline"><p><strong>';
		echo esc_html( (string) ( $panel['status_label'] ?? '' ) );
		echo '</strong> ';
		echo esc_html( (string) ( $panel['notes'] ?? '' ) );
		echo '</p></div>';

		echo '<form id="tcg-store-inventory-lookup-form" class="tcg-store-inventory-lookup" method="get" action="';
		echo esc_url( admin_url( 'admin.php' ) );
		echo '">';
		echo '<input type="hidden" name="page" value="tcg-store-platform-inventory" />';
		echo '<input type="hidden" name="card_lookup" value="1" />';
		echo '<table class="form-table" role="presentation"><tbody><tr>';
		echo '<th scope="row"><label for="tcg-store-lookup-q">' . esc_html__( 'Lookup card', 'tcg-store-platform' ) . '</label></th>';
		echo '<td><input type="search" class="regular-text" id="tcg-store-lookup-q" name="lookup_q" value="';
		echo esc_attr( (string) ( $query['q'] ?? '' ) );
		echo '" placeholder="' . esc_attr__( 'Card name, set, or number', 'tcg-store-platform' ) . '" required="required" /></td></tr>';
		echo '<tr><th scope="row"><label for="tcg-store-lookup-game">' . esc_html__( 'Game', 'tcg-store-platform' ) . '</label></th>';
		echo '<td><input type="text" id="tcg-store-lookup-game" name="lookup_game" value="';
		echo esc_attr( (string) ( $query['game'] ?? 'pokemon' ) );
		echo '" placeholder="' . esc_attr__( 'pokemon, magic, lorcana', 'tcg-store-platform' ) . '" /></td></tr>';
		echo '<tr><th scope="row"><label for="tcg-store-lookup-page-size">' . esc_html__( 'Results', 'tcg-store-platform' ) . '</label></th><td>';
		echo '<select id="tcg-store-lookup-page-size" name="lookup_page_size">';
		foreach ( $page_sizes as $page_size ) {
			$page_size = (int) $page_size;
			echo '<option value="' . esc_attr( (string) $page_size ) . '" ' . selected( (int) ( $query['page_size'] ?? 12 ), $page_size, false ) . '>';
			/* translators: %d: number of lookup results to show. */
			echo esc_html( sprintf( __( '%d cards', 'tcg-store-platform' ), $page_size ) );
			echo '</option>';
		}
		echo '</select></td></tr></tbody></table>';
		submit_button( __( 'Lookup Cards', 'tcg-store-platform' ), 'primary', 'submit', false, $ready ? array() : array( 'disabled' => 'disabled' ) );
		echo '</form>';

		echo '<div id="tcg-store-inventory-lookup-results" data-ready="' . esc_attr( $ready ? '1' : '0' ) . '" data-endpoint="';
		echo esc_url( $endpoint );
		echo '" data-nonce="' . esc_attr( wp_create_nonce( 'wp_rest' ) );
		echo '" data-condition-options="' . esc_attr( (string) wp_json_encode( array_values( $condition_options ) ) ) . '">';
		echo '<p>' . esc_html__( 'Card lookup results will appear here with image, set, number, stock, and price context.', 'tcg-store-platform' ) . '</p>';
		echo '</div>';

		if ( $ready ) {
			$this->render_inventory_lookup_script();
		}
	}

	/**
	 * @param array<string, mixed> $panel Intake panel model.
	 */
	private function render_inventory_intake_panel( array $panel ): void {
		$form               = is_array( $panel['form'] ?? null ) ? $panel['form'] : array();
		$route_ready        = true === ( $panel['ready'] ?? false );
		$can_create         = current_user_can( 'create_inventory' );
		$ready              = $route_ready && $can_create;
		$endpoint           = rest_url( ltrim( (string) ( $panel['endpoint_path'] ?? '' ), '/' ) );
		$status_options     = is_array( $panel['status_options'] ?? null ) ? $panel['status_options'] : array();
		$condition_options  = is_array( $panel['condition_options'] ?? null ) ? $panel['condition_options'] : array();
		$raw_options        = is_array( $panel['raw_or_graded_options'] ?? null ) ? $panel['raw_or_graded_options'] : array();
		$visibility_options = is_array( $panel['visibility_options'] ?? null ) ? $panel['visibility_options'] : array();
		$notice_type        = $ready ? 'success' : 'warning';
		$notes              = $can_create
			? (string) ( $panel['notes'] ?? '' )
			: __( 'create_inventory capability required', 'tcg-store-platform' );

		echo '<div class="notice notice-' . esc_attr( $notice_type ) . ' inline"><p><strong>';
		echo esc_html( (string) ( $panel['status_label'] ?? '' ) );
		echo '</strong> ';
		echo esc_html( $notes );
		echo '</p></div>';

		echo '<form id="tcg-store-inventory-intake-form" class="tcg-store-inventory-intake" method="post" action="';
		echo esc_url( $endpoint );
		echo '">';
		echo '<input type="hidden" name="source" value="staff" />';
		echo '<input type="hidden" name="actor_user_id" value="' . esc_attr( (string) get_current_user_id() ) . '" />';
		$this->render_inventory_intake_hidden_input( $form, 'provider_name' );
		$this->render_inventory_intake_hidden_input( $form, 'provider_card_id' );
		$this->render_inventory_intake_hidden_input( $form, 'reference_card_id' );
		$this->render_inventory_intake_hidden_input( $form, 'reference_variant_id' );
		$this->render_inventory_intake_hidden_input( $form, 'market_price_minor_units' );
		echo '<table class="form-table" role="presentation"><tbody>';
		$this->render_inventory_intake_text_input( $form, 'game', __( 'Game', 'tcg-store-platform' ), 'pokemon', true );
		$this->render_inventory_intake_text_input( $form, 'card_name', __( 'Card name', 'tcg-store-platform' ), 'Bulbasaur', true );
		$this->render_inventory_intake_text_input( $form, 'set_name', __( 'Set name', 'tcg-store-platform' ), 'Base Set', false );
		$this->render_inventory_intake_text_input( $form, 'set_code', __( 'Set code', 'tcg-store-platform' ), 'BASE', false );
		$this->render_inventory_intake_text_input( $form, 'card_number', __( 'Card number', 'tcg-store-platform' ), '44', false );
		$this->render_inventory_intake_text_input( $form, 'printed_number', __( 'Printed number', 'tcg-store-platform' ), '44/102', false );
		$this->render_inventory_intake_text_input( $form, 'front_image_remote_url', __( 'Front image URL', 'tcg-store-platform' ), 'https://images.example.test/card-front.png', false, 'url' );
		$this->render_inventory_intake_text_input( $form, 'back_image_remote_url', __( 'Back image URL', 'tcg-store-platform' ), 'https://images.example.test/card-back.png', false, 'url' );
		$this->render_inventory_intake_text_input( $form, 'barcode', __( 'Barcode', 'tcg-store-platform' ), 'PUG-PKM-BASE-044', true );
		$this->render_inventory_intake_text_input( $form, 'sku', __( 'SKU', 'tcg-store-platform' ), 'PUG-PKM-BASE-044', false );
		$this->render_inventory_intake_text_input( $form, 'location_id', __( 'Location ID', 'tcg-store-platform' ), '1', true, 'number' );
		$this->render_inventory_intake_text_input( $form, 'sale_currency', __( 'Currency', 'tcg-store-platform' ), 'USD', true );
		$this->render_inventory_intake_text_input( $form, 'minimum_sale_price_minor_units', __( 'Minimum price cents', 'tcg-store-platform' ), '100', true, 'number' );
		$this->render_inventory_intake_text_input( $form, 'sale_price_minor_units', __( 'Sale price cents', 'tcg-store-platform' ), '250', true, 'number' );
		$this->render_inventory_intake_text_input( $form, 'intake_quantity', __( 'Quantity to add', 'tcg-store-platform' ), '1', true, 'number' );
		$this->render_inventory_intake_select( $form, 'status', __( 'Status', 'tcg-store-platform' ), $status_options );
		$this->render_inventory_intake_select( $form, 'raw_or_graded', __( 'Raw or graded', 'tcg-store-platform' ), $raw_options );
		$this->render_inventory_intake_select( $form, 'condition_code', __( 'Condition', 'tcg-store-platform' ), $condition_options );
		$this->render_inventory_intake_select( $form, 'online_visibility', __( 'Online visibility', 'tcg-store-platform' ), $visibility_options );
		$this->render_inventory_intake_select( $form, 'kiosk_visibility', __( 'Kiosk visibility', 'tcg-store-platform' ), $visibility_options );
		$this->render_inventory_intake_select( $form, 'pos_visibility', __( 'POS visibility', 'tcg-store-platform' ), $visibility_options );
		echo '<tr><th scope="row">' . esc_html__( 'WooCommerce sync', 'tcg-store-platform' ) . '</th><td>';
		echo '<label><input type="checkbox" id="tcg-store-intake-sync-woocommerce" name="sync_woocommerce_product" value="1" /> ';
		echo esc_html__( 'Create or update the WooCommerce product now', 'tcg-store-platform' );
		echo '</label><input type="hidden" name="production_write_approval" value="woocommerce-product-sync" />';
		echo '<p class="description">' . esc_html__( 'Payments still stay with the official WooCommerce Square extension; this only syncs product and stock data.', 'tcg-store-platform' ) . '</p>';
		echo '</td></tr>';
		echo '</tbody></table>';
		submit_button( __( 'Create Inventory Item', 'tcg-store-platform' ), 'primary', 'submit', false, $ready ? array() : array( 'disabled' => 'disabled' ) );
		echo '</form>';

		echo '<div id="tcg-store-inventory-intake-result" data-ready="' . esc_attr( $ready ? '1' : '0' ) . '" data-endpoint="';
		echo esc_url( $endpoint );
		echo '" data-nonce="' . esc_attr( wp_create_nonce( 'wp_rest' ) ) . '">';
		echo '<p>' . esc_html__( 'Created inventory items will appear here.', 'tcg-store-platform' ) . '</p>';
		echo '</div>';

		if ( $ready ) {
			$this->render_inventory_intake_script();
		}
	}

	/**
	 * @param array<string, mixed> $form Intake form values.
	 */
	private function render_inventory_intake_text_input(
		array $form,
		string $name,
		string $label,
		string $placeholder,
		bool $required,
		string $type = 'text'
	): void {
		echo '<tr><th scope="row"><label for="tcg-store-intake-' . esc_attr( $name ) . '">';
		echo esc_html( $label );
		echo '</label></th><td><input type="' . esc_attr( $type ) . '" class="regular-text" id="tcg-store-intake-' . esc_attr( $name ) . '" name="' . esc_attr( $name ) . '" value="';
		echo esc_attr( (string) ( $form[ $name ] ?? '' ) );
		echo '" placeholder="' . esc_attr( $placeholder ) . '"';
		echo $required ? ' required="required"' : '';
		echo ' /></td></tr>';
	}

	/**
	 * @param array<string, mixed> $form Intake form values.
	 */
	private function render_inventory_intake_hidden_input( array $form, string $name ): void {
		echo '<input type="hidden" id="tcg-store-intake-' . esc_attr( $name ) . '" name="' . esc_attr( $name ) . '" value="';
		echo esc_attr( (string) ( $form[ $name ] ?? '' ) );
		echo '" />';
	}

	/**
	 * @param array<string, mixed> $form Intake form values.
	 * @param list<string>         $options Select options.
	 */
	private function render_inventory_intake_select( array $form, string $name, string $label, array $options ): void {
		echo '<tr><th scope="row"><label for="tcg-store-intake-' . esc_attr( $name ) . '">';
		echo esc_html( $label );
		echo '</label></th><td><select id="tcg-store-intake-' . esc_attr( $name ) . '" name="' . esc_attr( $name ) . '">';
		foreach ( $options as $option ) {
			$option = (string) $option;
			echo '<option value="' . esc_attr( $option ) . '" ' . selected( (string) ( $form[ $name ] ?? '' ), $option, false ) . '>';
			echo esc_html( ucwords( str_replace( '_', ' ', $option ) ) );
			echo '</option>';
		}
		echo '</select></td></tr>';
	}

	/**
	 * @param list<string> $configured_games Saved ScryDex game keys.
	 * @return array<string, array{label:string,checked:bool}>
	 */
	private function scrydex_catalog_game_options( array $configured_games ): array {
		$configured_games = array_values(
			array_filter(
				array_map(
					static function ( mixed $game ): string {
						$game = strtolower( trim( (string) $game ) );
						$game = preg_replace( '/[^a-z0-9_-]+/', '-', $game ) ?? '';

						return trim( $game, '-' );
					},
					$configured_games
				),
				static fn ( string $game ): bool => '' !== $game
			)
		);
		$configured_games = array_values( array_unique( $configured_games ) );
		$defaults         = array(
			'pokemon'              => __( 'Pokemon', 'tcg-store-platform' ),
			'magicthegathering'    => __( 'Magic: The Gathering', 'tcg-store-platform' ),
			'lorcana'              => __( 'Lorcana', 'tcg-store-platform' ),
			'onepiece'             => __( 'One Piece', 'tcg-store-platform' ),
			'gundam'               => __( 'Gundam', 'tcg-store-platform' ),
			'yugioh'               => __( 'Yu-Gi-Oh!', 'tcg-store-platform' ),
			'riftbound'            => __( 'Riftbound', 'tcg-store-platform' ),
		);
		$options          = array();
		$checked_games    = array() === $configured_games ? array( 'pokemon' ) : $configured_games;

		foreach ( array_values( array_unique( array_merge( array_keys( $defaults ), $configured_games ) ) ) as $game ) {
			$options[ $game ] = array(
				'label'   => $defaults[ $game ] ?? ucwords( str_replace( '-', ' ', $game ) ),
				'checked' => in_array( $game, $checked_games, true ),
			);
		}

		return $options;
	}

	/**
	 * @param array<string, array{label:string,checked:bool}> $options Game options.
	 */
	private function render_scrydex_catalog_game_checkboxes( array $options ): void {
		echo '<tr><th scope="row">' . esc_html__( 'Games', 'tcg-store-platform' ) . '</th><td><fieldset>';
		foreach ( $options as $game => $option ) {
			echo '<label style="display:inline-block;margin:0 16px 8px 0;">';
			echo '<input type="checkbox" name="games[]" value="' . esc_attr( $game ) . '" ' . checked( true, (bool) $option['checked'], false ) . ' /> ';
			echo esc_html( $option['label'] );
			echo '</label>';
		}
		echo '<p class="description">' . esc_html__( 'Selected games run in parallel. Add or remove game keys in ScryDex schedule settings.', 'tcg-store-platform' ) . '</p>';
		echo '</fieldset></td></tr>';
	}

	private function render_scrydex_catalog_text_input( string $name, string $label, string $value, string $placeholder ): void {
		echo '<tr><th scope="row"><label for="tcg-store-scrydex-catalog-' . esc_attr( $name ) . '">';
		echo esc_html( $label );
		echo '</label></th><td><input type="text" class="regular-text" id="tcg-store-scrydex-catalog-' . esc_attr( $name ) . '" name="' . esc_attr( $name ) . '" value="';
		echo esc_attr( $value );
		echo '" placeholder="' . esc_attr( $placeholder ) . '" /></td></tr>';
	}

	private function render_scrydex_catalog_number_input( string $name, string $label, int $value, int $min, int $max ): void {
		echo '<tr><th scope="row"><label for="tcg-store-scrydex-catalog-' . esc_attr( $name ) . '">';
		echo esc_html( $label );
		echo '</label></th><td><input type="number" id="tcg-store-scrydex-catalog-' . esc_attr( $name ) . '" name="' . esc_attr( $name ) . '" value="';
		echo esc_attr( (string) $value );
		echo '" min="' . esc_attr( (string) $min ) . '" max="' . esc_attr( (string) $max ) . '" /></td></tr>';
	}

	private function database_prefix(): string {
		global $wpdb;

		if ( is_object( $wpdb ) && isset( $wpdb->prefix ) ) {
			return (string) $wpdb->prefix;
		}

		return '';
	}

	private function environment_type(): string {
		if ( function_exists( 'wp_get_environment_type' ) ) {
			return (string) wp_get_environment_type();
		}

		$environment_type = getenv( 'WP_ENVIRONMENT_TYPE' );

		return is_string( $environment_type ) && '' !== trim( $environment_type )
			? $environment_type
			: 'production';
	}

	private function render_inventory_search_script(): void {
		echo '<script>';
		echo '(function(){';
		echo 'const form=document.getElementById("tcg-store-inventory-search-form");';
		echo 'const target=document.getElementById("tcg-store-inventory-search-results");';
		echo 'if(!form||!target||target.dataset.ready!=="1"){return;}';
		echo 'const esc=function(value){return String(value===null||value===undefined?"":value).replace(/[&<>"' . "'" . ']/g,function(char){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","' . "'" . '":"&#039;"}[char];});};';
		echo 'const formatMoney=function(amount){const text=String(amount===null||amount===undefined?"":amount).trim();if(text===""){return "";}const value=Number(text);return Number.isFinite(value)?value.toFixed(2):text;};';
		echo 'const squareTarget=document.getElementById("tcg-store-square-mapping-readiness");';
		echo 'const scanIdentity=function(item){return String(item.sku||item.barcode||"").trim();};';
		echo 'const squareErrors=function(item,counts){const errors=[];const scan=scanIdentity(item);if(scan===""){errors.push("barcode_or_sku_required");}if(scan!==""&&counts[scan]>1){errors.push("duplicate_barcode_or_sku");}if(String(item.square_catalog_variation_id||"").trim()===""){errors.push("square_catalog_variation_id_required_for_inventory_pull");}return errors;};';
		echo 'const squareNextAction=function(errors){if(errors.indexOf("duplicate_barcode_or_sku")!==-1){return "' . esc_js( __( 'Assign a unique barcode/SKU before Square can match this row.', 'tcg-store-platform' ) ) . '";}if(errors.indexOf("square_catalog_variation_id_required_for_inventory_pull")!==-1){return "' . esc_js( __( 'Create or link a Square catalog variation for this website inventory row.', 'tcg-store-platform' ) ) . '";}if(errors.indexOf("barcode_or_sku_required")!==-1){return "' . esc_js( __( 'Add a barcode/SKU so Square POS can scan and reconcile the item.', 'tcg-store-platform' ) ) . '";}return "' . esc_js( __( 'Ready for Square count reconciliation; payment capture remains delegated.', 'tcg-store-platform' ) ) . '";};';
		echo 'const squareIssueLabels=function(errors){return errors.map(function(error){return error.replace(/_/g," ");}).join(", ");};';
		echo 'const squareMappingItem=function(item,errors){return {card:item.card_name||"",set:item.set_code||item.set_name||"",condition:item.condition_code||"",scan:scanIdentity(item),variation:item.square_catalog_variation_id||"",status:item.status||"",errors:errors,next:squareNextAction(errors)};};';
		echo 'const updateSquareMapping=function(items){if(!squareTarget||squareTarget.dataset.ready!=="1"){return;}const counts={};items.forEach(function(item){const scan=scanIdentity(item);if(scan!==""){counts[scan]=(counts[scan]||0)+1;}});const visible=items.filter(function(item){return String(item.pos_visibility||"hidden")==="visible";});const ready=[];const review=[];visible.forEach(function(item){const errors=squareErrors(item,counts);(errors.length?review:ready).push(squareMappingItem(item,errors));});const duplicateCount=Object.keys(counts).filter(function(key){return counts[key]>1;}).length;if(!items.length){squareTarget.innerHTML="<p>' . esc_js( __( 'Run a staff inventory search to review Square POS mappings.', 'tcg-store-platform' ) ) . '</p>";return;}const metrics="<table class=\"widefat striped\"><thead><tr><th>' . esc_js( __( 'POS visible', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Ready for Square', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Needs review', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Duplicate scans', 'tcg-store-platform' ) ) . '</th></tr></thead><tbody><tr><td>"+esc(visible.length)+"</td><td>"+esc(ready.length)+"</td><td>"+esc(review.length)+"</td><td>"+esc(duplicateCount)+"</td></tr></tbody></table>";const readyRows=ready.slice(0,10).map(function(item){return "<tr><td>"+esc(item.card)+"<br><span class=\"description\">"+esc(item.set)+" "+esc(item.condition)+"</span></td><td>"+esc(item.scan)+"</td><td><code>"+esc(item.variation)+"</code></td><td>"+esc(item.next)+"</td></tr>";}).join("");const reviewRows=review.slice(0,10).map(function(item){return "<tr><td>"+esc(item.card)+"<br><span class=\"description\">"+esc(item.set)+" "+esc(item.condition)+"</span></td><td>"+esc(item.scan)+"</td><td>"+esc(squareIssueLabels(item.errors))+"</td><td>"+esc(item.next)+"</td></tr>";}).join("");squareTarget.innerHTML="<p><strong>' . esc_js( __( 'Square inventory authority:', 'tcg-store-platform' ) ) . '</strong> tcg_store_platform. ' . esc_js( __( 'Square counts are reconciliation inputs only; payments remain delegated.', 'tcg-store-platform' ) ) . '</p>"+metrics+"<h3>' . esc_js( __( 'Ready Square pull feed', 'tcg-store-platform' ) ) . '</h3>"+(readyRows?"<table class=\"widefat striped\"><thead><tr><th>' . esc_js( __( 'Card', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Scan ID', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Square variation', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Action', 'tcg-store-platform' ) ) . '</th></tr></thead><tbody>"+readyRows+"</tbody></table>":"<p>' . esc_js( __( 'No mapped Square rows are ready in this search result.', 'tcg-store-platform' ) ) . '</p>")+"<h3>' . esc_js( __( 'POS mapping review', 'tcg-store-platform' ) ) . '</h3>"+(reviewRows?"<table class=\"widefat striped\"><thead><tr><th>' . esc_js( __( 'Card', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Scan ID', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Issue', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Next action', 'tcg-store-platform' ) ) . '</th></tr></thead><tbody>"+reviewRows+"</tbody></table>":"<p>' . esc_js( __( 'No POS-visible mapping issues in this search result.', 'tcg-store-platform' ) ) . '</p>");};';
		echo 'const render=function(payload){const items=((payload.data||{}).items)||[];const meta=((payload.data||{}).meta)||{};';
		echo 'updateSquareMapping(items);';
		echo 'if(!items.length){target.innerHTML="<p>' . esc_js( __( 'No matching inventory found.', 'tcg-store-platform' ) ) . '</p>";return;}';
		echo 'target.innerHTML="<p>"+esc(meta.total)+" ' . esc_js( __( 'matching items', 'tcg-store-platform' ) ) . '</p><table class=\"widefat striped\"><thead><tr><th>' . esc_js( __( 'Card', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Set', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Status', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Price', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'SKU', 'tcg-store-platform' ) ) . '</th></tr></thead><tbody>"+items.map(function(item){return "<tr><td>"+esc(item.card_name)+"</td><td>"+esc(item.set_code||item.set_name||"")+"</td><td>"+esc(item.status)+"</td><td>"+esc(formatMoney(item.sale_price))+" "+esc(item.sale_currency||"")+"</td><td>"+esc(item.sku||item.barcode||"")+"</td></tr>";}).join("")+"</tbody></table>";};';
		echo 'form.addEventListener("submit",function(event){event.preventDefault();const params=new URLSearchParams(new FormData(form));params.delete("page");params.delete("inventory_search");params.set("visibility","staff");target.innerHTML="<p>' . esc_js( __( 'Searching inventory...', 'tcg-store-platform' ) ) . '</p>";fetch(target.dataset.endpoint+"?"+params.toString(),{headers:{"X-WP-Nonce":target.dataset.nonce}}).then(function(response){return response.json().then(function(payload){return {ok:response.ok,payload:payload};});}).then(function(result){if(!result.ok){target.innerHTML="<p>' . esc_js( __( 'Inventory search failed.', 'tcg-store-platform' ) ) . '</p>";return;}render(result.payload);}).catch(function(){target.innerHTML="<p>' . esc_js( __( 'Inventory search failed.', 'tcg-store-platform' ) ) . '</p>";});});';
		echo 'if(new URLSearchParams(window.location.search).get("inventory_search")==="1"){form.dispatchEvent(new Event("submit",{cancelable:true}));}';
		echo '})();';
		echo '</script>';
	}

	private function render_inventory_lookup_script(): void {
		echo '<script>';
		echo '(function(){';
		echo 'const form=document.getElementById("tcg-store-inventory-lookup-form");';
		echo 'const target=document.getElementById("tcg-store-inventory-lookup-results");';
		echo 'const intake=document.getElementById("tcg-store-inventory-intake-form");';
		echo 'if(!form||!target||target.dataset.ready!=="1"){return;}';
		echo 'let cards=[];';
		echo 'const esc=function(value){return String(value===null||value===undefined?"":value).replace(/[&<>"' . "'" . ']/g,function(char){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","' . "'" . '":"&#039;"}[char];});};';
		echo 'const conditionOptions=function(){try{const parsed=JSON.parse(target.dataset.conditionOptions||"[]");return Array.isArray(parsed)&&parsed.length?parsed:["NM","LP","MP","HP","DMG"];}catch(error){return ["NM","LP","MP","HP","DMG"];}}();';
		echo 'const conditionSelect=function(){return "<select class=\"tcg-store-lookup-condition\" aria-label=\"' . esc_js( __( 'Condition', 'tcg-store-platform' ) ) . '\">"+conditionOptions.map(function(option){return "<option value=\""+esc(option)+"\">"+esc(option)+"</option>";}).join("")+"</select>";};';
		echo 'const variantText=function(variant){return [variant.variant,variant.finish,variant.parallel_name,variant.edition,variant.language].filter(Boolean).join(" / ");};';
		echo 'const variantSelect=function(card){const variants=Array.isArray(card.variants)?card.variants:[];if(!variants.length){return "<select class=\"tcg-store-lookup-variant\" aria-label=\"' . esc_js( __( 'Variant', 'tcg-store-platform' ) ) . '\"><option value=\"\">' . esc_js( __( 'Default version', 'tcg-store-platform' ) ) . '</option></select>";}return "<select class=\"tcg-store-lookup-variant\" aria-label=\"' . esc_js( __( 'Variant', 'tcg-store-platform' ) ) . '\">"+variants.map(function(variant,index){const label=variantText(variant)||variant.provider_variant_id||("' . esc_js( __( 'Version', 'tcg-store-platform' ) ) . ' "+(index+1));return "<option value=\""+esc(String(index))+"\">"+esc(label)+"</option>";}).join("")+"</select>";};';
		echo 'const selectedVariant=function(card,value){const variants=Array.isArray(card.variants)?card.variants:[];const index=Number(value||0);return variants[index]||{};};';
		echo 'const imageUrl=function(card,variant){variant=variant||{};return String(variant.front_image_url||card.front_image_url||card.image_url||"");};';
		echo 'const backImageUrl=function(card,variant){variant=variant||{};return String(variant.back_image_url||card.back_image_url||"");};';
		echo 'const pricePoints=function(card){return Array.isArray(card.price_points)?card.price_points:[];};';
		echo 'const matchingPricePoint=function(card,variant,condition){const points=pricePoints(card);const variantId=String((variant||{}).provider_variant_id||"");const referenceVariantId=String((variant||{}).reference_variant_id||"");const wantedCondition=String(condition||"").toUpperCase();return points.find(function(point){const pointVariant=String(point.provider_variant_id||"");const pointReferenceVariant=String(point.reference_variant_id||"");const pointCondition=String(point.condition_code||"").toUpperCase();const variantMatches=!variantId&&!referenceVariantId&&!pointVariant&&!pointReferenceVariant||variantId&&pointVariant===variantId||referenceVariantId&&pointReferenceVariant===referenceVariantId;const conditionMatches=!wantedCondition||!pointCondition||pointCondition===wantedCondition;return variantMatches&&conditionMatches;})||points.find(function(point){return String(point.condition_code||"").toUpperCase()===wantedCondition;})||points[0]||null;};';
		echo 'const minorUnits=function(amount){const value=Number(amount||0);return Number.isFinite(value)&&value>0?String(Math.round(value*100)):"";};';
		echo 'const formatMoney=function(amount){const value=Number(amount||0);return Number.isFinite(value)&&value>0?value.toFixed(2):"";};';
		echo 'const priceAmount=function(point){return formatMoney((point||{}).market_price||(point||{}).mid_price||(point||{}).low_price||(point||{}).amount||"");};';
		echo 'const priceLabel=function(card){const price=card.market_price||{};const amount=formatMoney(price.amount||card.market_price_amount||"");const currency=card.currency||price.currency||"USD";const pointLabels=pricePoints(card).slice(0,3).map(function(point){const label=[point.condition_code,point.raw_or_graded].filter(Boolean).join(" ");const amount=priceAmount(point);return amount?((label?label+": ":"")+amount+" "+(point.currency||currency)):"";}).filter(function(value){return value.trim()!==""&&value.trim()!==currency;});return (amount?amount+" "+currency:"")+(pointLabels.length?" ("+pointLabels.join("; ")+")":"");};';
		echo 'const stockLabel=function(card){const available=Number(card.stock_available_count||0);const total=Number(card.stock_total_count||0);const byCondition=card.stock_by_condition||{};const conditionText=Object.keys(byCondition).map(function(key){return key+": "+byCondition[key];}).join(", ");return (available||total?available+"/"+total+" ' . esc_js( __( 'available', 'tcg-store-platform' ) ) . '":"0/0 ' . esc_js( __( 'in stock', 'tcg-store-platform' ) ) . '")+(conditionText?" ("+conditionText+")":"");};';
		echo 'const variantLabel=function(card){const variants=Array.isArray(card.variants)?card.variants:[];if(!variants.length){return "";}return variants.slice(0,2).map(variantText).filter(Boolean).join("; ");};';
		echo 'const render=function(payload){cards=(((payload.data||{}).cards)||[]);const meta=((payload.data||{}).meta)||{};const source=((payload.data||{}).source)||"";const providerNote=meta.live_provider_request?" + ' . esc_js( __( 'live provider fallback', 'tcg-store-platform' ) ) . '":"";if(!cards.length){target.innerHTML="<p>' . esc_js( __( 'No matching cards found in the website catalog or provider fallback.', 'tcg-store-platform' ) ) . '</p>";return;}target.innerHTML="<p>"+esc(cards.length)+" ' . esc_js( __( 'cards shown', 'tcg-store-platform' ) ) . ' <span class=\"description\">"+esc(source)+esc(providerNote)+"</span></p><table class=\"widefat striped\"><thead><tr><th>' . esc_js( __( 'Image URL', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Card', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Set / Number', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Stock / Price', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Add', 'tcg-store-platform' ) ) . '</th></tr></thead><tbody>"+cards.map(function(card,index){const url=imageUrl(card,{});const image=url?"<img src=\""+esc(url)+"\" alt=\"\" style=\"max-width:72px;height:auto;display:block;margin-bottom:4px;\" /><code>"+esc(url)+"</code>":"<span class=\"description\">' . esc_js( __( 'No image URL', 'tcg-store-platform' ) ) . '</span>";return "<tr data-card-index=\""+index+"\"><td>"+image+"</td><td><strong>"+esc(card.card_name||card.name)+"</strong><br><span class=\"description\">"+esc(variantLabel(card))+"</span></td><td>"+esc(card.set_name||"")+"<br><code>"+esc(card.set_code||"")+" "+esc(card.printed_number||card.card_number||"")+"</code></td><td>"+esc(stockLabel(card))+"<br><strong>"+esc(priceLabel(card))+"</strong></td><td>"+variantSelect(card)+" "+conditionSelect()+" <input class=\"tcg-store-lookup-quantity\" type=\"number\" min=\"1\" max=\"100\" value=\"1\" style=\"width:72px\" aria-label=\"' . esc_js( __( 'Quantity', 'tcg-store-platform' ) ) . '\" /> <button type=\"button\" class=\"button tcg-store-lookup-use\">' . esc_js( __( 'Use for intake', 'tcg-store-platform' ) ) . '</button></td></tr>";}).join("")+"</tbody></table>";};';
		echo 'const setIntakeValue=function(name,value){if(!intake){return;}const field=intake.querySelector("[name=\""+name+"\"]");if(field){field.value=String(value===null||value===undefined?"":value);field.dispatchEvent(new Event("change",{bubbles:true}));}};';
		echo 'const fillIntake=function(card,row){const selectedCondition=row.querySelector(".tcg-store-lookup-condition");const selectedQuantity=row.querySelector(".tcg-store-lookup-quantity");const selectedVariantInput=row.querySelector(".tcg-store-lookup-variant");const condition=selectedCondition?selectedCondition.value:"NM";const variant=selectedVariant(card,selectedVariantInput?selectedVariantInput.value:"0");const price=card.market_price||{};const point=matchingPricePoint(card,variant,condition);const priceMinor=point?minorUnits(point.market_price||point.mid_price||point.low_price):String(card.market_price_minor_units||"");setIntakeValue("game",card.game||"pokemon");setIntakeValue("card_name",card.card_name||card.name||"");setIntakeValue("set_name",card.set_name||"");setIntakeValue("set_code",card.set_code||"");setIntakeValue("card_number",card.card_number||"");setIntakeValue("printed_number",card.printed_number||card.card_number||"");setIntakeValue("provider_name",card.provider_name||"scrydex");setIntakeValue("provider_card_id",card.provider_card_id||"");setIntakeValue("reference_card_id",card.reference_card_id||"");setIntakeValue("reference_variant_id",variant.reference_variant_id||"");setIntakeValue("variant",variant.variant||card.variant||"");setIntakeValue("finish",variant.finish||card.finish||"");setIntakeValue("language",variant.language||card.language||"EN");setIntakeValue("front_image_remote_url",imageUrl(card,variant));setIntakeValue("back_image_remote_url",backImageUrl(card,variant));setIntakeValue("market_price_minor_units",priceMinor);if(priceMinor){setIntakeValue("sale_price_minor_units",priceMinor);setIntakeValue("minimum_sale_price_minor_units",priceMinor);}setIntakeValue("sale_currency",(point&&point.currency)||card.currency||price.currency||"USD");setIntakeValue("condition_code",condition);setIntakeValue("raw_or_graded","raw");setIntakeValue("intake_quantity",selectedQuantity?selectedQuantity.value:"1");if(card.suggested_barcode||card.provider_card_id){setIntakeValue("barcode",card.suggested_barcode||card.provider_card_id);setIntakeValue("sku",card.suggested_barcode||card.provider_card_id);}const result=document.getElementById("tcg-store-inventory-intake-result");if(result){result.innerHTML="<p><strong>' . esc_js( __( 'Intake draft ready', 'tcg-store-platform' ) ) . ':</strong> "+esc(card.card_name||card.name||"")+" "+esc(card.set_code||"")+" "+esc(card.printed_number||card.card_number||"")+" "+esc(variantText(variant))+"</p>";}if(intake){intake.scrollIntoView({behavior:"smooth",block:"start"});}};';
		echo 'target.addEventListener("click",function(event){const button=event.target.closest(".tcg-store-lookup-use");if(!button){return;}const row=button.closest("[data-card-index]");const index=row?Number(row.dataset.cardIndex):-1;if(!row||!cards[index]){return;}fillIntake(cards[index],row);});';
		echo 'form.addEventListener("submit",function(event){event.preventDefault();const formData=new FormData(form);const params=new URLSearchParams();params.set("q",String(formData.get("lookup_q")||""));params.set("game",String(formData.get("lookup_game")||"pokemon"));params.set("page_size",String(formData.get("lookup_page_size")||"12"));target.innerHTML="<p>' . esc_js( __( 'Looking up cards...', 'tcg-store-platform' ) ) . '</p>";fetch(target.dataset.endpoint+"?"+params.toString(),{headers:{"X-WP-Nonce":target.dataset.nonce}}).then(function(response){return response.json().then(function(payload){return {ok:response.ok,payload:payload};});}).then(function(result){if(!result.ok){target.innerHTML="<p>' . esc_js( __( 'Card lookup failed.', 'tcg-store-platform' ) ) . '</p>";return;}render(result.payload);}).catch(function(){target.innerHTML="<p>' . esc_js( __( 'Card lookup failed.', 'tcg-store-platform' ) ) . '</p>";});});';
		echo 'if(new URLSearchParams(window.location.search).get("card_lookup")==="1"){form.dispatchEvent(new Event("submit",{cancelable:true}));}';
		echo '})();';
		echo '</script>';
	}

	private function render_inventory_intake_script(): void {
		echo '<script>';
		echo '(function(){';
		echo 'const form=document.getElementById("tcg-store-inventory-intake-form");';
		echo 'const target=document.getElementById("tcg-store-inventory-intake-result");';
		echo 'if(!form||!target||target.dataset.ready!=="1"){return;}';
		echo 'const esc=function(value){return String(value===null||value===undefined?"":value).replace(/[&<>"' . "'" . ']/g,function(char){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","' . "'" . '":"&#039;"}[char];});};';
		echo 'const quantityFrom=function(params){const raw=Number(params.get("intake_quantity")||1);if(!Number.isFinite(raw)){return 1;}return Math.min(100,Math.max(1,Math.floor(raw)));};';
		echo 'const suffixed=function(value,index,total){if(total<2||!value){return value;}const suffix="-"+String(index+1).padStart(2,"0");return String(value).slice(0,72)+suffix;};';
		echo 'const resultLine=function(results,total){const created=results.filter(function(result){return result.ok&&result.payload&&result.payload.status==="created";});const failed=results.length-created.length;const synced=created.filter(function(result){const sync=(((result.payload.meta||{}).projections||{}).woocommerce_product_sync)||{};return sync.synced===true;}).length;const rows=created.map(function(result){const data=result.payload.data||{};const sync=(((result.payload.meta||{}).projections||{}).woocommerce_product_sync)||{};const label=sync.requested?(sync.synced?" WooCommerce synced":" WooCommerce "+esc(sync.status||"not synced")):" external projections deferred";return "<li>#"+esc(data.inventory_id||"")+" "+esc(data.sku||data.barcode||"")+" <span class=\"description\">"+label+"</span></li>";}).join("");return "<p><strong>' . esc_js( __( 'Created inventory items', 'tcg-store-platform' ) ) . ':</strong> "+esc(created.length)+" / "+esc(total)+" <span class=\"description\">"+esc(synced)+" ' . esc_js( __( 'WooCommerce synced', 'tcg-store-platform' ) ) . '</span></p>"+(failed?"<p>' . esc_js( __( 'Failed', 'tcg-store-platform' ) ) . ': "+esc(failed)+"</p>":"")+"<ul>"+rows+"</ul>";};';
		echo 'form.addEventListener("submit",function(event){event.preventDefault();const baseParams=new URLSearchParams(new FormData(form));const quantity=quantityFrom(baseParams);baseParams.delete("intake_quantity");target.innerHTML="<p>' . esc_js( __( 'Creating inventory items...', 'tcg-store-platform' ) ) . '</p>";const batchId=Date.now()+"-"+Math.random().toString(16).slice(2);const requests=[];for(let index=0;index<quantity;index++){const params=new URLSearchParams(baseParams);params.set("barcode",suffixed(params.get("barcode")||"",index,quantity));params.set("sku",suffixed(params.get("sku")||"",index,quantity));const key="admin-intake-"+batchId+"-"+index;requests.push(fetch(target.dataset.endpoint,{method:"POST",headers:{"X-WP-Nonce":target.dataset.nonce,"Idempotency-Key":key},body:params}).then(function(response){return response.json().then(function(payload){return {ok:response.ok,payload:payload};});}).catch(function(){return {ok:false,payload:{errors:["network_error"]}};}));}Promise.all(requests).then(function(results){target.innerHTML=resultLine(results,quantity);if(results.every(function(result){return result.ok&&result.payload&&result.payload.status==="created";})){form.reset();}});});';
		echo '})();';
		echo '</script>';
	}

	private function render_scrydex_catalog_script(): void {
		echo <<<'HTML'
<script>
(function(){
const statusBox=document.getElementById("tcg-store-scrydex-catalog-status");
const form=document.getElementById("tcg-store-scrydex-catalog-import-form");
const resultBox=document.getElementById("tcg-store-scrydex-catalog-import-result");
const browserBox=document.getElementById("tcg-store-scrydex-catalog-browser");
if(!statusBox||!form||!resultBox){return;}
const esc=function(value){return String(value===null||value===undefined?"":value).replace(/[&<>"']/g,function(char){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[char];});};
const title=function(value){return String(value||"").replace(/_/g," ").replace(/\b\w/g,function(char){return char.toUpperCase();});};
const sleep=function(ms){return new Promise(function(resolve){window.setTimeout(resolve,ms);});};
const tables=["reference_sets","reference_cards","reference_variants","provider_price_observations","provider_price_points","sync_checkpoints"];
const countsTable=function(counts){const keys=Object.keys(counts||{});if(!keys.length){return "<p>Catalog count tables are not ready.</p>";}return "<table class=\"widefat striped\"><thead><tr><th>Table</th><th>Rows</th></tr></thead><tbody>"+keys.map(function(key){return "<tr><th scope=\"row\">"+esc(title(key))+"</th><td>"+esc(counts[key])+"</td></tr>";}).join("")+"</tbody></table>";};
const integrityTable=function(integrity){integrity=integrity||{};const latest=Array.isArray(integrity.latest_cards)?integrity.latest_cards:[];const gameCounts=Array.isArray(integrity.game_counts)?integrity.game_counts:[];const missing=Array.isArray(integrity.missing_tables)?integrity.missing_tables:[];const summary="<table class=\"widefat striped\"><thead><tr><th>Status</th><th>Cards</th><th>Images</th><th>Variants</th><th>Prices</th><th>Price points</th></tr></thead><tbody><tr><td>"+esc(integrity.status||"unknown")+"</td><td>"+esc(integrity.cards_checked||0)+"</td><td>"+esc(integrity.cards_with_images||0)+" / "+esc(integrity.cards_checked||0)+" ("+esc(integrity.image_coverage_percent||0)+"%)</td><td>"+esc(integrity.cards_with_variants||0)+" / "+esc(integrity.cards_checked||0)+" ("+esc(integrity.variant_coverage_percent||0)+"%)</td><td>"+esc(integrity.cards_with_price_points||0)+" / "+esc(integrity.cards_checked||0)+" ("+esc(integrity.price_coverage_percent||0)+"%)</td><td>"+esc(integrity.price_points_total||0)+"</td></tr></tbody></table>";const games=gameCounts.length?"<p><strong>Games:</strong> "+gameCounts.map(function(row){return esc(row.game)+": "+esc(row.cards);}).join(" | ")+"</p>":"";const missingText=missing.length?"<p><strong>Missing catalog tables:</strong> "+missing.map(esc).join(", ")+"</p>":"";const latestRows=latest.length?"<table class=\"widefat striped\"><thead><tr><th>Latest Card</th><th>Set</th><th>Image</th><th>Variants</th><th>Prices</th></tr></thead><tbody>"+latest.map(function(card){const image=card.front_image_url?"<a href=\""+esc(card.front_image_url)+"\" target=\"_blank\" rel=\"noreferrer\">image</a>":"missing";return "<tr><td><code>"+esc(card.provider_card_id)+"</code><br>"+esc(card.name)+"</td><td>"+esc(card.set_code||"")+" "+esc(card.printed_number||card.card_number||"")+"<br><span class=\"description\">"+esc(card.set_name||"")+"</span></td><td>"+image+"</td><td>"+esc(card.has_variants?"yes":"no")+"</td><td>"+esc(card.has_price_points?"yes":"no")+"</td></tr>";}).join("")+"</tbody></table>":"<p>No imported ScryDex card samples yet.</p>";return "<h2>Catalog Integrity</h2>"+summary+games+missingText+"<h3>Latest Imported Cards</h3>"+latestRows;};
const checkpointsTable=function(rows){rows=Array.isArray(rows)?rows:[];if(!rows.length){return "<p>No ScryDex checkpoints yet.</p>";}return "<table class=\"widefat striped\"><thead><tr><th>Resource</th><th>Key</th><th>Page</th><th>Committed</th><th>Updated</th></tr></thead><tbody>"+rows.map(function(row){return "<tr><td>"+esc(row.resource_type)+"</td><td>"+esc(row.resource_key)+"</td><td>"+esc(row.page_number)+"</td><td>"+esc(row.committed_count)+"</td><td>"+esc(row.updated_at)+"</td></tr>";}).join("")+"</tbody></table>";};
const exportLinks=function(){const endpoint=resultBox.dataset.exportEndpoint||"";if(!endpoint){return "";}return "<p><strong>Catalog export:</strong> "+tables.map(function(table){return "<a href=\""+esc(endpoint)+"?table="+esc(table)+"&page=1&page_size=1000\" target=\"_blank\" rel=\"noreferrer\">"+esc(title(table))+"</a>";}).join(" | ")+"</p>";};
const renderStatus=function(payload){const data=(payload||{}).data||{};statusBox.innerHTML="<h2>Catalog Status</h2>"+countsTable(data.counts)+integrityTable(data.integrity)+"<h2>Latest Checkpoints</h2>"+checkpointsTable(data.latest_checkpoints)+exportLinks();};
const loadStatus=function(){return fetch(statusBox.dataset.endpoint,{headers:{"X-WP-Nonce":statusBox.dataset.nonce}}).then(function(response){return response.json().then(function(payload){return {ok:response.ok,payload:payload};});}).then(function(result){if(!result.ok){statusBox.innerHTML="<p>Catalog status failed.</p>";return null;}renderStatus(result.payload);return result.payload;}).catch(function(){statusBox.innerHTML="<p>Catalog status failed.</p>";return null;});};
const postIndex=function(payload){return fetch(resultBox.dataset.endpoint,{method:"POST",headers:{"Content-Type":"application/json","X-WP-Nonce":resultBox.dataset.nonce},body:JSON.stringify(payload)}).then(function(response){return response.json().then(function(payload){return {ok:response.ok,payload:payload};});}).then(function(result){if(result.ok){return result.payload;}const error=((result.payload||{}).error||{});throw new Error(error.code||"scrydex_catalog_request_failed");});};
const firstCardPage=function(cards){const pages=Array.isArray(cards.pages)?cards.pages:[];return pages[0]||{};};
const cardPageRows=function(cards){const page=firstCardPage(cards);const plan=page.orchestration_plan||{};const pagePlan=plan.page_plan||{};return Number(page.provider_row_count||pagePlan.reference_row_count||0);};
const cardPageStoredRows=function(cards){const page=firstCardPage(cards);const plan=page.orchestration_plan||{};const pagePlan=plan.page_plan||{};return Number(pagePlan.reference_row_count||0);};
const cardPageVariantRows=function(cards){const page=firstCardPage(cards);const plan=page.orchestration_plan||{};const pagePlan=plan.page_plan||{};return Number(pagePlan.variant_row_count||0);};
const cardPagePriceRows=function(cards){const page=firstCardPage(cards);const plan=page.orchestration_plan||{};const pagePlan=plan.page_plan||{};return Number(pagePlan.price_row_count||0)+Number(pagePlan.price_point_row_count||0);};
const listValues=function(values){return Array.isArray(values)?values.map(function(value){return String(value||"").trim();}).filter(Boolean):[];};
const batchIssues=function(batch){batch=batch||{};const issues=[];const add=function(value){if(value&&!issues.includes(value)){issues.push(value);}};listValues(batch.block_reasons).forEach(add);listValues(batch.configuration_issues).forEach(add);if(batch.error_code){add(String(batch.error_code));}const pages=Array.isArray(batch.pages)?batch.pages:[];pages.forEach(function(page){const plan=page.orchestration_plan||{};listValues(plan.block_reasons).forEach(add);listValues(plan.configuration_issues).forEach(add);if(plan.provider_result_error_code){add(String(plan.provider_result_error_code));}});return issues;};
const batchFailureMessage=function(scope,batch){const status=String((batch||{}).status||"unknown");const issues=batchIssues(batch);return scope+" "+status+(issues.length?": "+issues.join(", "):"");};
const ensureExpansionBatchReady=function(expansions){const status=String((expansions||{}).status||"unknown");if(status==="blocked"||status==="failed"||status==="provider_failed"){throw new Error(batchFailureMessage("ScryDex expansion import",expansions));}};
const ensureCardsBatchReady=function(cards,scope){const status=String((cards||{}).status||"unknown");if(status==="blocked"||status==="failed"||status==="provider_failed"){throw new Error(batchFailureMessage(scope,cards));}if(Number((cards||{}).provider_request_count||0)===0&&status!=="skipped"){throw new Error(batchFailureMessage(scope,cards));}};
const selectedGames=function(){return Array.prototype.slice.call(form.querySelectorAll('input[name="games[]"]:checked')).map(function(input){return String(input.value||"").trim();}).filter(Boolean);};
const stateRow=function(state){return "<tr><th scope=\"row\">"+esc(state.game)+"</th><td>"+esc(state.status)+"</td><td>"+esc(state.expansionPages)+"</td><td>"+esc(state.expansionCount)+"</td><td>"+esc(state.cardPages)+"</td><td>"+esc(state.cardRows)+"</td><td>"+esc(state.storedRows)+"</td><td>"+esc(state.variantRows)+"</td><td>"+esc(state.priceRows)+"</td><td>"+esc(state.current||"")+"</td><td>"+esc(state.latest||"")+"</td></tr>";};
const progressTable=function(states){return "<p><strong>Full ScryDex index</strong> <span class=\"description\">Selected games run in parallel. Each game continues expansions and cards until ScryDex returns fewer than the page size.</span></p><table class=\"widefat striped\"><thead><tr><th>Game</th><th>Status</th><th>Expansion pages</th><th>Sets</th><th>Card pages</th><th>Provider cards</th><th>Stored cards</th><th>Variants</th><th>Prices</th><th>Current</th><th>Latest</th></tr></thead><tbody>"+states.map(stateRow).join("")+"</tbody></table>";};
const setProgress=function(states){resultBox.innerHTML=progressTable(states);};
const createState=function(game,pageSize){return {game:game,pageSize:pageSize,status:"queued",expansionPages:0,expansionCount:0,cardPages:0,cardRows:0,storedRows:0,variantRows:0,priceRows:0,current:"starting",latest:""};};
async function loadExpansionIds(state,states,indexExpansions,manual){
  if(manual){state.expansionCount=1;state.current="single expansion "+manual;setProgress(states);return [manual];}
  if(!indexExpansions){state.current="game-level card endpoint";setProgress(states);return [""];}
  const ids=[];
  let page=1;
  while(true){
    state.current="expansion page "+page;
    state.status="expansions";
    setProgress(states);
    const payload={game:state.game,page_size:state.pageSize,expansions_page:page,max_expansion_pages:1,index_expansions:true,skip_cards:true,execute_database_writes:state.executeWrites};
    const response=await postIndex(payload);
    const data=(response||{}).data||{};
    const expansions=data.expansions||{};
    ensureExpansionBatchReady(expansions);
    const pageIds=Array.isArray(expansions.provider_set_ids)?expansions.provider_set_ids:[];
    pageIds.forEach(function(id){if(id&&!ids.includes(id)){ids.push(id);}});
    state.expansionPages+=Number(expansions.provider_request_count||1);
    state.expansionCount=ids.length;
    state.latest="Expansion page "+page+" returned "+Number(expansions.row_count||0)+" row(s).";
    setProgress(states);
    await loadStatus();
    if(Number(expansions.row_count||0)<state.pageSize||expansions.continuation_available===false){break;}
    page=Number(expansions.next_page||page+1);
    await sleep(85);
  }
  return ids;
}
async function indexCardsForExpansion(state,states,expansionId){
  let checkpoint=null;
  let page=1;
  while(true){
    state.current=expansionId?("cards for "+expansionId+" page "+page):("game card page "+page);
    state.status="cards";
    setProgress(states);
    const payload={game:state.game,expansion_id:expansionId,page_size:state.pageSize,max_pages:1,index_expansions:false,skip_cards:false,execute_database_writes:state.executeWrites};
    if(checkpoint){payload.checkpoint=checkpoint;}
    const response=await postIndex(payload);
    const data=(response||{}).data||{};
    const cards=data.cards||{};
    ensureCardsBatchReady(cards,expansionId?("ScryDex card import for "+expansionId):"ScryDex game card import");
    const rows=cardPageRows(cards);
    state.cardPages+=Number(cards.provider_request_count||1);
    state.cardRows+=rows;
    state.storedRows+=cardPageStoredRows(cards);
    state.variantRows+=cardPageVariantRows(cards);
    state.priceRows+=cardPagePriceRows(cards);
    state.latest=(expansionId||state.game)+" page "+page+" returned "+rows+" provider card row(s).";
    setProgress(states);
    await loadStatus();
    checkpoint=cards.continuation_checkpoint_row||null;
    if(rows<state.pageSize||cards.continuation_available===false){break;}
    page+=1;
    await sleep(85);
  }
}
async function runGameIndex(state,states,indexExpansions,manual){
  state.status="running";
  setProgress(states);
  const expansionIds=await loadExpansionIds(state,states,indexExpansions,manual);
  if(!expansionIds.length){state.status="complete";state.latest="No expansions returned from ScryDex for "+state.game+".";setProgress(states);return;}
  for(const expansionId of expansionIds){await indexCardsForExpansion(state,states,expansionId);}
  state.status="complete";
  state.current="complete";
  state.latest="ScryDex index completed for "+state.game+".";
  setProgress(states);
}
form.addEventListener("submit",function(event){
  event.preventDefault();
  if(resultBox.dataset.canIndex!=="1"){return;}
  const formData=new FormData(form);
  const games=selectedGames();
  if(!games.length){resultBox.innerHTML="<p><strong>Select at least one game.</strong></p>";return;}
  const pageSize=Math.min(100,Math.max(1,Number(formData.get("page_size")||100)));
  const executeWrites=!!form.querySelector("[name=execute_database_writes]").checked;
  const manual=String(formData.get("expansion_id")||"").trim();
  const indexExpansions=!!form.querySelector("[name=index_expansions]").checked;
  const states=games.map(function(game){const state=createState(game,pageSize);state.executeWrites=executeWrites;return state;});
  setProgress(states);
  Promise.allSettled(states.map(function(state){return runGameIndex(state,states,indexExpansions,manual).catch(function(error){state.status="failed";state.latest=error&&error.message?error.message:String(error);setProgress(states);throw error;});})).then(async function(){
    await loadStatus();
    setProgress(states);
  });
});
const fetchExport=function(table,page,pageSize){const endpoint=(browserBox&&browserBox.dataset.exportEndpoint)||resultBox.dataset.exportEndpoint||"";const url=endpoint+"?table="+encodeURIComponent(table)+"&page="+encodeURIComponent(page)+"&page_size="+encodeURIComponent(pageSize);return fetch(url,{headers:{"X-WP-Nonce":(browserBox&&browserBox.dataset.nonce)||resultBox.dataset.nonce}}).then(function(response){return response.json().then(function(payload){return {ok:response.ok,payload:payload};});}).then(function(result){if(result.ok){return ((result.payload||{}).data)||{};}const error=((result.payload||{}).error||{});throw new Error(error.code||"scrydex_catalog_export_failed");});};
const cell=function(value){if(value===null||value===undefined){return "";}if(typeof value==="string"&&/^https?:\/\//.test(value)){return "<a href=\""+esc(value)+"\" target=\"_blank\" rel=\"noreferrer\">"+esc(value.slice(0,72))+"</a>";}const text=typeof value==="object"?JSON.stringify(value):String(value);return esc(text.length>120?text.slice(0,117)+"...":text);};
const tablePreview=function(data){const rows=Array.isArray(data.rows)?data.rows:[];const cols=rows.length?Object.keys(rows[0]).slice(0,12):[];const nav="<p><strong>"+esc(title(data.table||""))+"</strong> Page "+esc(data.page||1)+" of "+esc(Math.max(1,Math.ceil(Number(data.total||0)/Number(data.page_size||1))))+"; "+esc(data.total||0)+" total row(s).</p>";if(!rows.length){return nav+"<p>No rows returned.</p>";}return nav+"<table class=\"widefat striped\"><thead><tr>"+cols.map(function(col){return "<th>"+esc(col)+"</th>";}).join("")+"</tr></thead><tbody>"+rows.map(function(row){return "<tr>"+cols.map(function(col){return "<td>"+cell(row[col])+"</td>";}).join("")+"</tr>";}).join("")+"</tbody></table>";};
const downloadJson=function(filename,payload){const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);};
async function fetchAllRows(table,status){
  const rows=[];
  let page=1;
  while(true){
    status("Downloading "+title(table)+" page "+page+"...");
    const data=await fetchExport(table,page,1000);
    const pageRows=Array.isArray(data.rows)?data.rows:[];
    rows.push.apply(rows,pageRows);
    if(data.has_more!==true||pageRows.length<1000){break;}
    page+=1;
    await sleep(25);
  }
  return rows;
}
const renderBrowser=function(){
  if(!browserBox){return;}
  browserBox.innerHTML="<div class=\"tablenav top\"><label for=\"tcg-store-catalog-table\"><strong>Catalog table</strong></label> <select id=\"tcg-store-catalog-table\">"+tables.map(function(table){return "<option value=\""+esc(table)+"\">"+esc(title(table))+"</option>";}).join("")+"</select> <label for=\"tcg-store-catalog-page\">Page</label> <input id=\"tcg-store-catalog-page\" type=\"number\" min=\"1\" value=\"1\" style=\"width:80px\" /> <label for=\"tcg-store-catalog-page-size\">Rows</label> <input id=\"tcg-store-catalog-page-size\" type=\"number\" min=\"1\" max=\"1000\" value=\"25\" style=\"width:90px\" /> <button type=\"button\" class=\"button\" id=\"tcg-store-catalog-load\">View</button> <button type=\"button\" class=\"button\" id=\"tcg-store-catalog-download-table\">Download Table JSON</button> <button type=\"button\" class=\"button button-primary\" id=\"tcg-store-catalog-download-all\">Download Full Catalog JSON</button></div><div id=\"tcg-store-catalog-browser-output\"><p>Select a table to preview catalog rows.</p></div>";
  const output=document.getElementById("tcg-store-catalog-browser-output");
  const selected=function(){return String(document.getElementById("tcg-store-catalog-table").value||"reference_cards");};
  const page=function(){return Math.max(1,Number(document.getElementById("tcg-store-catalog-page").value||1));};
  const pageSize=function(){return Math.min(1000,Math.max(1,Number(document.getElementById("tcg-store-catalog-page-size").value||25)));};
  const status=function(text){output.innerHTML="<p>"+esc(text)+"</p>";};
  document.getElementById("tcg-store-catalog-load").addEventListener("click",function(){status("Loading catalog rows...");fetchExport(selected(),page(),pageSize()).then(function(data){output.innerHTML=tablePreview(data);}).catch(function(error){output.innerHTML="<p><strong>Catalog preview failed:</strong> "+esc(error.message||error)+"</p>";});});
  document.getElementById("tcg-store-catalog-download-table").addEventListener("click",function(){const table=selected();fetchAllRows(table,status).then(function(rows){downloadJson("tcg-"+table+".json",{table:table,total:rows.length,rows:rows,exported_at:(new Date()).toISOString()});status("Downloaded "+rows.length+" row(s) from "+title(table)+".");}).catch(function(error){output.innerHTML="<p><strong>Catalog download failed:</strong> "+esc(error.message||error)+"</p>";});});
  document.getElementById("tcg-store-catalog-download-all").addEventListener("click",async function(){const payload={resource:"scrydex_catalog_full_export",exported_at:(new Date()).toISOString(),tables:{}};try{for(const table of tables){payload.tables[table]=await fetchAllRows(table,status);}downloadJson("tcg-scrydex-catalog-full.json",payload);status("Downloaded full ScryDex catalog JSON.");}catch(error){output.innerHTML="<p><strong>Full catalog download failed:</strong> "+esc(error.message||error)+"</p>";}});
  document.getElementById("tcg-store-catalog-load").click();
};
loadStatus();
renderBrowser();
})();
</script>
HTML;
	}
}
