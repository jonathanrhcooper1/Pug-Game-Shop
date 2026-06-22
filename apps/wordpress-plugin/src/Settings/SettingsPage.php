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
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_settings_media' ) );
		add_filter( 'option_page_capability_tcg_store_platform', array( $this, 'settings_capability' ) );
		add_action( 'update_option_' . Settings::OPTION_NAME, array( $this, 'audit_settings_change' ), 10, 3 );
		add_action( 'update_option_' . FeatureFlags::OPTION_NAME, array( $this, 'audit_settings_change' ), 10, 3 );
	}

	public function settings_capability(): string {
		return 'manage_settings';
	}

	public function enqueue_settings_media(): void {
		$page = isset( $_GET['page'] ) ? sanitize_key( wp_unslash( (string) $_GET['page'] ) ) : '';

		if ( 'tcg-store-platform-settings' !== $page ) {
			return;
		}

		if ( function_exists( 'wp_enqueue_media' ) ) {
			wp_enqueue_media();
		}
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
			__( 'Inventory route gates', 'tcg-store-platform' ),
			array( $this, 'render_inventory_route_runtime' ),
			'tcg-store-platform',
			'tcg_store_platform_inventory_routes'
		);

		add_settings_section(
			'tcg_store_platform_store_ops',
			__( 'Store operations', 'tcg-store-platform' ),
			array( $this, 'render_store_ops_description' ),
			'tcg-store-platform'
		);

		add_settings_field(
			'grading_companies',
			__( 'Grading companies', 'tcg-store-platform' ),
			array( $this, 'render_grading_companies' ),
			'tcg-store-platform',
			'tcg_store_platform_store_ops'
		);

		add_settings_field(
			'customer_credit',
			__( 'Customer credit policy', 'tcg-store-platform' ),
			array( $this, 'render_customer_credit_policy' ),
			'tcg-store-platform',
			'tcg_store_platform_store_ops'
		);

		add_settings_field(
			'fulfillment_notifications',
			__( 'Fulfillment notifications', 'tcg-store-platform' ),
			array( $this, 'render_fulfillment_notifications' ),
			'tcg-store-platform',
			'tcg_store_platform_store_ops'
		);

		add_settings_section(
			'tcg_store_platform_offline_routes',
			__( 'Offline route runtime', 'tcg-store-platform' ),
			array( $this, 'render_offline_route_description' ),
			'tcg-store-platform'
		);

		add_settings_field(
			'offline_route_runtime',
			__( 'Offline route gates', 'tcg-store-platform' ),
			array( $this, 'render_offline_route_runtime' ),
			'tcg-store-platform',
			'tcg_store_platform_offline_routes'
		);

		add_settings_section(
			'tcg_store_platform_offline_pairing',
			__( 'Offline pairing authorization', 'tcg-store-platform' ),
			array( $this, 'render_offline_pairing_description' ),
			'tcg-store-platform'
		);

		add_settings_field(
			'offline_pairing_authorization',
			__( 'Pairing policy', 'tcg-store-platform' ),
			array( $this, 'render_offline_pairing_authorization' ),
			'tcg-store-platform',
			'tcg_store_platform_offline_pairing'
		);

		add_settings_section(
			'tcg_store_platform_scrydex',
			__( 'ScryDex', 'tcg-store-platform' ),
			array( $this, 'render_scrydex_description' ),
			'tcg-store-platform'
		);

		add_settings_field(
			'scrydex_provider',
			__( 'Provider access', 'tcg-store-platform' ),
			array( $this, 'render_scrydex_provider' ),
			'tcg-store-platform',
			'tcg_store_platform_scrydex'
		);

		add_settings_field(
			'scrydex_usage_budget',
			__( 'Usage budget', 'tcg-store-platform' ),
			array( $this, 'render_scrydex_usage_budget' ),
			'tcg-store-platform',
			'tcg_store_platform_scrydex'
		);

		add_settings_field(
			'scrydex_schedule',
			__( 'Daily refresh', 'tcg-store-platform' ),
			array( $this, 'render_scrydex_schedule' ),
			'tcg-store-platform',
			'tcg_store_platform_scrydex'
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
		echo esc_html__( 'White-label settings are shared by WordPress, kiosk, receipt, environment banner, and offline app surfaces so each company can use its own identity without code changes.', 'tcg-store-platform' );
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
			'staging_banner_color' => __( 'Environment banner', 'tcg-store-platform' ),
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
		echo esc_html__( 'Route runtime gates are separate from feature flags. Enable write and public-read routes only after the current production checklist is accepted.', 'tcg-store-platform' );
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
		echo esc_html__( 'Enable staff inventory search route.', 'tcg-store-platform' );
		echo '</label><br />';

		echo '<label>';
		echo '<input type="checkbox" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( InventoryRouteRuntimeSettings::KEY )
			. '][staff_create_route_enabled]" value="1" '
			. checked( ! empty( $runtime['staff_create_route_enabled'] ), true, false )
			. ' /> ';
		echo esc_html__( 'Enable staff inventory create route.', 'tcg-store-platform' );
		echo '</label><br />';

		echo '<label>';
		echo '<input type="checkbox" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( InventoryRouteRuntimeSettings::KEY )
			. '][staff_mark_sold_route_enabled]" value="1" '
			. checked( ! empty( $runtime['staff_mark_sold_route_enabled'] ), true, false )
			. ' /> ';
		echo esc_html__( 'Enable staff/Square POS mark-sold route.', 'tcg-store-platform' );
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
		echo esc_html__( 'Public search is ignored unless staff inventory search is enabled. Create stays read-safe for WooCommerce, Square, POS, and labels until separate projection gates are accepted.', 'tcg-store-platform' );
		echo '</p>';
		echo '</fieldset>';
	}

	public function render_store_ops_description(): void {
		echo '<p>';
		echo esc_html__( 'Store operations settings control graded-card intake labels, local-only customer credit, and staff fulfillment notifications.', 'tcg-store-platform' );
		echo '</p>';
	}

	public function render_grading_companies(): void {
		$settings  = Settings::all();
		$companies = GradingCompanySettings::companies_from_settings( $settings );

		echo '<textarea rows="4" class="large-text" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( GradingCompanySettings::KEY )
			. '][companies]">';
		echo esc_textarea( implode( "\n", $companies ) );
		echo '</textarea>';
		echo '<p class="description">';
		echo esc_html__( 'One company per line. Intake always keeps an Other option for custom grading labels.', 'tcg-store-platform' );
		echo '</p>';
	}

	public function render_customer_credit_policy(): void {
		$settings = Settings::all();
		$policy   = CustomerCreditSettings::sanitize( $settings[ CustomerCreditSettings::KEY ] ?? array() );

		echo '<fieldset>';
		echo '<label><input type="checkbox" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( CustomerCreditSettings::KEY )
			. '][local_store_only]" value="1" '
			. checked( ! empty( $policy['local_store_only'] ), true, false )
			. ' /> ';
		echo esc_html__( 'Keep customer credit local-store only.', 'tcg-store-platform' );
		echo '</label><br />';
		echo '<label><input type="checkbox" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( CustomerCreditSettings::KEY )
			. '][online_redemption_enabled]" value="1" '
			. checked( ! empty( $policy['online_redemption_enabled'] ), true, false )
			. ' /> ';
		echo esc_html__( 'Allow online credit redemption only when local-store-only mode is disabled.', 'tcg-store-platform' );
		echo '</label><br />';
		echo '<label>';
		echo esc_html__( 'Manager approval threshold cents', 'tcg-store-platform' ) . ' ';
		echo '<input type="number" min="0" step="100" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( CustomerCreditSettings::KEY )
			. '][manager_approval_threshold_minor_units]" value="'
			. esc_attr( (string) $policy['manager_approval_threshold_minor_units'] )
			. '" />';
		echo '</label>';
		echo '<p class="description">';
		echo esc_html__( 'Public checkout credit redemption remains hidden while local-store-only mode is enabled.', 'tcg-store-platform' );
		echo '</p></fieldset>';
	}

	public function render_fulfillment_notifications(): void {
		$settings = Settings::all();
		$policy   = FulfillmentNotificationSettings::sanitize( $settings[ FulfillmentNotificationSettings::KEY ] ?? array() );
		$field_id = 'tcg-fulfillment-notification-sound-url';

		echo '<fieldset>';
		echo '<label><input type="checkbox" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( FulfillmentNotificationSettings::KEY )
			. '][audio_enabled]" value="1" '
			. checked( ! empty( $policy['audio_enabled'] ), true, false )
			. ' /> ';
		echo esc_html__( 'Enable staff audio notification for new pickup orders.', 'tcg-store-platform' );
		echo '</label><br />';
		echo '<label><input type="checkbox" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( FulfillmentNotificationSettings::KEY )
			. '][ready_pickup_email_enabled]" value="1" '
			. checked( ! empty( $policy['ready_pickup_email_enabled'] ), true, false )
			. ' /> ';
		echo esc_html__( 'Email customers when an order is marked ready for pickup.', 'tcg-store-platform' );
		echo '</label><br />';
		echo '<label for="' . esc_attr( $field_id ) . '">';
		echo esc_html__( 'Notification sound file', 'tcg-store-platform' ) . ' ';
		echo '<input id="' . esc_attr( $field_id ) . '" type="url" class="regular-text" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( FulfillmentNotificationSettings::KEY )
			. '][notification_sound_url]" value="'
			. esc_attr( (string) $policy['notification_sound_url'] )
			. '" placeholder="'
			. esc_attr__( 'Choose an MP3 or MP4 from Media Library', 'tcg-store-platform' )
			. '" />';
		echo '</label> ';
		echo '<button type="button" class="button" data-tcg-select-fulfillment-sound data-target="' . esc_attr( $field_id ) . '">';
		echo esc_html__( 'Upload/select MP3 or MP4', 'tcg-store-platform' );
		echo '</button> ';
		echo '<button type="button" class="button" data-tcg-test-fulfillment-sound data-target="' . esc_attr( $field_id ) . '">';
		echo esc_html__( 'Test sound', 'tcg-store-platform' );
		echo '</button>';
		echo '<p class="description">';
		echo esc_html__( 'This sound is used only by the employee system for new kiosk or website pickup orders. Upload an MP3 or MP4 file from this site media library. Browsers may require staff to click Enable order sounds before playback starts.', 'tcg-store-platform' );
		echo '</p>';
		echo '<script>(function(){if(window.tcgFulfillmentNotificationMediaReady){return;}window.tcgFulfillmentNotificationMediaReady=true;document.addEventListener("click",function(event){var selectButton=event.target.closest("[data-tcg-select-fulfillment-sound]");if(selectButton){event.preventDefault();var input=document.getElementById(selectButton.getAttribute("data-target"));if(!input||!window.wp||!wp.media){return;}var frame=wp.media({title:"' . esc_js( __( 'Choose order notification sound', 'tcg-store-platform' ) ) . '",button:{text:"' . esc_js( __( 'Use this sound', 'tcg-store-platform' ) ) . '"},library:{type:["audio","video"]},multiple:false});frame.on("select",function(){var attachment=frame.state().get("selection").first();var data=attachment?attachment.toJSON():null;if(data&&data.url){input.value=data.url;input.dispatchEvent(new Event("change",{bubbles:true}));}});frame.open();return;}var testButton=event.target.closest("[data-tcg-test-fulfillment-sound]");if(testButton){event.preventDefault();var target=document.getElementById(testButton.getAttribute("data-target"));var url=target?target.value:"";if(url){new Audio(url).play().catch(function(){alert("' . esc_js( __( 'Click once in the employee app to enable browser sound notifications.', 'tcg-store-platform' ) ) . '");});}}});})();</script>';
		echo '</fieldset>';
	}

	public function render_offline_route_description(): void {
		echo '<p>';
		echo esc_html__( 'Offline route gates remain separate from feature flags and pairing-code policy. Enable only the device pairing route first, then verify registered devices before opening pull or push routes.', 'tcg-store-platform' );
		echo '</p>';
	}

	public function render_offline_route_runtime(): void {
		$runtime = OfflineRouteRuntimeSettings::from_settings( Settings::all() );

		echo '<fieldset>';
		$this->render_offline_route_checkbox(
			'device_pairing_route_enabled',
			__( 'Enable offline device pairing route.', 'tcg-store-platform' ),
			! empty( $runtime['device_pairing_route_enabled'] )
		);
		$this->render_offline_route_checkbox(
			'pull_route_enabled',
			__( 'Enable registered-device pull route after pairing acceptance.', 'tcg-store-platform' ),
			! empty( $runtime['pull_route_enabled'] )
		);
		$this->render_offline_route_checkbox(
			'push_route_enabled',
			__( 'Enable registered-device push route after queue persistence acceptance.', 'tcg-store-platform' ),
			! empty( $runtime['push_route_enabled'] )
		);
		$this->render_offline_route_checkbox(
			'conflict_routes_enabled',
			__( 'Enable offline conflict review routes after manager workflow acceptance.', 'tcg-store-platform' ),
			! empty( $runtime['conflict_routes_enabled'] )
		);
		echo '<p class="description">';
		echo esc_html__( 'The offline feature flag must also be enabled. Pull, push, and conflict gates should stay off until device pairing, local SQLite persistence, and production smoke tests pass.', 'tcg-store-platform' );
		echo '</p>';
		echo '</fieldset>';
	}

	public function render_offline_pairing_description(): void {
		echo '<p>';
		echo esc_html__( 'Pairing authorization controls which manager-issued code can register desktop devices. Raw codes submitted here are hashed on save and never stored.', 'tcg-store-platform' );
		echo '</p>';
	}

	public function render_offline_pairing_authorization(): void {
		$policy = OfflinePairingAuthorizationSettings::policy( Settings::all() );

		echo '<fieldset>';
		echo '<p><label for="tcg-store-offline-pairing-code">';
		echo esc_html__( 'New pairing code', 'tcg-store-platform' );
		echo '</label> ';
		echo '<input type="password" autocomplete="off" id="tcg-store-offline-pairing-code" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( OfflinePairingAuthorizationSettings::KEY )
			. '][pairing_code]" value="" placeholder="'
			. esc_attr__( 'Hashed on save', 'tcg-store-platform' )
			. '" class="regular-text" /></p>';

		echo '<p><label for="tcg-store-offline-pairing-hashes">';
		echo esc_html__( 'Allowed pairing code hashes', 'tcg-store-platform' );
		echo '</label><br />';
		echo '<textarea id="tcg-store-offline-pairing-hashes" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( OfflinePairingAuthorizationSettings::KEY )
			. '][pairing_code_hashes]" rows="3" class="large-text code">';
		echo esc_textarea( implode( "\n", $policy['pairing_code_hashes'] ) );
		echo '</textarea></p>';

		$this->render_offline_pairing_text_input(
			'manager_ids',
			__( 'Allowed manager IDs', 'tcg-store-platform' ),
			implode( ', ', $policy['manager_ids'] )
		);
		$this->render_offline_pairing_text_input(
			'location_ids',
			__( 'Allowed location IDs', 'tcg-store-platform' ),
			implode( ', ', $policy['location_ids'] )
		);

		foreach ( array( 'staff', 'kiosk', 'admin' ) as $mode ) {
			$this->render_offline_pairing_scope_input(
				$mode,
				$policy['allowed_scopes_by_mode'][ $mode ] ?? array()
			);
		}

		$this->render_offline_pairing_text_input(
			'expires_at_utc',
			__( 'Expires at UTC', 'tcg-store-platform' ),
			(string) $policy['expires_at_utc'],
			'text',
			'2026-06-08T23:59:59Z'
		);

		echo '<p class="description">';
		echo esc_html__( 'For the current offline app, staff mode should include offline_pull, offline_push, and conflicts. Enable the offline_sync feature flag and device-pairing route gate only after backup confirmation.', 'tcg-store-platform' );
		echo '</p>';
		echo '</fieldset>';
	}

	public function render_scrydex_description(): void {
		echo '<p>';
		echo esc_html__( 'Configure server-side ScryDex reference-card sync. Values are saved in WordPress settings, redacted from status output, and never sent to local apps.', 'tcg-store-platform' );
		echo '</p>';
	}

	public function render_scrydex_provider(): void {
		$settings = ScryDexProviderSettings::from_settings( Settings::all() );
		$status   = ScryDexProviderSettings::public_status( $settings );

		echo '<fieldset>';
		echo '<label>';
		echo '<input type="checkbox" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( ScryDexProviderSettings::KEY )
			. '][enabled]" value="1" '
			. checked( ! empty( $settings['enabled'] ), true, false )
			. ' /> ';
		echo esc_html__( 'Enable ScryDex catalog sync.', 'tcg-store-platform' );
		echo '</label><br />';

		echo '<label for="tcg-store-scrydex-environment">';
		echo esc_html__( 'Environment', 'tcg-store-platform' );
		echo '</label> ';
		echo '<select id="tcg-store-scrydex-environment" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( ScryDexProviderSettings::KEY )
			. '][environment]">';
		foreach ( array( 'disabled', 'sandbox', 'staging', 'production' ) as $environment ) {
			echo '<option value="' . esc_attr( $environment ) . '" '
				. selected( (string) $settings['environment'], $environment, false )
				. '>';
			echo esc_html( ucwords( str_replace( '_', ' ', $environment ) ) );
			echo '</option>';
		}
		echo '</select><br />';

		$this->render_scrydex_text_input(
			'base_url',
			__( 'Base URL', 'tcg-store-platform' ),
			(string) $settings['base_url'],
			'url'
		);
		$this->render_scrydex_secret_input(
			'team_id',
			__( 'Team ID', 'tcg-store-platform' ),
			true === $status['team_id_configured'],
			'clear_team_id'
		);
		$this->render_scrydex_secret_input(
			'primary_api_key',
			__( 'Primary key', 'tcg-store-platform' ),
			true === $status['primary_key_configured'],
			'clear_primary_api_key'
		);
		$this->render_scrydex_secret_input(
			'secondary_api_key',
			__( 'Secondary key', 'tcg-store-platform' ),
			true === $status['secondary_key_configured'],
			'clear_secondary_api_key'
		);
		$this->render_scrydex_text_input(
			'request_timeout_seconds',
			__( 'Timeout seconds', 'tcg-store-platform' ),
			(string) $settings['request_timeout_seconds'],
			'number'
		);

		echo '<p class="description">';
		echo esc_html(
				sprintf(
				/* translators: 1: status, 2: active key slot. */
				__( 'Status: %1$s. Active key slot: %2$s. Network requests are enabled only when the ScryDex provider is configured and catalog sync is started.', 'tcg-store-platform' ),
				(string) $status['status'],
				(string) $status['active_key_slot']
			)
		);
		echo '</p>';
		echo '</fieldset>';
	}

	public function render_scrydex_usage_budget(): void {
		$settings = ScryDexUsageBudgetSettings::from_settings( Settings::all() );
		$status   = ScryDexUsageBudgetSettings::public_status( $settings );

		echo '<fieldset>';
		echo '<label>';
		echo '<input type="checkbox" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( ScryDexUsageBudgetSettings::KEY )
			. '][enabled]" value="1" '
			. checked( ! empty( $settings['enabled'] ), true, false )
			. ' /> ';
		echo esc_html__( 'Enable usage-budget gate.', 'tcg-store-platform' );
		echo '</label><br />';

		$this->render_scrydex_budget_number_input(
			'daily_credit_budget',
			__( 'Daily credit budget', 'tcg-store-platform' ),
			(int) $settings['daily_credit_budget']
		);
		$this->render_scrydex_budget_number_input(
			'minimum_remaining_credits',
			__( 'Minimum remaining credits', 'tcg-store-platform' ),
			(int) $settings['minimum_remaining_credits']
		);
		$this->render_scrydex_budget_number_input(
			'per_cards_page_credit_estimate',
			__( 'Estimated credits per cards page', 'tcg-store-platform' ),
			(int) $settings['per_cards_page_credit_estimate']
		);
		$this->render_scrydex_budget_number_input(
			'usage_snapshot_max_age_minutes',
			__( 'Usage snapshot max age minutes', 'tcg-store-platform' ),
			(int) $settings['usage_snapshot_max_age_minutes']
		);

		echo '<p class="description">';
		echo esc_html(
				sprintf(
				/* translators: 1: status. */
				__( 'Status: %1$s. Usage endpoint requests are optional for manual enterprise indexing.', 'tcg-store-platform' ),
				(string) $status['status']
			)
		);
		echo '</p>';
		echo '</fieldset>';
	}

	public function render_scrydex_schedule(): void {
		$settings = ScryDexScheduleSettings::from_settings( Settings::all() );
		$status   = ScryDexScheduleSettings::public_status( $settings );

		echo '<fieldset>';
		$this->render_scrydex_schedule_checkbox(
			'enabled',
			__( 'Enable daily ScryDex cards refresh from the 9:00 AM platform schedule.', 'tcg-store-platform' ),
			! empty( $settings['enabled'] )
		);
		$this->render_scrydex_schedule_checkbox(
			'network_requests_enabled',
			__( 'Allow scheduled ScryDex network requests.', 'tcg-store-platform' ),
			! empty( $settings['network_requests_enabled'] )
		);
		$this->render_scrydex_schedule_checkbox(
			'database_writes_enabled',
			__( 'Allow scheduled reference-card database writes.', 'tcg-store-platform' ),
			! empty( $settings['database_writes_enabled'] )
		);
		$this->render_scrydex_schedule_checkbox(
			'execute_database_writes',
			__( 'Confirm scheduled execution of ScryDex persistence writes.', 'tcg-store-platform' ),
			! empty( $settings['execute_database_writes'] )
		);
		$this->render_scrydex_schedule_text_input(
			'game_keys',
			__( 'Game keys', 'tcg-store-platform' ),
			implode( ', ', $settings['game_keys'] )
		);
		$this->render_scrydex_schedule_number_input(
			'cards_page_size',
			__( 'Cards page size', 'tcg-store-platform' ),
			(int) $settings['cards_page_size']
		);
		$this->render_scrydex_schedule_number_input(
			'max_pages_per_game_run',
			__( 'Max pages per game per run', 'tcg-store-platform' ),
			(int) $settings['max_pages_per_game_run']
		);

		echo '<p class="description">';
		echo esc_html(
				sprintf(
				/* translators: 1: status. */
				__( 'Status: %1$s. Scheduled sync runs when these gates and the ScryDex provider are enabled.', 'tcg-store-platform' ),
				(string) $status['status']
			)
		);
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

	private function render_scrydex_text_input( string $key, string $label, string $value, string $type ): void {
		echo '<p><label for="tcg-store-scrydex-' . esc_attr( $key ) . '">';
		echo esc_html( $label );
		echo '</label> ';
		echo '<input type="' . esc_attr( $type ) . '" id="tcg-store-scrydex-' . esc_attr( $key ) . '" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( ScryDexProviderSettings::KEY )
			. '][' . esc_attr( $key ) . ']" value="'
			. esc_attr( $value )
			. '" class="regular-text" /></p>';
	}

	private function render_scrydex_budget_number_input( string $key, string $label, int $value ): void {
		echo '<p><label for="tcg-store-scrydex-budget-' . esc_attr( $key ) . '">';
		echo esc_html( $label );
		echo '</label> ';
		echo '<input type="number" min="0" id="tcg-store-scrydex-budget-' . esc_attr( $key ) . '" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( ScryDexUsageBudgetSettings::KEY )
			. '][' . esc_attr( $key ) . ']" value="'
			. esc_attr( (string) $value )
			. '" class="regular-text" /></p>';
	}

	private function render_scrydex_schedule_checkbox( string $key, string $label, bool $checked ): void {
		echo '<label>';
		echo '<input type="checkbox" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( ScryDexScheduleSettings::KEY )
			. '][' . esc_attr( $key )
			. ']" value="1" '
			. checked( $checked, true, false )
			. ' /> ';
		echo esc_html( $label );
		echo '</label><br />';
	}

	private function render_scrydex_schedule_text_input( string $key, string $label, string $value ): void {
		echo '<p><label for="tcg-store-scrydex-schedule-' . esc_attr( $key ) . '">';
		echo esc_html( $label );
		echo '</label> ';
		echo '<input type="text" id="tcg-store-scrydex-schedule-' . esc_attr( $key ) . '" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( ScryDexScheduleSettings::KEY )
			. '][' . esc_attr( $key ) . ']" value="'
			. esc_attr( $value )
			. '" class="regular-text" /></p>';
	}

	private function render_scrydex_schedule_number_input( string $key, string $label, int $value ): void {
		echo '<p><label for="tcg-store-scrydex-schedule-' . esc_attr( $key ) . '">';
		echo esc_html( $label );
		echo '</label> ';
		echo '<input type="number" min="1" id="tcg-store-scrydex-schedule-' . esc_attr( $key ) . '" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( ScryDexScheduleSettings::KEY )
			. '][' . esc_attr( $key ) . ']" value="'
			. esc_attr( (string) $value )
			. '" class="regular-text" /></p>';
	}

	private function render_offline_pairing_text_input(
		string $key,
		string $label,
		string $value,
		string $type = 'text',
		string $placeholder = ''
	): void {
		echo '<p><label for="tcg-store-offline-pairing-' . esc_attr( $key ) . '">';
		echo esc_html( $label );
		echo '</label> ';
		echo '<input type="' . esc_attr( $type ) . '" id="tcg-store-offline-pairing-' . esc_attr( $key ) . '" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( OfflinePairingAuthorizationSettings::KEY )
			. '][' . esc_attr( $key ) . ']" value="'
			. esc_attr( $value )
			. '" placeholder="'
			. esc_attr( $placeholder )
			. '" class="regular-text" /></p>';
	}

	/**
	 * @param list<string> $scopes Allowed scopes.
	 */
	private function render_offline_pairing_scope_input( string $mode, array $scopes ): void {
		echo '<p><label for="tcg-store-offline-pairing-scopes-' . esc_attr( $mode ) . '">';
		echo esc_html(
			sprintf(
				/* translators: %s: device mode. */
				__( '%s scopes', 'tcg-store-platform' ),
				ucfirst( $mode )
			)
		);
		echo '</label> ';
		echo '<input type="text" id="tcg-store-offline-pairing-scopes-' . esc_attr( $mode ) . '" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( OfflinePairingAuthorizationSettings::KEY )
			. '][allowed_scopes_by_mode][' . esc_attr( $mode ) . ']" value="'
			. esc_attr( implode( ' ', $scopes ) )
			. '" class="regular-text" /></p>';
	}

	private function render_scrydex_secret_input(
		string $key,
		string $label,
		bool $configured,
		string $clear_key
	): void {
		$placeholder = $configured
			? __( 'Configured - leave blank to keep', 'tcg-store-platform' )
			: __( 'Not configured', 'tcg-store-platform' );

		echo '<p><label for="tcg-store-scrydex-' . esc_attr( $key ) . '">';
		echo esc_html( $label );
		echo '</label> ';
		echo '<input type="password" autocomplete="off" id="tcg-store-scrydex-' . esc_attr( $key ) . '" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( ScryDexProviderSettings::KEY )
			. '][' . esc_attr( $key ) . ']" value="" placeholder="'
			. esc_attr( $placeholder )
			. '" class="regular-text" /> ';
		echo '<label>';
		echo '<input type="checkbox" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( ScryDexProviderSettings::KEY )
			. '][' . esc_attr( $clear_key ) . ']" value="1" /> ';
		echo esc_html__( 'Clear saved value', 'tcg-store-platform' );
		echo '</label></p>';
	}

	private function render_offline_route_checkbox( string $key, string $label, bool $checked ): void {
		echo '<label>';
		echo '<input type="checkbox" name="'
			. esc_attr( Settings::OPTION_NAME )
			. '[' . esc_attr( OfflineRouteRuntimeSettings::KEY )
			. '][' . esc_attr( $key )
			. ']" value="1" '
			. checked( $checked, true, false )
			. ' /> ';
		echo esc_html( $label );
		echo '</label><br />';
	}
}
