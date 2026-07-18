<?php
/**
 * Fulfillment notification settings.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Settings;

final class FulfillmentNotificationSettings {
	public const KEY = 'fulfillment_notifications';

	/**
	 * @return array<string, mixed>
	 */
	public static function defaults(): array {
		return array(
			'audio_enabled'             => true,
			'ready_pickup_email_enabled' => true,
			'notification_sound_url'    => '',
			'employee_only'             => true,
		);
	}

	/**
	 * @param mixed                $value Submitted settings.
	 * @param array<string, mixed> $fallback Existing safe settings.
	 * @return array<string, mixed>
	 */
	public static function sanitize( mixed $value, array $fallback = array() ): array {
		$value    = is_array( $value ) ? $value : array();
		$fallback = array_merge( self::defaults(), $fallback );
		$url      = trim( (string) ( $value['notification_sound_url'] ?? $fallback['notification_sound_url'] ) );

		if ( '' !== $url && 1 !== preg_match( '#^https?://#i', $url ) ) {
			$url = '';
		}

		if ( '' !== $url && 1 !== preg_match( '#\.(mp3|mp4)(?:\?.*)?$#i', $url ) ) {
			$url = '';
		}

		return array(
			'audio_enabled'              => array_key_exists( 'audio_enabled', $value )
				? ! empty( $value['audio_enabled'] )
				: (bool) $fallback['audio_enabled'],
			'ready_pickup_email_enabled' => array_key_exists( 'ready_pickup_email_enabled', $value )
				? ! empty( $value['ready_pickup_email_enabled'] )
				: (bool) $fallback['ready_pickup_email_enabled'],
			'notification_sound_url'     => $url,
			'employee_only'              => true,
		);
	}

	/**
	 * Sanitize an HTML settings submission where unchecked boxes are omitted.
	 *
	 * @param mixed                $value Submitted settings.
	 * @param array<string, mixed> $fallback Existing safe settings.
	 * @return array<string, mixed>
	 */
	public static function sanitize_submission( mixed $value, array $fallback = array() ): array {
		$value  = is_array( $value ) ? $value : array();
		$result = self::sanitize( $value, $fallback );

		$result['audio_enabled']              = ! empty( $value['audio_enabled'] );
		$result['ready_pickup_email_enabled'] = ! empty( $value['ready_pickup_email_enabled'] );

		return $result;
	}

	private function __construct() {
	}
}
