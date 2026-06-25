<?php
/**
 * Official WooCommerce Square extension readiness.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Square;

final class WooCommerceSquareExtensionStatus {
	public const PLUGIN_FILE = 'woocommerce-square/woocommerce-square.php';

	private const KNOWN_PLUGIN_FILES = array(
		self::PLUGIN_FILE,
	);

	private const KNOWN_CLASS_SIGNALS = array(
		'WooCommerce_Square_Loader',
		'WooCommerce_Square',
		'WC_Square',
	);

	/**
	 * @var callable|null
	 */
	private $active_plugins_provider;

	/**
	 * @var callable|null
	 */
	private $installed_plugins_provider;

	/**
	 * @var callable|null
	 */
	private $class_exists_provider;

	public function __construct(
		?callable $active_plugins_provider = null,
		?callable $installed_plugins_provider = null,
		?callable $class_exists_provider = null
	) {
		$this->active_plugins_provider    = $active_plugins_provider;
		$this->installed_plugins_provider = $installed_plugins_provider;
		$this->class_exists_provider      = $class_exists_provider;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function readiness_summary(): array {
		$active_plugins    = $this->active_plugins();
		$installed_plugins = $this->installed_plugins();
		$class_signal      = $this->class_signal_detected();
		$active            = $class_signal || $this->contains_known_plugin( $active_plugins );
		$installed         = $active || $this->contains_known_plugin( $installed_plugins );
		$issues            = array();

		if ( ! $installed ) {
			$issues[] = 'official_woocommerce_square_extension_not_installed';
		}

		if ( ! $active ) {
			$issues[] = 'official_woocommerce_square_extension_not_active';
		}

		return array(
			'status'                                  => $active ? 'ready' : 'blocked',
			'official_woocommerce_square_extension_required' => true,
			'official_woocommerce_square_plugin_file' => self::PLUGIN_FILE,
			'known_plugin_files'                      => self::KNOWN_PLUGIN_FILES,
			'known_class_signals'                     => self::KNOWN_CLASS_SIGNALS,
			'extension_installed'                     => $installed,
			'extension_active'                        => $active,
			'class_signal_detected'                   => $class_signal,
			'payment_capture_authority'               => SquarePaymentDelegationPolicy::PAYMENT_CAPTURE_AUTHORITY,
			'plugin_square_payment_capture_allowed'   => false,
			'plugin_square_refund_execution_allowed'  => false,
			'plugin_square_custom_gateway_allowed'    => false,
			'square_inventory_sync_scope'             => SquarePaymentDelegationPolicy::INVENTORY_SYNC_SCOPE,
			'square_network_writes_deferred'          => true,
			'provider_credentials_redacted'           => true,
			'configuration_issues'                    => array_values( array_unique( $issues ) ),
		);
	}

	/**
	 * @return array{value:string,status:string}
	 */
	public function admin_summary(): array {
		$summary = $this->readiness_summary();

		return array(
			'value'  => true === $summary['extension_active']
				? 'Official WooCommerce Square extension active'
				: 'Official WooCommerce Square extension not active',
			'status' => 'ready' === $summary['status'] ? 'ok' : 'blocked',
		);
	}

	/**
	 * @return list<string>
	 */
	private function active_plugins(): array {
		if ( is_callable( $this->active_plugins_provider ) ) {
			return $this->normalize_plugin_list( ( $this->active_plugins_provider )() );
		}

		$active_plugins = array();

		if ( function_exists( 'get_option' ) ) {
			$option_plugins = get_option( 'active_plugins', array() );
			$active_plugins = is_array( $option_plugins ) ? $option_plugins : array();
		}

		if ( function_exists( 'get_site_option' ) ) {
			$sitewide_plugins = get_site_option( 'active_sitewide_plugins', array() );
			if ( is_array( $sitewide_plugins ) ) {
				$active_plugins = array_merge( $active_plugins, array_keys( $sitewide_plugins ) );
			}
		}

		return $this->normalize_plugin_list( $active_plugins );
	}

	/**
	 * @return list<string>
	 */
	private function installed_plugins(): array {
		if ( is_callable( $this->installed_plugins_provider ) ) {
			return $this->normalize_plugin_list( ( $this->installed_plugins_provider )() );
		}

		if ( function_exists( 'get_plugins' ) ) {
			return $this->normalize_plugin_list( array_keys( get_plugins() ) );
		}

		return array();
	}

	private function class_signal_detected(): bool {
		foreach ( self::KNOWN_CLASS_SIGNALS as $class_name ) {
			$exists = is_callable( $this->class_exists_provider )
				? ( $this->class_exists_provider )( $class_name )
				: class_exists( $class_name, false );

			if ( true === $exists ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * @param list<string> $plugins Plugin files.
	 */
	private function contains_known_plugin( array $plugins ): bool {
		foreach ( $plugins as $plugin_file ) {
			if ( in_array( $plugin_file, self::KNOWN_PLUGIN_FILES, true ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * @return list<string>
	 */
	private function normalize_plugin_list( mixed $plugins ): array {
		if ( ! is_array( $plugins ) ) {
			return array();
		}

		return array_values(
			array_filter(
				array_map(
					static fn ( mixed $plugin ): string => ( is_array( $plugin ) || is_object( $plugin ) )
						? ''
						: trim( (string) $plugin ),
					$plugins
				),
				static fn ( string $plugin ): bool => '' !== $plugin
			)
		);
	}
}
