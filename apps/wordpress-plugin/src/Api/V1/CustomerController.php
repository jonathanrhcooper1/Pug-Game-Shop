<?php
/**
 * Staff customer REST write endpoints.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class CustomerController {
	private const NAMESPACE = 'tcg-store/v1';

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ), 24 );
	}

	public function register_routes(): void {
		foreach ( self::route_contracts() as $route ) {
			register_rest_route(
				$route['namespace'],
				$route['path'],
				array(
					'methods'             => self::rest_method( $route['method'] ),
					'callback'            => array( $this, $route['callback'] ),
					'permission_callback' => array( $this, 'can_manage_customers' ),
				)
			);
		}
	}

	/**
	 * @return list<array{namespace:string,path:string,method:string,callback:string,permission:string}>
	 */
	public static function route_contracts(): array {
		return array(
			array(
				'namespace'  => self::NAMESPACE,
				'path'       => '/customers',
				'method'     => 'POST',
				'callback'   => 'upsert_customer',
				'permission' => 'manage_customers',
			),
		);
	}

	public function can_manage_customers(): bool {
		return function_exists( 'current_user_can' ) && current_user_can( 'manage_customers' );
	}

	public function upsert_customer( \WP_REST_Request $request ): \WP_REST_Response {
		$payload    = $this->request_payload( $request );
		$validation = $this->validate_payload( $payload );

		if ( ! empty( $validation['errors'] ) ) {
			return new \WP_REST_Response(
				array(
					'error' => array(
						'code'    => 'tcg_customer_validation_failed',
						'message' => __( 'Customer request validation failed.', 'tcg-store-platform' ),
						'details' => array(
							'errors' => $validation['errors'],
						),
					),
				),
				400
			);
		}

		$result = $this->upsert_validated_customer( $validation['customer'] );

		if ( 'error' === $result['status'] ) {
			return new \WP_REST_Response(
				array(
					'error' => array(
						'code'    => $result['code'],
						'message' => $result['message'],
					),
				),
				409
			);
		}

		return new \WP_REST_Response(
			array(
				'data' => array(
					'resource'   => 'customer_upsert',
					'accepted'   => true,
					'code'       => $result['code'],
					'idempotent' => (bool) $result['idempotent'],
					'customer'   => $this->present_customer( $result['customer'] ),
				),
			),
			$result['created'] ? 201 : 200
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function request_payload( \WP_REST_Request $request ): array {
		$payload = $request->get_json_params();

		if ( ! is_array( $payload ) ) {
			$payload = $request->get_body_params();
		}

		return is_array( $payload ) ? $payload : array();
	}

	/**
	 * @param array<string, mixed> $payload Request payload.
	 * @return array{errors:list<string>,customer:array<string,mixed>}
	 */
	private function validate_payload( array $payload ): array {
		$source_public_id = $this->clean_public_id( $payload['customer_public_id'] ?? $payload['public_id'] ?? '' );
		$first_name       = $this->clean_name( $payload['first_name'] ?? '' );
		$last_name        = $this->clean_name( $payload['last_name'] ?? '' );
		$display_name     = $this->clean_name( $payload['display_name'] ?? trim( $first_name . ' ' . $last_name ) );
		$email            = $this->clean_email( $payload['email'] ?? $payload['normalized_email'] ?? '' );
		$phone            = $this->clean_phone( $payload['phone'] ?? $payload['display_phone'] ?? '' );
		$barcode          = $this->clean_barcode( $payload['barcode'] ?? '' );
		$currency         = $this->clean_currency( $payload['credit_currency'] ?? $payload['currency'] ?? 'USD' );
		$status           = in_array( (string) ( $payload['status'] ?? 'active' ), array( 'active', 'inactive' ), true )
			? (string) $payload['status']
			: 'active';
		$errors           = array();

		if ( '' === $display_name && '' === $email ) {
			$errors[] = 'display_name_or_email_required';
		}

		if ( '' !== (string) ( $payload['email'] ?? '' ) && '' === $email ) {
			$errors[] = 'valid_email_required';
		}

		if ( '' === $source_public_id ) {
			$source_public_id = $this->uuid();
		}

		if ( '' === $display_name ) {
			$display_name = $email;
		}

		return array(
			'errors'   => array_values( array_unique( $errors ) ),
			'customer' => array(
				'public_id'          => $this->public_uuid( $source_public_id ),
				'source_public_id'   => $source_public_id,
				'first_name'         => $first_name,
				'last_name'          => $last_name,
				'display_name'       => $display_name,
				'normalized_email'   => $email,
				'normalized_phone'   => $this->normalize_phone( $phone ),
				'display_phone'      => $phone,
				'barcode'            => $barcode,
				'credit_currency'    => $currency,
				'status'             => $status,
				'current_user_id'    => $this->current_user_id(),
			),
		);
	}

	/**
	 * @param array<string, mixed> $customer Validated customer data.
	 * @return array<string, mixed>
	 */
	private function upsert_validated_customer( array $customer ): array {
		global $wpdb;

		$table = $wpdb->prefix . 'tcg_customers';
		$row   = $this->find_customer_row( $table, 'public_id', (string) $customer['public_id'] );

		if ( null === $row && '' !== $customer['normalized_email'] ) {
			$row = $this->find_customer_row( $table, 'normalized_email', (string) $customer['normalized_email'] );
		}

		if ( is_array( $row ) ) {
			$updated = $wpdb->query(
				$wpdb->prepare(
					"UPDATE {$table}
					SET first_name = %s, last_name = %s, display_name = %s, normalized_phone = %s,
						display_phone = %s, normalized_email = %s, barcode = %s, status = %s,
						updated_by = %d, updated_at = %s, row_version = row_version + 1
					WHERE customer_id = %d",
					$customer['first_name'],
					$customer['last_name'],
					$customer['display_name'],
					$customer['normalized_phone'],
					$customer['display_phone'],
					$customer['normalized_email'],
					$customer['barcode'],
					$customer['status'],
					$customer['current_user_id'],
					$this->now(),
					(int) $row['customer_id']
				)
			);

			if ( false === $updated ) {
				return $this->error_result( 'tcg_customer_update_failed', __( 'Customer could not be updated.', 'tcg-store-platform' ) );
			}

			return array(
				'status'     => 'ok',
				'code'       => 'customer_updated',
				'created'    => false,
				'idempotent' => (string) $row['public_id'] === (string) $customer['public_id'],
				'customer'   => $this->find_customer_row( $table, 'customer_id', (int) $row['customer_id'] ),
			);
		}

		$inserted = $wpdb->insert(
			$table,
			array(
				'public_id'        => $customer['public_id'],
				'first_name'       => $customer['first_name'],
				'last_name'        => $customer['last_name'],
				'display_name'     => $customer['display_name'],
				'normalized_phone' => $customer['normalized_phone'],
				'display_phone'    => $customer['display_phone'],
				'normalized_email' => $customer['normalized_email'],
				'barcode'          => $customer['barcode'],
				'credit_balance'   => '0.0000',
				'credit_currency'  => $customer['credit_currency'],
				'credit_version'   => 0,
				'status'           => $customer['status'],
				'created_by'       => $customer['current_user_id'],
				'updated_by'       => $customer['current_user_id'],
				'created_at'       => $this->now(),
				'updated_at'       => $this->now(),
				'row_version'      => 1,
			),
			array( '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%d', '%s', '%d', '%d', '%s', '%s', '%d' )
		);

		if ( false === $inserted ) {
			return $this->error_result( 'tcg_customer_insert_failed', __( 'Customer could not be created.', 'tcg-store-platform' ) );
		}

		return array(
			'status'     => 'ok',
			'code'       => 'customer_created',
			'created'    => true,
			'idempotent' => false,
			'customer'   => $this->find_customer_row( $table, 'customer_id', (int) $wpdb->insert_id ),
		);
	}

	/**
	 * @return array<string, mixed>|null
	 */
	private function find_customer_row( string $table, string $field, string|int $value ): ?array {
		global $wpdb;

		$allowed = array( 'customer_id', 'public_id', 'normalized_email' );
		if ( ! in_array( $field, $allowed, true ) ) {
			return null;
		}

		$placeholder = 'customer_id' === $field ? '%d' : '%s';
		$row         = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$table} WHERE {$field} = {$placeholder} LIMIT 1",
				$value
			),
			ARRAY_A
		);

		return is_array( $row ) ? $row : null;
	}

	/**
	 * @param array<string, mixed>|null $row Customer row.
	 * @return array<string, mixed>
	 */
	private function present_customer( ?array $row ): array {
		$row = is_array( $row ) ? $row : array();

		return array(
			'customer_id'                => max( 0, (int) ( $row['customer_id'] ?? 0 ) ),
			'public_id'                  => (string) ( $row['public_id'] ?? '' ),
			'display_name'               => (string) ( $row['display_name'] ?? '' ),
			'first_name'                 => (string) ( $row['first_name'] ?? '' ),
			'last_name'                  => (string) ( $row['last_name'] ?? '' ),
			'email'                      => (string) ( $row['normalized_email'] ?? '' ),
			'phone'                      => (string) ( $row['display_phone'] ?? '' ),
			'status'                     => (string) ( $row['status'] ?? '' ),
			'credit_balance'             => (string) ( $row['credit_balance'] ?? '0.0000' ),
			'credit_currency'            => (string) ( $row['credit_currency'] ?? 'USD' ),
			'row_version'                => max( 1, (int) ( $row['row_version'] ?? 1 ) ),
			'private_contact_redacted'   => true,
			'credentials_synced_to_client' => false,
		);
	}

	private function public_uuid( string $source_public_id ): string {
		if ( preg_match( '/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/', $source_public_id ) ) {
			return strtolower( $source_public_id );
		}

		$hash = md5( $source_public_id );

		return sprintf(
			'%s-%s-4%s-%s%s-%s',
			substr( $hash, 0, 8 ),
			substr( $hash, 8, 4 ),
			substr( $hash, 13, 3 ),
			dechex( ( hexdec( $hash[16] ) & 0x3 ) | 0x8 ),
			substr( $hash, 17, 3 ),
			substr( $hash, 20, 12 )
		);
	}

	private function error_result( string $code, string $message ): array {
		return array(
			'status'  => 'error',
			'code'    => $code,
			'message' => $message,
		);
	}

	private function clean_name( mixed $value ): string {
		$value = trim( preg_replace( '/\s+/', ' ', (string) $value ) ?? '' );

		return substr( $value, 0, 191 );
	}

	private function clean_public_id( mixed $value ): string {
		return substr( preg_replace( '/[^a-zA-Z0-9._:-]+/', '-', trim( (string) $value ) ) ?? '', 0, 191 );
	}

	private function clean_email( mixed $value ): string {
		$email = strtolower( trim( (string) $value ) );

		if ( function_exists( 'sanitize_email' ) ) {
			$email = sanitize_email( $email );
		}

		return filter_var( $email, FILTER_VALIDATE_EMAIL ) ? substr( $email, 0, 191 ) : '';
	}

	private function clean_phone( mixed $value ): string {
		return substr( trim( preg_replace( '/[^0-9+().\-\s]/', '', (string) $value ) ?? '' ), 0, 50 );
	}

	private function normalize_phone( string $phone ): string {
		return substr( preg_replace( '/[^0-9]/', '', $phone ) ?? '', 0, 32 );
	}

	private function clean_barcode( mixed $value ): string {
		return substr( preg_replace( '/[^a-zA-Z0-9._:-]+/', '-', trim( (string) $value ) ) ?? '', 0, 100 );
	}

	private function clean_currency( mixed $value ): string {
		$currency = strtoupper( trim( (string) $value ) );

		return preg_match( '/^[A-Z]{3}$/', $currency ) ? $currency : 'USD';
	}

	private function current_user_id(): ?int {
		if ( function_exists( 'get_current_user_id' ) ) {
			$user_id = (int) get_current_user_id();

			return $user_id > 0 ? $user_id : null;
		}

		return null;
	}

	private function now(): string {
		return gmdate( 'Y-m-d H:i:s' );
	}

	private function uuid(): string {
		if ( function_exists( 'wp_generate_uuid4' ) ) {
			return wp_generate_uuid4();
		}

		$bytes    = random_bytes( 16 );
		$bytes[6] = chr( ( ord( $bytes[6] ) & 0x0f ) | 0x40 );
		$bytes[8] = chr( ( ord( $bytes[8] ) & 0x3f ) | 0x80 );

		return vsprintf( '%s%s-%s-%s-%s-%s%s%s', str_split( bin2hex( $bytes ), 4 ) );
	}

	private static function rest_method( string $method ): string {
		return match ( $method ) {
			'POST'  => \WP_REST_Server::CREATABLE,
			default => $method,
		};
	}
}
