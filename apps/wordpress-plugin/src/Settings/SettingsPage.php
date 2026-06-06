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
			'tcg_store_platform_topdeck',
			__( 'TopDeck', 'tcg-store-platform' ),
			array( $this, 'render_topdeck_description' ),
			'tcg-store-platform'
		);

		add_settings_field(
			'topdeck_api_key',
			__( 'API key', 'tcg-store-platform' ),
			array( $this, 'render_topdeck_api_key' ),
			'tcg-store-platform',
			'tcg_store_platform_topdeck'
		);

		add_settings_field(
			'topdeck_base_url',
			__( 'API base URL', 'tcg-store-platform' ),
			array( $this, 'render_topdeck_base_url' ),
			'tcg-store-platform',
			'tcg_store_platform_topdeck'
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

	public function render_topdeck_description(): void {
		echo '<p>';
		echo esc_html__( 'TopDeck credentials must be sandbox or approved staging credentials outside production. Event creation remains disabled until a create endpoint is explicitly configured.', 'tcg-store-platform' );
		echo '</p>';
	}

	public function render_topdeck_api_key(): void {
		$settings = Settings::all();

		echo '<input type="password" autocomplete="new-password" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[topdeck_api_key]" value="" class="regular-text" />';

		if ( '' !== (string) $settings['topdeck_api_key'] ) {
			echo '<p class="description">';
			echo esc_html__( 'A TopDeck API key is stored. Enter a replacement key to rotate it.', 'tcg-store-platform' );
			echo '</p>';
		}
	}

	public function render_topdeck_base_url(): void {
		$settings = Settings::all();

		echo '<input type="url" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[topdeck_base_url]" value="'
			. esc_attr( (string) $settings['topdeck_base_url'] )
			. '" class="regular-text" />';
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
			$enabled = ! empty( $values[ $flag ] ) && $definition['available'];

			echo '<tr><td>' . esc_html( $definition['label'] ) . '</td>';
			echo '<td>' . esc_html( (string) $definition['phase'] ) . '</td><td>';

			if ( $definition['available'] ) {
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
}
