<?php
/**
 * Plugin composition root.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Bootstrap;

use TCGStorePlatform\Admin\AdminMenu;
use TCGStorePlatform\Api\V1\CustomerController;
use TCGStorePlatform\Api\V1\CustomerCreditController;
use TCGStorePlatform\Api\V1\EventsController;
use TCGStorePlatform\Api\V1\HealthController;
use TCGStorePlatform\Api\V1\KioskOrderController;
use TCGStorePlatform\Api\V1\OfflineConnectorManifestController;
use TCGStorePlatform\Api\V1\InventoryRouteDependencyFactory;
use TCGStorePlatform\Api\V1\OfflineRouteBootstrapper;
use TCGStorePlatform\Api\V1\PosPaymentRouteDependencyFactory;
use TCGStorePlatform\Auth\AdminAccess;
use TCGStorePlatform\Auth\RoleManager;
use TCGStorePlatform\Events\EventShortcodes;
use TCGStorePlatform\FeatureFlags\FeatureFlags;
use TCGStorePlatform\Logging\AuditLogger;
use TCGStorePlatform\Logging\Logger;
use TCGStorePlatform\Migrations\MigrationRunner;
use TCGStorePlatform\Scheduler\DailyScheduler;
use TCGStorePlatform\Settings\Settings;
use TCGStorePlatform\Settings\SettingsPage;
use TCGStorePlatform\Staging\StagingSafety;
use TCGStorePlatform\ScryDex\ScryDexScheduledRefreshRunner;

final class Plugin {
	private static ?self $instance = null;
	private bool $booted           = false;

	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	public function boot(): void {
		if ( $this->booted ) {
			return;
		}

		$this->booted = true;

		add_action( 'plugins_loaded', array( $this, 'initialize' ), 20 );
	}

	public function initialize(): void {
		load_plugin_textdomain(
			'tcg-store-platform',
			false,
			dirname( TCG_STORE_PLATFORM_BASENAME ) . '/languages'
		);

		$logger           = new Logger();
		$audit_logger     = new AuditLogger();
		$migration_runner = new MigrationRunner( $logger );
		$scheduler        = new DailyScheduler( $logger );
		$scrydex_runner   = new ScryDexScheduledRefreshRunner( $logger );

		add_action( 'admin_init', array( $migration_runner, 'maybe_migrate' ), 5 );
		add_action( 'admin_init', array( RoleManager::class, 'maybe_install' ), 6 );
		add_action( 'activated_plugin', array( RoleManager::class, 'handle_plugin_activation' ) );
		add_action( 'admin_notices', array( DependencyChecker::class, 'render_admin_notices' ) );

		( new AdminAccess() )->register();
		( new AdminMenu( $logger ) )->register();
		( new SettingsPage( $audit_logger ) )->register();
		( new StagingSafety() )->register();
		( new HealthController( $scheduler ) )->register();
		( new OfflineConnectorManifestController() )->register();
		( new OfflineRouteBootstrapper() )->register();
		( new PosPaymentRouteDependencyFactory() )->bootstrapper()->register();
		InventoryRouteDependencyFactory::from_settings( Settings::all() )->bootstrapper()->register();
		( new CustomerController() )->register();
		( new CustomerCreditController() )->register();
		( new EventsController() )->register();
		( new KioskOrderController() )->register();
		( new EventShortcodes() )->register();
		$scrydex_runner->register();
		$scheduler->register();

		add_action(
			'tcg_store_platform_daily_dispatch',
			static function () use ( $logger ): void {
				$logger->info(
					'platform.daily_dispatch',
					array(
						'enabled_features' => FeatureFlags::enabled_flags(),
					)
				);
			}
		);
	}

	private function __construct() {
	}
}
