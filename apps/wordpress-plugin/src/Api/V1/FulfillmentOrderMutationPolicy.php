<?php
/**
 * Fulfillment order eligibility and state transition policy.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class FulfillmentOrderMutationPolicy {
	/**
	 * @var array<string, int>
	 */
	private const STATUS_RANKS = array(
		'awaiting_pull'    => 0,
		'pulling'          => 1,
		'ready_for_pickup' => 2,
		'completed'        => 3,
	);

	/**
	 * @return array{eligible: bool, code: string}
	 */
	public static function eligibility( bool $paid, bool $local_pickup, int $serialized_line_count ): array {
		if ( ! $paid ) {
			return array(
				'eligible' => false,
				'code'     => 'order_not_paid',
			);
		}

		if ( ! $local_pickup ) {
			return array(
				'eligible' => false,
				'code'     => 'order_not_local_pickup',
			);
		}

		if ( $serialized_line_count <= 0 ) {
			return array(
				'eligible' => false,
				'code'     => 'order_has_no_serialized_lines',
			);
		}

		return array(
			'eligible' => true,
			'code'     => 'fulfillment_order_eligible',
		);
	}

	public static function clean_status( mixed $value ): string {
		$status = preg_replace( '/[^a-z0-9_]+/', '_', strtolower( trim( (string) $value ) ) ) ?? '';
		$status = trim( $status, '_' );

		return array_key_exists( $status, self::STATUS_RANKS ) ? $status : '';
	}

	public static function derive_status( mixed $stored_status, mixed $woocommerce_status ): string {
		$stored_status = self::clean_status( $stored_status );

		if ( '' !== $stored_status ) {
			return $stored_status;
		}

		$woocommerce_status = strtolower( trim( (string) $woocommerce_status ) );
		$woocommerce_status = str_starts_with( $woocommerce_status, 'wc-' )
			? substr( $woocommerce_status, 3 )
			: $woocommerce_status;

		if ( 'ready-pickup' === $woocommerce_status ) {
			return 'ready_for_pickup';
		}

		if ( 'completed' === $woocommerce_status ) {
			return 'completed';
		}

		return 'awaiting_pull';
	}

	/**
	 * @return array{accepted: bool, idempotent: bool, code: string}
	 */
	public static function transition( string $current_status, string $target_status ): array {
		$current_status = self::clean_status( $current_status );
		$target_status  = self::clean_status( $target_status );

		if ( '' === $current_status || '' === $target_status ) {
			return array(
				'accepted'   => false,
				'idempotent' => false,
				'code'       => 'invalid_fulfillment_status',
			);
		}

		if ( $current_status === $target_status ) {
			return array(
				'accepted'   => true,
				'idempotent' => true,
				'code'       => 'fulfillment_status_unchanged',
			);
		}

		if ( self::STATUS_RANKS[ $target_status ] < self::STATUS_RANKS[ $current_status ] ) {
			return array(
				'accepted'   => false,
				'idempotent' => false,
				'code'       => 'fulfillment_status_regression',
			);
		}

		return array(
			'accepted'   => true,
			'idempotent' => false,
			'code'       => 'fulfillment_status_updated',
		);
	}

	private function __construct() {
	}
}
