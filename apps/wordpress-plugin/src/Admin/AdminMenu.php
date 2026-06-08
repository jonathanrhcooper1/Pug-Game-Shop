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
use TCGStorePlatform\Settings\ScryDexUsageBudgetSettings;
use TCGStorePlatform\Settings\Settings;
use TCGStorePlatform\ScryDex\ScryDexProviderFactory;
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
		$search_panel       = $workspace->search_panel(
			$bootstrap_payload,
			$dependency_payload,
			$this->inventory_search_query()
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
		$woocommerce_square         = ( new WooCommerceSquareExtensionStatus() )->admin_summary();
		$square_inventory_sync      = ( new SquareInventorySyncReadinessPlanner() )->admin_summary();
		$inventory_factory          = InventoryRouteDependencyFactory::from_settings( Settings::all() );
		$inventory_bootstrap        = $inventory_factory->bootstrap_status_presenter()->admin_summary(
			FeatureFlags::is_enabled( 'inventory_pricing' )
		);
		$inventory_dependencies     = ( new InventoryRouteDependencyStatusPresenter(
			$inventory_factory
		) )->admin_summary();
		$scrydex                    = ( new ScryDexProviderFactory( Settings::all() ) )->admin_summary();
		$scrydex_budget             = ScryDexUsageBudgetSettings::admin_summary( Settings::all() );
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
		echo '<table class="form-table" role="presentation"><tbody>';
		$this->render_inventory_intake_text_input( $form, 'game', __( 'Game', 'tcg-store-platform' ), 'pokemon', true );
		$this->render_inventory_intake_text_input( $form, 'card_name', __( 'Card name', 'tcg-store-platform' ), 'Bulbasaur', true );
		$this->render_inventory_intake_text_input( $form, 'set_name', __( 'Set name', 'tcg-store-platform' ), 'Base Set', false );
		$this->render_inventory_intake_text_input( $form, 'set_code', __( 'Set code', 'tcg-store-platform' ), 'BASE', false );
		$this->render_inventory_intake_text_input( $form, 'card_number', __( 'Card number', 'tcg-store-platform' ), '44', false );
		$this->render_inventory_intake_text_input( $form, 'printed_number', __( 'Printed number', 'tcg-store-platform' ), '44/102', false );
		$this->render_inventory_intake_text_input( $form, 'barcode', __( 'Barcode', 'tcg-store-platform' ), 'PUG-PKM-BASE-044', true );
		$this->render_inventory_intake_text_input( $form, 'sku', __( 'SKU', 'tcg-store-platform' ), 'PUG-PKM-BASE-044', false );
		$this->render_inventory_intake_text_input( $form, 'location_id', __( 'Location ID', 'tcg-store-platform' ), '1', true, 'number' );
		$this->render_inventory_intake_text_input( $form, 'sale_currency', __( 'Currency', 'tcg-store-platform' ), 'USD', true );
		$this->render_inventory_intake_text_input( $form, 'minimum_sale_price_minor_units', __( 'Minimum price cents', 'tcg-store-platform' ), '100', true, 'number' );
		$this->render_inventory_intake_text_input( $form, 'sale_price_minor_units', __( 'Sale price cents', 'tcg-store-platform' ), '250', true, 'number' );
		$this->render_inventory_intake_select( $form, 'status', __( 'Status', 'tcg-store-platform' ), $status_options );
		$this->render_inventory_intake_select( $form, 'raw_or_graded', __( 'Raw or graded', 'tcg-store-platform' ), $raw_options );
		$this->render_inventory_intake_select( $form, 'condition_code', __( 'Condition', 'tcg-store-platform' ), $condition_options );
		$this->render_inventory_intake_select( $form, 'online_visibility', __( 'Online visibility', 'tcg-store-platform' ), $visibility_options );
		$this->render_inventory_intake_select( $form, 'kiosk_visibility', __( 'Kiosk visibility', 'tcg-store-platform' ), $visibility_options );
		$this->render_inventory_intake_select( $form, 'pos_visibility', __( 'POS visibility', 'tcg-store-platform' ), $visibility_options );
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

	private function render_inventory_search_script(): void {
		echo '<script>';
		echo '(function(){';
		echo 'const form=document.getElementById("tcg-store-inventory-search-form");';
		echo 'const target=document.getElementById("tcg-store-inventory-search-results");';
		echo 'if(!form||!target||target.dataset.ready!=="1"){return;}';
		echo 'const esc=function(value){return String(value===null||value===undefined?"":value).replace(/[&<>"' . "'" . ']/g,function(char){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","' . "'" . '":"&#039;"}[char];});};';
		echo 'const render=function(payload){const items=((payload.data||{}).items)||[];const meta=((payload.data||{}).meta)||{};';
		echo 'if(!items.length){target.innerHTML="<p>' . esc_js( __( 'No matching inventory found.', 'tcg-store-platform' ) ) . '</p>";return;}';
		echo 'target.innerHTML="<p>"+esc(meta.total)+" ' . esc_js( __( 'matching items', 'tcg-store-platform' ) ) . '</p><table class=\"widefat striped\"><thead><tr><th>' . esc_js( __( 'Card', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Set', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Status', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'Price', 'tcg-store-platform' ) ) . '</th><th>' . esc_js( __( 'SKU', 'tcg-store-platform' ) ) . '</th></tr></thead><tbody>"+items.map(function(item){return "<tr><td>"+esc(item.card_name)+"</td><td>"+esc(item.set_code||item.set_name||"")+"</td><td>"+esc(item.status)+"</td><td>"+esc(item.sale_price||"")+" "+esc(item.sale_currency||"")+"</td><td>"+esc(item.sku||item.barcode||"")+"</td></tr>";}).join("")+"</tbody></table>";};';
		echo 'form.addEventListener("submit",function(event){event.preventDefault();const params=new URLSearchParams(new FormData(form));params.delete("page");params.delete("inventory_search");params.set("visibility","staff");target.innerHTML="<p>' . esc_js( __( 'Searching inventory...', 'tcg-store-platform' ) ) . '</p>";fetch(target.dataset.endpoint+"?"+params.toString(),{headers:{"X-WP-Nonce":target.dataset.nonce}}).then(function(response){return response.json().then(function(payload){return {ok:response.ok,payload:payload};});}).then(function(result){if(!result.ok){target.innerHTML="<p>' . esc_js( __( 'Inventory search failed.', 'tcg-store-platform' ) ) . '</p>";return;}render(result.payload);}).catch(function(){target.innerHTML="<p>' . esc_js( __( 'Inventory search failed.', 'tcg-store-platform' ) ) . '</p>";});});';
		echo 'if(new URLSearchParams(window.location.search).get("inventory_search")==="1"){form.dispatchEvent(new Event("submit",{cancelable:true}));}';
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
		echo 'const resultLine=function(payload){const data=payload.data||{};const meta=payload.meta||{};return "<p><strong>' . esc_js( __( 'Created', 'tcg-store-platform' ) ) . '</strong> #"+esc(data.inventory_id||"")+" "+esc(data.sku||data.barcode||"")+" <span class=\"description\">' . esc_js( __( 'External projections deferred', 'tcg-store-platform' ) ) . ': "+esc(meta.woocommerce_projection_deferred&&meta.square_inventory_projection_deferred&&meta.label_print_deferred?"yes":"check")+"</span></p>";};';
		echo 'form.addEventListener("submit",function(event){event.preventDefault();const params=new URLSearchParams(new FormData(form));const key="admin-intake-"+Date.now()+"-"+Math.random().toString(16).slice(2);target.innerHTML="<p>' . esc_js( __( 'Creating inventory item...', 'tcg-store-platform' ) ) . '</p>";fetch(target.dataset.endpoint,{method:"POST",headers:{"X-WP-Nonce":target.dataset.nonce,"Idempotency-Key":key},body:params}).then(function(response){return response.json().then(function(payload){return {ok:response.ok,payload:payload};});}).then(function(result){if(!result.ok||result.payload.status!=="created"){const errors=(result.payload.errors||[]).join(", ");target.innerHTML="<p>' . esc_js( __( 'Inventory create failed.', 'tcg-store-platform' ) ) . ' "+esc(errors)+"</p>";return;}target.innerHTML=resultLine(result.payload);form.reset();}).catch(function(){target.innerHTML="<p>' . esc_js( __( 'Inventory create failed.', 'tcg-store-platform' ) ) . '</p>";});});';
		echo '})();';
		echo '</script>';
	}
}
