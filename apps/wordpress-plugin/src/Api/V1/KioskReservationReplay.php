<?php
/**
 * Kiosk reservation replay identity and response mapping.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class KioskReservationReplay {
	public static function idempotency_key( string $order_id, string $inventory_public_id ): string {
		return $order_id . ':' . $inventory_public_id;
	}

	/**
	 * @param array<string, mixed> $reservation Existing reservation row.
	 * @return array<string, mixed>
	 */
	public static function response_item( array $reservation, string $inventory_public_id ): array {
		return array(
			'reservation_id'      => (int) ( $reservation['reservation_id'] ?? 0 ),
			'inventory_public_id' => $inventory_public_id,
			'status'              => (string) ( $reservation['status'] ?? '' ),
			'expires_at'          => (string) ( $reservation['expires_at'] ?? '' ),
			'idempotent_replay'   => true,
		);
	}

	private function __construct() {
	}
}
