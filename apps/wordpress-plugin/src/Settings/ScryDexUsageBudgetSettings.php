<?php
/**
 * ScryDex usage budget settings.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Settings;

final class ScryDexUsageBudgetSettings {
	public const KEY = 'scrydex_usage_budget';

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'enabled'                        => false,
			'daily_credit_budget'            => 0,
			'minimum_remaining_credits'      => 0,
			'per_cards_page_credit_estimate' => 1,
			'usage_snapshot_max_age_minutes' => 15,
		);
	}

	/**
	 * @param array<string, mixed> $settings Full platform settings or budget settings.
	 * @return array<string, mixed>
	 */
	public static function from_settings( array $settings ): array {
		return self::sanitize( $settings[ self::KEY ] ?? $settings );
	}

	/**
	 * @param mixed                $value Submitted budget settings.
	 * @param array<string, mixed> $existing Existing stored budget settings.
	 * @return array<string, mixed>
	 */
	public static function sanitize( mixed $value, array $existing = array() ): array {
		$value    = is_array( $value ) ? $value : array();
		$existing = array_merge( self::defaults(), $existing );

		return array(
			'enabled'                        => ! empty( $value['enabled'] ),
			'daily_credit_budget'            => self::non_negative_int(
				$value['daily_credit_budget'] ?? $existing['daily_credit_budget'],
				1000000
			),
			'minimum_remaining_credits'      => self::non_negative_int(
				$value['minimum_remaining_credits'] ?? $existing['minimum_remaining_credits'],
				1000000
			),
			'per_cards_page_credit_estimate' => self::positive_int(
				$value['per_cards_page_credit_estimate'] ?? $existing['per_cards_page_credit_estimate'],
				10000
			),
			'usage_snapshot_max_age_minutes' => self::positive_int(
				$value['usage_snapshot_max_age_minutes'] ?? $existing['usage_snapshot_max_age_minutes'],
				1440
			),
		);
	}

	/**
	 * @param array<string, mixed> $settings Full platform settings or budget settings.
	 * @return array<string, mixed>
	 */
	public static function public_status( array $settings ): array {
		$settings   = self::from_settings( $settings );
		$enabled    = true === $settings['enabled'];
		$daily      = (int) $settings['daily_credit_budget'];
		$minimum    = (int) $settings['minimum_remaining_credits'];
		$configured = $enabled && $daily > 0 && $minimum <= $daily;
		$issues     = array();

		if ( ! $enabled ) {
			$issues[] = 'scrydex_usage_budget_disabled';
		}

		if ( $daily <= 0 ) {
			$issues[] = 'scrydex_daily_credit_budget_missing';
		}

		if ( $minimum > $daily ) {
			$issues[] = 'scrydex_minimum_remaining_exceeds_daily_budget';
		}

		return array(
			'configured'                       => $configured,
			'status'                           => $configured ? 'ready' : 'blocked',
			'enabled'                          => $enabled,
			'daily_credit_budget'              => $daily,
			'minimum_remaining_credits'        => $minimum,
			'per_cards_page_credit_estimate'   => (int) $settings['per_cards_page_credit_estimate'],
			'usage_snapshot_max_age_minutes'   => (int) $settings['usage_snapshot_max_age_minutes'],
			'provider_usage_requests_deferred' => true,
			'network_requests_deferred'        => true,
			'configuration_issues'             => array_values( array_unique( $issues ) ),
		);
	}

	/**
	 * @param array<string, mixed> $settings Full platform settings or budget settings.
	 * @return array{value:string,status:string}
	 */
	public static function admin_summary( array $settings ): array {
		$status = self::public_status( $settings );

		return array(
			'value'  => sprintf(
				'daily %d; reserve %d; page estimate %d; usage requests deferred',
				(int) $status['daily_credit_budget'],
				(int) $status['minimum_remaining_credits'],
				(int) $status['per_cards_page_credit_estimate']
			),
			'status' => true === $status['configured'] ? 'ready' : 'degraded',
		);
	}

	private static function non_negative_int( mixed $value, int $max ): int {
		return max( 0, min( $max, (int) $value ) );
	}

	private static function positive_int( mixed $value, int $max ): int {
		return max( 1, min( $max, (int) $value ) );
	}

	private function __construct() {
	}
}
