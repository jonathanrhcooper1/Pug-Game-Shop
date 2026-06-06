<?php
/**
 * Plans WooCommerce order lifecycle transitions for serialized inventory.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

use TCGStorePlatform\Inventory\InventoryStatus;
use TCGStorePlatform\Reservations\ReservationStatus;

final class SerializedOrderLifecyclePlanner {
	public const ACTION_CHECKOUT_PROCESSED = 'checkout_processed';
	public const ACTION_PAYMENT_COMPLETE   = 'payment_complete';
	public const ACTION_ORDER_FAILED       = 'order_failed';
	public const ACTION_ORDER_CANCELLED    = 'order_cancelled';
	public const ACTION_ORDER_REFUNDED     = 'order_refunded';

	/**
	 * @param list<array<string, mixed>> $line_items WooCommerce order line item snapshots.
	 */
	public function plan( string $action, int $order_id, array $line_items ): SerializedOrderLifecyclePlan {
		$config = $this->action_config( $action );

		if ( null === $config ) {
			return SerializedOrderLifecyclePlan::from_parts(
				$action,
				array(),
				array(),
				array(
					array(
						'errors' => array( 'invalid_action' ),
					),
				)
			);
		}

		if ( $order_id <= 0 ) {
			return SerializedOrderLifecyclePlan::from_parts(
				$action,
				array(),
				array(),
				array(
					array(
						'errors' => array( 'invalid_order' ),
					),
				)
			);
		}

		$transitions        = array();
		$skipped_line_items = array();
		$errors             = array();
		$seen_reservations  = array();

		foreach ( $line_items as $index => $line_item ) {
			$metadata = $line_item['metadata'] ?? array();

			if ( ! is_array( $metadata ) || ! $this->is_serialized_line( $metadata ) ) {
				$skipped_line_items[] = $this->skip_payload( $index, $line_item, 'not_serialized_inventory' );
				continue;
			}

			$order_item_id  = $this->positive_int( $line_item['order_item_id'] ?? null );
			$line_errors    = $this->metadata_errors( $metadata );
			$reservation_id = $this->positive_int( $metadata['_tcg_reservation_id'] ?? null );

			if ( null === $order_item_id ) {
				$line_errors[] = 'order_item_id_required';
			}

			if ( null !== $reservation_id && isset( $seen_reservations[ $reservation_id ] ) ) {
				$line_errors[] = 'duplicate_reservation_line';
			}

			if ( array() !== $line_errors ) {
				$errors[] = array(
					'index'         => $index,
					'order_item_id' => $order_item_id,
					'errors'        => $line_errors,
				);
				continue;
			}

			$seen_reservations[ $reservation_id ] = true;
			$transitions[]                        = $this->transition_payload(
				$action,
				$config,
				$order_id,
				$order_item_id,
				$metadata
			);
		}

		return SerializedOrderLifecyclePlan::from_parts( $action, $transitions, $skipped_line_items, $errors );
	}

	/**
	 * @return array<string, string>|null
	 */
	private function action_config( string $action ): ?array {
		$configs = array(
			self::ACTION_CHECKOUT_PROCESSED => array(
				'operation'                 => 'link_order',
				'target_reservation_status' => ReservationStatus::ACTIVE,
				'target_inventory_status'   => InventoryStatus::RESERVED,
				'reason'                    => 'checkout_processed',
			),
			self::ACTION_PAYMENT_COMPLETE   => array(
				'operation'                 => 'convert_to_sale',
				'target_reservation_status' => ReservationStatus::CONVERTED,
				'target_inventory_status'   => InventoryStatus::SOLD,
				'reason'                    => 'payment_complete',
			),
			self::ACTION_ORDER_FAILED       => array(
				'operation'                 => 'release_reservation',
				'target_reservation_status' => ReservationStatus::RELEASED,
				'target_inventory_status'   => InventoryStatus::AVAILABLE,
				'reason'                    => 'payment_failed',
			),
			self::ACTION_ORDER_CANCELLED    => array(
				'operation'                 => 'release_reservation',
				'target_reservation_status' => ReservationStatus::RELEASED,
				'target_inventory_status'   => InventoryStatus::AVAILABLE,
				'reason'                    => 'order_cancelled',
			),
			self::ACTION_ORDER_REFUNDED     => array(
				'operation'                 => 'mark_return_review',
				'target_reservation_status' => ReservationStatus::CONVERTED,
				'target_inventory_status'   => InventoryStatus::RETURN_REVIEW,
				'reason'                    => 'order_refunded',
			),
		);

		return $configs[ $action ] ?? null;
	}

	/**
	 * @param array<string, mixed> $metadata Order line metadata.
	 * @return list<string>
	 */
	private function metadata_errors( array $metadata ): array {
		$errors = array();

		if ( null === $this->positive_int( $metadata['_tcg_inventory_id'] ?? null ) ) {
			$errors[] = 'inventory_id_required';
		}

		if ( null === $this->positive_int( $metadata['_tcg_reservation_id'] ?? null ) ) {
			$errors[] = 'reservation_id_required';
		}

		if ( ! $this->valid_hash( $metadata['_tcg_owner_token_hash'] ?? null ) ) {
			$errors[] = 'owner_token_hash_required';
		}

		if ( ! $this->nonnegative_int( $metadata['_tcg_price_minor_units'] ?? null ) ) {
			$errors[] = 'price_snapshot_required';
		}

		if ( ! $this->valid_currency( $metadata['_tcg_currency'] ?? null ) ) {
			$errors[] = 'currency_required';
		}

		if ( '' === $this->clean_string( $metadata['_tcg_reservation_expires'] ?? '' ) ) {
			$errors[] = 'reservation_expiry_required';
		}

		if ( ! $this->valid_hash( $metadata['_tcg_snapshot_hash'] ?? null ) ) {
			$errors[] = 'snapshot_hash_required';
		}

		return $errors;
	}

	/**
	 * @param array<string, string> $config Action configuration.
	 * @param array<string, mixed>  $metadata Order line metadata.
	 * @return array<string, mixed>
	 */
	private function transition_payload(
		string $action,
		array $config,
		int $order_id,
		int $order_item_id,
		array $metadata
	): array {
		$reservation_id = (int) $metadata['_tcg_reservation_id'];

		return array(
			'action'                    => $action,
			'operation'                 => $config['operation'],
			'order_id'                  => $order_id,
			'order_item_id'             => $order_item_id,
			'reservation_id'            => $reservation_id,
			'inventory_id'              => (int) $metadata['_tcg_inventory_id'],
			'owner_token_hash'          => strtolower( $this->clean_string( $metadata['_tcg_owner_token_hash'] ) ),
			'price_minor_units'         => (int) $metadata['_tcg_price_minor_units'],
			'currency'                  => strtoupper( $this->clean_string( $metadata['_tcg_currency'] ) ),
			'reservation_expires'       => $this->clean_string( $metadata['_tcg_reservation_expires'] ),
			'snapshot_hash'             => strtolower( $this->clean_string( $metadata['_tcg_snapshot_hash'] ) ),
			'target_reservation_status' => $config['target_reservation_status'],
			'target_inventory_status'   => $config['target_inventory_status'],
			'reason'                    => $config['reason'],
			'idempotency_key'           => $this->idempotency_key(
				$action,
				$order_id,
				$order_item_id,
				$reservation_id
			),
		);
	}

	/**
	 * @param array<string, mixed> $metadata Order line metadata.
	 */
	private function is_serialized_line( array $metadata ): bool {
		return '1' === $this->clean_string( $metadata['_tcg_serialized_inventory'] ?? '' );
	}

	/**
	 * @param array<string, mixed> $line_item Order line item data.
	 * @return array<string, mixed>
	 */
	private function skip_payload( int $index, array $line_item, string $reason ): array {
		return array(
			'index'         => $index,
			'order_item_id' => $this->positive_int( $line_item['order_item_id'] ?? null ),
			'reason'        => $reason,
		);
	}

	private function positive_int( mixed $value ): ?int {
		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		return null;
	}

	private function nonnegative_int( mixed $value ): bool {
		if ( is_int( $value ) ) {
			return $value >= 0;
		}

		return is_string( $value ) && 1 === preg_match( '/^\d+$/', $value );
	}

	private function valid_currency( mixed $value ): bool {
		return 1 === preg_match( '/^[A-Z]{3}$/', strtoupper( $this->clean_string( $value ) ) );
	}

	private function valid_hash( mixed $value ): bool {
		return 1 === preg_match( '/^[a-f0-9]{64}$/i', $this->clean_string( $value ) );
	}

	private function clean_string( mixed $value ): string {
		return trim( (string) $value );
	}

	private function idempotency_key( string $action, int $order_id, int $order_item_id, int $reservation_id ): string {
		$fingerprint = hash(
			'sha256',
			$action . '|' . (string) $order_id . '|' . (string) $order_item_id . '|' . (string) $reservation_id
		);

		return 'woo-' . $action . '-' . $order_id . '-' . substr( $fingerprint, 0, 16 );
	}
}
