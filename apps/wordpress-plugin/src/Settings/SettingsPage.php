<?php
/**
 * WordPress Settings API integration.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Settings;

use TCGStorePlatform\FeatureFlags\FeatureFlagRegistry;
use TCGStorePlatform\FeatureFlags\FeatureFlags;
use TCGStorePlatform\Logging\AuditLogger;

final class SettingsPage {
	private AuditLogger $audit_logger;

	public function __construct( AuditLogger $audit_logger ) {
		$this->audit_logger = $audit_logger;
	}

	public function register(): void {
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_filter( 'option_page_capability_tcg_store_platform', array( $this, 'settings_capability' ) );
		add_action( 'update_option_' . Settings::OPTION_NAME, array( $this, 'audit_settings_change' ), 10, 3 );
		add_action( 'update_option_' . FeatureFlags::OPTION_NAME, array( $this, 'audit_settings_change' ), 10, 3 );
	}

	public function settings_capability(): string {
		return 'manage_settings';
	}

	public function register_settings(): void {
		register_setting(
			'tcg_store_platform',
			Settings::OPTION_NAME,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( Settings::class, 'sanitize' ),
				'default'           => Settings::defaults(),
			)
		);

		register_setting(
			'tcg_store_platform',
			FeatureFlags::OPTION_NAME,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( FeatureFlags::class, 'sanitize' ),
				'default'           => FeatureFlags::defaults(),
			)
		);

		add_settings_section(
			'tcg_store_platform_general',
			__( 'General', 'tcg-store-platform' ),
			array( $this, 'render_general_description' ),
			'tcg-store-platform'
		);

		add_settings_field(
			'logging_level',
			__( 'Logging level', 'tcg-store-platform' ),
			array( $this, 'render_logging_level' ),
			'tcg-store-platform',
			'tcg_store_platform_general'
		);

		add_settings_field(
			'daily_schedule',
			__( 'Daily platform schedule', 'tcg-store-platform' ),
			array( $this, 'render_daily_schedule' ),
			'tcg-store-platform',
			'tcg_store_platform_general'
		);

		add_settings_field(
			'delete_data_on_uninstall',
			__( 'Uninstall behavior', 'tcg-store-platform' ),
			array( $this, 'render_delete_data' ),
			'tcg-store-platform',
			'tcg_store_platform_general'
		);

		add_settings_section(
			'tcg_store_platform_branding',
			__( 'Branding', 'tcg-store-platform' ),
			array( $this, 'render_branding_description' ),
			'tcg-store-platform'
		);

		add_settings_field(
			'branding_company_name',
			__( 'Company name', 'tcg-store-platform' ),
			array( $this, 'render_branding_company_name' ),
			'tcg-store-platform',
			'tcg_store_platform_branding'
		);

		add_settings_field(
			'branding_company_short_name',
			__( 'Short name', 'tcg-store-platform' ),
			array( $this, 'render_branding_company_short_name' ),
			'tcg-store-platform',
			'tcg_store_platform_branding'
		);

		add_settings_field(
			'branding_logo_url',
			__( 'Logo URL', 'tcg-store-platform' ),
			array( $this, 'render_branding_logo_url' ),
			'tcg-store-platform',
			'tcg_store_platform_branding'
		);

		add_settings_field(
			'branding_support_url',
			__( 'Support URL', 'tcg-store-platform' ),
			array( $this, 'render_branding_support_url' ),
			'tcg-store-platform',
			'tcg_store_platform_branding'
		);

		add_settings_field(
			'branding_receipt_footer',
			__( 'Receipt footer', 'tcg-store-platform' ),
			array( $this, 'render_branding_receipt_footer' ),
			'tcg-store-platform',
			'tcg_store_platform_branding'
		);

		add_settings_field(
			'branding_colors',
			__( 'Color tokens', 'tcg-store-platform' ),
			array( $this, 'render_branding_colors' ),
			'tcg-store-platform',
			'tcg_store_platform_branding'
		);

		add_settings_section(
			'tcg_store_platform_features',
			__( 'Feature flags', 'tcg-store-platform' ),
			array( $this, 'render_feature_description' ),
			'tcg-store-platform'
		);

		add_settings_field(
			'feature_flags',
			__( 'Modules', 'tcg-store-platform' ),
			array( $this, 'render_feature_flags' ),
			'tcg-store-platform',
			'tcg_store_platform_features'
		);

		add_settings_section(
			'tcg_store_platform_inventory_routes',
			__( 'Inventory route runtime', 'tcg-store-platform' ),
			array( $this, 'render_inventory_route_description' ),
			'tcg-store-platform'
		);

		add_settings_field(
			'inventory_route_runtime',
			__( 'Staging route gates', 'tcg-store-platform' ),
			array( $this, 'render_inventory_route_runtime' ),
			'tcg-store-platform',
			'tcg_store_platform_inventory_routes'
		);
	}

	public function render_general_description(): void {
		echo '<p>';
		echo esc_html__( 'Foundation settings apply globally. Location-scoped settings will use the custom settings table in later phases.', 'tcg-store-platform' );
		echo '</p>';
	}

	public function render_logging_level(): void {
		$settings = Settings::all();
		$levels   = array( 'debug', 'info', 'warning', 'error' );

		echo '<select name="' . esc_attr( Settings::OPTION_NAME ) . '[logging_level]">';

		foreach ( $levels as $level ) {
			echo '<option value="' . esc_attr( $level ) . '" ' . selected( $settings['logging_level'], $level, false ) . '>';
			echo esc_html( ucfirst( $level ) );
			echo '</option>';
		}

		echo '</select>';
	}

	public function render_daily_schedule(): void {
		echo '<code>09:00 America/New_York</code>';
		echo '<p class="description">';
		echo esc_html__( 'Fixed by the business rule and scheduled as one-time actions to remain correct across daylight-saving changes.', 'tcg-store-platform' );
		echo '</p>';
	}

	public function render_delete_data(): void {
		$settings = Settings::all();

		echo '<label>';
		echo '<input type="checkbox" name="' . esc_attr( Settings::OPTION_NAME ) . '[delete_data_on_uninstall]" value="1" '
			. checked( ! empty( $settings['delete_data_on_uninstall'] ), true, false )
			. ' />';
		echo ' ' . esc_html__( 'Permanently delete platform tables and settings during uninstall.', 'tcg-store-platform' );
		echo '</label>';
		echo '<p class="description">';
		echo esc_html__( 'Leave disabled in production unless a verified backup and deletion approval exist.', 'tcg-store-platform' );
		echo '</p>';
	}

	public function render_branding_description(): void {
		echo '<p>';
		echo esc_html__( 'White-label settings are shared by WordPress, kiosk, receipt, staging banner, and offline app surfaces so each company can use its own identity without code changes.', 'tcg-store-platform' );
		echo '</p>';
	}

	public function render_branding_company_name(): void {
		$this->render_branding_input( 'company_name' );
	}

	public function render_branding_company_short_name(): void {
		$this->render_branding_input( 'company_short_name' );
	}

	public function render_branding_logo_url(): void {
		$this->render_branding_input( 'logo_url', 'url' );
		echo '<p class="description">';
		echo esc_html__( 'Use an HTTPS URL from the current site media library or approved brand asset host.', 'tcg-store-platform' );
		echo '</p>';
	}

	public function render_branding_support_url(): void {
		$this->render_branding_input( 'support_url', 'url' );
	}

	public function render_branding_receipt_footer(): void {
		$branding = $this->branding();

		echo '<textarea name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[branding][receipt_footer]" rows="2" class="large-text">';
		echo esc_textarea( (string) $branding['receipt_footer'] );
		echo '</textarea>';
	}

	public function render_branding_colors(): void {
		$branding = $this->branding();
		$labels   = array(
			'primary_color'        => __( 'Primary', 'tcg-store-platform' ),
			'accent_color'         => __( 'Accent', 'tcg-store-platform' ),
			'background_color'     => __( 'Background', 'tcg-store-platform' ),
			'surface_color'        => __( 'Surface', 'tcg-store-platform' ),
			'text_color'           => __( 'Text', 'tcg-store-platform' ),
			'success_color'        => __( 'Success', 'tcg-store-platform' ),
			'warning_color'        => __( 'Warning', 'tcg-store-platform' ),
			'danger_color'         => __( 'Danger', 'tcg-store-platform' ),
			'staging_banner_color' => __( 'Staging banner', 'tcg-store-platform' ),
		);

		echo '<fieldset>';

		foreach ( $labels as $key => $label ) {
			echo '<label>';
			echo esc_html( $label ) . ' ';
			echo '<input type="color" name="'
				. esc_attr( Settings::OPTION_NAME )
				. '[branding][' . esc_attr( $key ) . ']" value="'
				. esc_attr( (string) $branding[ $key ] )
				. '" /> ';
			echo '<code>' . esc_html( (string) $branding[ $key ] ) . '</code>';
			echo '</label><br />';
		}

		echo '</fieldset>';
	}

	public function render_feature_description(): void {
		echo '<p>';
		echo esc_html__( 'Unavailable modules remain forced off until their implementation phase passes acceptance tests.', 'tcg-store-platform' );
		echo '</p>';
	}

	public function render_feature_flags(): void {

		$values = get_option( FeatureFlags::OPTION_NAME, FeatureFlags::defaults() );

		echo '<table class="widefat striped"><thead><tr><th>';
		echo esc_html__( 'Module', 'tcg-store-platform' );
		echo '</th><th>';
		echo esc_html__( 'Phase', 'tcg-store-platform' );
		echo '</th><th>';
		echo esc_html__( 'State', 'tcg-store-platform' );
		echo '</th></tr></thead><tbody>';

		foreach ( FeatureFlagRegistry::definitions() as $flag => $definition ) {
			$available = FeatureFlags::is_available( $flag );
			$enabled   = ! empty( $values[ $flag ] ) && $available;

			echo '<tr><td>' . esc_html( $definition['label'] ) . '</td>';
			echo '<td>' . esc_html( (string) $definition['phase'] ) . '</td><td>';

			if ( $available ) {
				if ( 'core' === $flag ) {
					echo '<input type="hidden" name="'
						. esc_attr( FeatureFlags::OPTION_NAME )
						. '[' . esc_attr( $flag ) . ']" value="1" />';
					echo esc_html__( 'Enabled', 'tcg-store-platform' );
					echo '</td></tr>';
					continue;
				}

				echo '<label><input type="checkbox" name="'
					. esc_attr( FeatureFlags::OPTION_NAME )
					. '[' . esc_attr( $flag ) . ']" value="1" '
					. checked( $enabled, true, false )
					. ' /> '
					. esc_html__( 'Enabled', 'tcg-store-platform' )
					. '</label>';
			} else {
				echo esc_html__( 'Unavailable', 'tcg-store-platform' );
			}

			echo '</td></tr>';
		}

		echo '</tbody></table>';
	}

	public function render_inventory_route_description(): void {

			echo '<p>';
		echo esc_html__( 'Route runtime gates are separate from feature flags. Keep writes and public reads disabled until staging acceptance passes.', 'tcg-store-platform' );
		echo '</p>';
	}

	public function render_inventory_route_runtime(): void {

			$runtime = InventoryRouteRuntimeSettings::from_settings( Settings::all() );

			echo '<fieldset>';
		echo '<label>';
		echo '<input type="checkbox" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( InventoryRouteRuntimeSettings::KEY )
		. '][staff_search_route_enabled]" value="1" '
			. checked( ! empty( $runtime['staff_search_route_enabled'] ), true, false )
			. ' /> ';
		echo esc_html__( 'Enable staff inventory search route in staging.', 'tcg-store-platform' );
		echo '</label><br />';

		echo '<label>';
		echo '<input type="checkbox" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( InventoryRouteRuntimeSettings::KEY )
		. '][public_search_route_enabled]" value="1" '
		. checked( ! empty( $runtime['public_search_route_enabled'] ), true, false )
			. ' /> ';
		echo esc_html__( 'Allow public inventory search responses.', 'tcg-store-platform' );
			echo '</label>';
			echo '<p class="description">';
		echo esc_html__( 'Public search is ignored unless staff inventory search is enabled.', 'tcg-store-platform' );
		echo '</p>';
			echo '</fieldset>';
	}

	/**
		* @param mixed  $old_value Previous settings.
	 * @param mixed  $new_value New settings.
		* @param string $option Option name.
		*/
	public function audit_settings_change( mixed $old_value, mixed $new_value, string $option ): void {
		$this->audit_logger->record(
			'settings.updated',
			'settings',
			$option,
			array(
				'before' => $old_value,
				'after'  => $new_value,
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function branding(): array {
		$settings = Settings::all();

		return BrandingSettings::from_settings( $settings );
	}

	private function render_branding_input( string $key, string $type = 'text' ): void {
		$branding = $this->branding();

		echo '<input type="' . esc_attr( $type ) . '" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[branding][' . esc_attr( $key ) . ']" value="'
			. esc_attr( (string) $branding[ $key ] )
			. '" class="regular-text" />';
	}
}
