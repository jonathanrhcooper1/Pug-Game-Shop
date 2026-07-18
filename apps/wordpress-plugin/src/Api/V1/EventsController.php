<?php
/**
 * Public event REST endpoints.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use DateTimeImmutable;
use TCGStorePlatform\Events\EventFilters;
use TCGStorePlatform\Events\EventPresenter;
use TCGStorePlatform\Events\EventRegistrationInput;
use TCGStorePlatform\Events\EventRegistrationRepository;
use TCGStorePlatform\Events\EventRegistrationService;
use TCGStorePlatform\Events\EventRepository;

final class EventsController {
	private const NAMESPACE = 'tcg-store/v1';

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
	}

	public function register_routes(): void {
		foreach ( self::route_contracts() as $route ) {
			register_rest_route(
				$route['namespace'],
				$route['path'],
				array(
					'methods'             => self::rest_method( $route['method'] ),
					'callback'            => array( $this, $route['callback'] ),
					'permission_callback' => 'public' === $route['permission']
						? '__return_true'
						: array( $this, 'can_manage_events' ),
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
				'path'       => '/events',
				'method'     => 'GET',
				'callback'   => 'list_events',
				'permission' => 'public',
			),
			array(
				'namespace'  => self::NAMESPACE,
				'path'       => '/events',
				'method'     => 'POST',
				'callback'   => 'create_event',
				'permission' => 'manage_events',
			),
			array(
				'namespace'  => self::NAMESPACE,
				'path'       => '/events/(?P<slug>[a-zA-Z0-9_-]+)',
				'method'     => 'GET',
				'callback'   => 'get_event',
				'permission' => 'public',
			),
			array(
				'namespace'  => self::NAMESPACE,
				'path'       => '/events/(?P<slug>[a-zA-Z0-9_-]+)/register',
				'method'     => 'POST',
				'callback'   => 'register_event',
				'permission' => 'public',
			),
			array(
				'namespace'  => self::NAMESPACE,
				'path'       => '/events/(?P<slug>[a-zA-Z0-9_-]+)/check-ins',
				'method'     => 'POST',
				'callback'   => 'check_in_event_attendee',
				'permission' => 'manage_events',
			),
		);
	}

	public function create_event( \WP_REST_Request $request ): \WP_REST_Response {
		$payload = $request->get_json_params();

		if ( ! is_array( $payload ) ) {
			$payload = $request->get_body_params();
		}

		$result = $this->insert_event( is_array( $payload ) ? $payload : array() );

		if ( 'ok' !== $result['status'] ) {
			return new \WP_REST_Response(
				array(
					'error' => array(
						'code'    => $result['code'],
						'message' => $result['message'],
						'errors'  => $result['errors'] ?? array(),
					),
				),
				400
			);
		}

		return new \WP_REST_Response(
			array(
				'data' => array(
					'resource'                    => 'event',
					'accepted'                    => true,
					'code'                        => 'event_created',
					'event'                       => $result['event'],
					'woocommerce_product_created' => (int) ( $result['event']['woocommerce_product_id'] ?? 0 ) > 0,
					'credentials_synced_to_client' => false,
				),
			),
			201
		);
	}

	public function can_manage_events(): bool {
		return function_exists( 'current_user_can' ) && current_user_can( 'manage_events' );
	}

	public function list_events( \WP_REST_Request $request ): \WP_REST_Response {
		$filters = EventFilters::from_array( $request->get_query_params() );
		$limit   = (int) $request->get_param( 'per_page' );
		$limit   = max( 1, min( 100, 0 === $limit ? 20 : $limit ) );
		$offset  = max( 0, ( (int) $request->get_param( 'page' ) - 1 ) * $limit );
		$rows    = $this->repository()->list_public( $filters, $limit, $offset );
		$now     = new DateTimeImmutable( 'now' );
		$events  = array_map(
			static fn ( array $row ): array => EventPresenter::present( $row, $now ),
			$rows
		);

		return new \WP_REST_Response(
			array(
				'events'  => $events,
				'filters' => $filters->to_array(),
			),
			200
		);
	}

	public function get_event( \WP_REST_Request $request ): \WP_REST_Response {
		$row = $this->repository()->get_public_by_slug( (string) $request->get_param( 'slug' ) );

		if ( null === $row ) {
			return new \WP_REST_Response(
				array(
					'code'    => 'tcg_event_not_found',
					'message' => __( 'Event not found.', 'tcg-store-platform' ),
				),
				404
			);
		}

		return new \WP_REST_Response(
			array(
				'event' => EventPresenter::present( $row ),
			),
			200
		);
	}

	public function register_event( \WP_REST_Request $request ): \WP_REST_Response {
		$body = $request->get_json_params();

		if ( ! is_array( $body ) ) {
			$body = $request->get_body_params();
		}

		$input  = EventRegistrationInput::from_array(
			$body,
			(string) $request->get_header( 'idempotency-key' )
		);
		$result = $this->registration_service()->register_by_slug(
			(string) $request->get_param( 'slug' ),
			$input
		);

		return new \WP_REST_Response( $result->to_response(), $result->status_code() );
	}

	public function check_in_event_attendee( \WP_REST_Request $request ): \WP_REST_Response {
		$payload = $request->get_json_params();

		if ( ! is_array( $payload ) ) {
			$payload = $request->get_body_params();
		}

		$result = $this->check_in_registration(
			(string) $request->get_param( 'slug' ),
			is_array( $payload ) ? $payload : array(),
			(string) $request->get_header( 'idempotency-key' )
		);

		if ( 'ok' !== $result['status'] ) {
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
					'resource'                    => 'event_checkin',
					'accepted'                    => true,
					'code'                        => $result['code'],
					'idempotent'                  => (bool) $result['idempotent'],
					'checkin'                     => $result['checkin'],
					'credentials_synced_to_client' => false,
				),
			),
			$result['idempotent'] ? 200 : 201
		);
	}

	/**
	 * @param array<string, mixed> $payload Request payload.
	 * @return array<string, mixed>
	 */
	private function check_in_registration( string $event_slug, array $payload, string $idempotency_key ): array {
		global $wpdb;

		$event_slug             = $this->clean_slug( $event_slug );
		$registration_public_id = $this->clean_id( $payload['registration_public_id'] ?? '' );
		$email                  = $this->clean_email( $payload['email'] ?? '' );
		$attendee_label         = $this->clean_name( $payload['attendee_label'] ?? '' );
		$checkin_method         = $this->clean_method( $payload['checkin_method'] ?? 'manual_lookup' );
		$local_checkin_id       = $this->clean_id( $payload['local_checkin_id'] ?? '' );
		$idempotency_key        = $this->clean_id( $idempotency_key ?: $local_checkin_id );

		if ( '' === $event_slug || ( '' === $registration_public_id && '' === $email && '' === $attendee_label ) || '' === $idempotency_key ) {
			return $this->blocked( 'event_checkin_invalid', __( 'Event check-in requires an event, registration identity, and idempotency key.', 'tcg-store-platform' ) );
		}

		$events_table        = $wpdb->prefix . 'tcg_events';
		$registrations_table = $wpdb->prefix . 'tcg_event_registrations';
		$checkins_table      = $wpdb->prefix . 'tcg_event_checkins';
		$logs_table          = $wpdb->prefix . 'tcg_event_registration_logs';

		$wpdb->query( 'START TRANSACTION' );

		$event = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$events_table} WHERE public_visibility = %s AND (slug = %s OR public_id = %s) LIMIT 1 FOR UPDATE",
				'published',
				$event_slug,
				$event_slug
			),
			ARRAY_A
		);

		if ( ! is_array( $event ) ) {
			$wpdb->query( 'ROLLBACK' );

			return $this->blocked( 'event_not_found', __( 'Event was not found for check-in.', 'tcg-store-platform' ) );
		}

		$existing = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT c.* FROM {$checkins_table} c
				INNER JOIN {$registrations_table} r ON r.registration_id = c.registration_id
				WHERE r.event_id = %d AND c.notes = %s LIMIT 1",
				(int) $event['event_id'],
				$idempotency_key
			),
			ARRAY_A
		);

		if ( is_array( $existing ) ) {
			$wpdb->query( 'COMMIT' );

			return array(
				'status'     => 'ok',
				'code'       => 'event_checkin_replayed',
				'idempotent' => true,
				'checkin'    => $this->present_checkin( $existing, $event ),
			);
		}

		$registration = $this->find_registration_for_checkin(
			$registrations_table,
			(int) $event['event_id'],
			$registration_public_id,
			$email,
			$attendee_label
		);

		if ( ! is_array( $registration ) ) {
			$wpdb->query( 'ROLLBACK' );

			return $this->blocked( 'event_registration_not_found', __( 'Registration was not found for check-in.', 'tcg-store-platform' ) );
		}

		if ( in_array( (string) $registration['status'], array( 'cancelled', 'refunded', 'failed' ), true ) ) {
			$wpdb->query( 'ROLLBACK' );

			return $this->blocked( 'event_registration_not_active', __( 'Only active event registrations can be checked in.', 'tcg-store-platform' ) );
		}

		$now      = gmdate( 'Y-m-d H:i:s' );
		$inserted = $wpdb->insert(
			$checkins_table,
			array(
				'event_id'        => (int) $event['event_id'],
				'registration_id' => (int) $registration['registration_id'],
				'actor_user_id'   => $this->current_user_id(),
				'device_id'       => 'offline_lan_sync',
				'location_id'     => null,
				'checkin_method'  => $checkin_method,
				'notes'           => $idempotency_key,
				'checked_in_at'   => $now,
			),
			array( '%d', '%d', '%d', '%s', '%d', '%s', '%s', '%s' )
		);

		if ( false === $inserted ) {
			$existing_for_registration = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT * FROM {$checkins_table} WHERE registration_id = %d LIMIT 1",
					(int) $registration['registration_id']
				),
				ARRAY_A
			);

			if ( is_array( $existing_for_registration ) ) {
				$wpdb->query( 'COMMIT' );

				return array(
					'status'     => 'ok',
					'code'       => 'event_checkin_already_recorded',
					'idempotent' => true,
					'checkin'    => $this->present_checkin( $existing_for_registration, $event ),
				);
			}

			$wpdb->query( 'ROLLBACK' );

			return $this->blocked( 'event_checkin_insert_failed', __( 'Event check-in could not be recorded.', 'tcg-store-platform' ) );
		}

		$checkin_id = (int) $wpdb->insert_id;
		$wpdb->update(
			$registrations_table,
			array(
				'status'         => 'checked_in',
				'checkin_status' => 'checked_in',
				'checked_in_at'  => $now,
				'updated_at'     => $now,
				'row_version'    => (int) ( $registration['row_version'] ?? 1 ) + 1,
			),
			array( 'registration_id' => (int) $registration['registration_id'] ),
			array( '%s', '%s', '%s', '%s', '%d' ),
			array( '%d' )
		);
		$wpdb->insert(
			$logs_table,
			array(
				'event_id'        => (int) $event['event_id'],
				'registration_id' => (int) $registration['registration_id'],
				'action'          => 'checked_in',
				'actor_user_id'   => $this->current_user_id(),
				'device_id'       => 'offline_lan_sync',
				'message'         => substr( 'Checked in from offline LAN sync.', 0, 255 ),
				'metadata_json'   => $this->json(
					array(
						'local_checkin_id'        => $local_checkin_id,
						'idempotency_key'         => $idempotency_key,
						'registration_public_id'  => $registration_public_id,
						'email'                   => $email,
						'attendee_label'          => $attendee_label,
					)
				),
				'created_at'      => $now,
			),
			array( '%d', '%d', '%s', '%d', '%s', '%s', '%s', '%s' )
		);

		$checkin = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$checkins_table} WHERE checkin_id = %d LIMIT 1",
				$checkin_id
			),
			ARRAY_A
		);

		$wpdb->query( 'COMMIT' );

		return array(
			'status'     => 'ok',
			'code'       => 'event_checked_in',
			'idempotent' => false,
			'checkin'    => $this->present_checkin( is_array( $checkin ) ? $checkin : array(), $event ),
		);
	}

	/**
	 * @param array<string, mixed> $payload Event creation request.
	 * @return array<string, mixed>
	 */
	private function insert_event( array $payload ): array {
		global $wpdb;

		$title      = $this->clean_name( $payload['title'] ?? '' );
		$start     = $this->mysql_datetime( $payload['starts_at_utc'] ?? ( $payload['start_datetime'] ?? '' ) );
		$game      = $this->clean_method( $payload['game'] ?? 'other' );
		$event_type = $this->clean_method( $payload['event_type'] ?? 'tournament' );
		$entry_fee = $this->money_amount( $payload['entry_fee'] ?? ( $payload['price'] ?? 0 ) );
		$capacity  = $this->positive_int_or_null( $payload['capacity'] ?? ( $payload['player_cap'] ?? null ) );

		$errors = array();
		if ( '' === $title ) {
			$errors[] = 'title_required';
		}
		if ( '' === $start ) {
			$errors[] = 'start_datetime_required';
		}
		if ( $capacity !== null && $capacity <= 0 ) {
			$errors[] = 'capacity_invalid';
		}

		if ( array() !== $errors ) {
			return array(
				'status'  => 'blocked',
				'code'    => 'event_payload_invalid',
				'message' => __( 'Event title, start time, and valid capacity are required.', 'tcg-store-platform' ),
				'errors'  => $errors,
			);
		}

		$table = $wpdb->prefix . 'tcg_events';
		$now   = gmdate( 'Y-m-d H:i:s' );
		$slug  = $this->unique_event_slug( $this->clean_slug( (string) ( $payload['slug'] ?? $title ) ), $table );
		$data  = array(
			'public_id'                   => $this->uuid(),
			'title'                       => $title,
			'slug'                        => $slug,
			'event_type'                  => $event_type,
			'game'                        => $game,
			'format'                      => $this->nullable_name( $payload['format'] ?? null ),
			'rules_level'                 => $this->nullable_name( $payload['rules_level'] ?? null ),
			'start_datetime'              => $start,
			'end_datetime'                => $this->nullable_mysql_datetime( $payload['ends_at_utc'] ?? ( $payload['end_datetime'] ?? null ) ),
			'timezone'                    => $this->nullable_name( $payload['timezone'] ?? null ) ?: 'America/New_York',
			'location_id'                 => $this->positive_int_or_null( $payload['location_id'] ?? null ),
			'entry_fee'                   => number_format( $entry_fee, 4, '.', '' ),
			'currency'                    => $this->currency( $payload['currency'] ?? 'USD' ),
			'player_cap'                  => $capacity,
			'registered_count'            => 0,
			'waitlist_enabled'            => $this->truthy( $payload['waitlist_enabled'] ?? false ) ? 1 : 0,
			'registration_status'         => 'open',
			'registration_mode'           => $entry_fee > 0 ? 'woocommerce' : 'local_only',
			'registration_deadline'       => $this->nullable_mysql_datetime( $payload['registration_deadline'] ?? null ),
			'refund_deadline'             => $this->nullable_mysql_datetime( $payload['refund_deadline'] ?? null ),
			'decklist_required'           => $this->truthy( $payload['decklist_required'] ?? false ) ? 1 : 0,
			'decklist_deadline'           => $this->nullable_mysql_datetime( $payload['decklist_deadline'] ?? null ),
			'prize_support'               => $this->nullable_name( $payload['prize_support'] ?? null ),
			'description'                 => $this->nullable_text( $payload['description'] ?? null ),
			'what_to_bring'               => $this->nullable_text( $payload['what_to_bring'] ?? null ),
			'age_restriction'             => $this->nullable_name( $payload['age_restriction'] ?? null ),
			'staff_notes'                 => $this->nullable_text( $payload['staff_notes'] ?? null ),
			'public_visibility'           => $this->truthy( $payload['published'] ?? true ) ? 'published' : 'draft',
			'featured_event'              => $this->truthy( $payload['featured_event'] ?? false ) ? 1 : 0,
			'header_image'                => $this->nullable_url( $payload['header_image'] ?? null ),
			'woocommerce_product_id'      => null,
			'allow_store_credit_payment'  => 0,
			'allow_pay_at_store'          => $entry_fee > 0 ? 0 : 1,
			'offline_reservation_enabled' => 1,
			'created_by'                  => $this->current_user_id() ?: null,
			'updated_by'                  => $this->current_user_id() ?: null,
			'created_at'                  => $now,
			'updated_at'                  => $now,
			'row_version'                 => 1,
		);

		$inserted = $wpdb->insert( $table, $data );
		if ( false === $inserted ) {
			return array(
				'status'  => 'blocked',
				'code'    => 'event_insert_failed',
				'message' => __( 'Event could not be created.', 'tcg-store-platform' ),
				'errors'  => array( 'database_insert_failed' ),
			);
		}

		$event_id    = (int) $wpdb->insert_id;
		$product_id  = $entry_fee > 0 ? $this->create_event_product( $title, $entry_fee, $capacity, $data['public_id'], $slug ) : 0;
		if ( $product_id > 0 ) {
			$wpdb->update(
				$table,
				array(
					'woocommerce_product_id' => $product_id,
					'updated_at'             => gmdate( 'Y-m-d H:i:s' ),
					'row_version'            => 2,
				),
				array( 'event_id' => $event_id ),
				array( '%d', '%s', '%d' ),
				array( '%d' )
			);
		}

		$row = $wpdb->get_row(
			$wpdb->prepare( "SELECT * FROM {$table} WHERE event_id = %d LIMIT 1", $event_id ),
			ARRAY_A
		);

		return array(
			'status' => 'ok',
			'event'  => EventPresenter::present( is_array( $row ) ? $row : $data ),
		);
	}

	/**
	 * @return null|array<string, mixed>
	 */
	private function find_registration_for_checkin(
		string $registrations_table,
		int $event_id,
		string $registration_public_id,
		string $email,
		string $attendee_label
	): ?array {
		global $wpdb;

		if ( '' !== $registration_public_id ) {
			$row = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT * FROM {$registrations_table} WHERE event_id = %d AND public_id = %s LIMIT 1 FOR UPDATE",
					$event_id,
					$registration_public_id
				),
				ARRAY_A
			);

			if ( is_array( $row ) ) {
				return $row;
			}
		}

		if ( '' !== $email ) {
			$row = $wpdb->get_row(
				$wpdb->prepare(
					"SELECT * FROM {$registrations_table} WHERE event_id = %d AND email = %s ORDER BY registration_id DESC LIMIT 1 FOR UPDATE",
					$event_id,
					$email
				),
				ARRAY_A
			);

			if ( is_array( $row ) ) {
				return $row;
			}
		}

		$names = $this->split_attendee_name( $attendee_label );

		if ( '' === $names['first_name'] || '' === $names['last_name'] ) {
			return null;
		}

		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT * FROM {$registrations_table}
				WHERE event_id = %d
				AND (
					(first_name = %s AND last_name = %s)
					OR CONCAT(first_name, ' ', last_name) = %s
				)
				ORDER BY registration_id DESC
				LIMIT 1 FOR UPDATE",
				$event_id,
				$names['first_name'],
				$names['last_name'],
				$attendee_label
			),
			ARRAY_A
		);

		return is_array( $row ) ? $row : null;
	}

	/**
	 * @return array{first_name:string,last_name:string}
	 */
	private function split_attendee_name( string $attendee_label ): array {
		$parts = array_values( array_filter( explode( ' ', $this->clean_name( $attendee_label ) ) ) );

		if ( 0 === count( $parts ) ) {
			return array(
				'first_name' => '',
				'last_name'  => '',
			);
		}

		if ( 1 === count( $parts ) ) {
			return array(
				'first_name' => $parts[0],
				'last_name'  => 'Guest',
			);
		}

		return array(
			'first_name' => implode( ' ', array_slice( $parts, 0, -1 ) ),
			'last_name'  => (string) end( $parts ),
		);
	}

	/**
	 * @param array<string, mixed> $checkin Check-in row.
	 * @param array<string, mixed> $event Event row.
	 * @return array<string, mixed>
	 */
	private function present_checkin( array $checkin, array $event ): array {
		return array(
			'checkin_id'      => (int) ( $checkin['checkin_id'] ?? 0 ),
			'event_public_id' => (string) ( $event['public_id'] ?? '' ),
			'event_slug'      => (string) ( $event['slug'] ?? '' ),
			'registration_id' => (int) ( $checkin['registration_id'] ?? 0 ),
			'checkin_method'  => (string) ( $checkin['checkin_method'] ?? '' ),
			'device_id'       => (string) ( $checkin['device_id'] ?? '' ),
			'checked_in_at'   => (string) ( $checkin['checked_in_at'] ?? '' ),
		);
	}

	/**
	 * @return array{status:string,code:string,message:string}
	 */
	private function blocked( string $code, string $message ): array {
		return array(
			'status'  => 'blocked',
			'code'    => $code,
			'message' => $message,
		);
	}

	private function current_user_id(): int {
		return function_exists( 'get_current_user_id' ) ? (int) get_current_user_id() : 0;
	}

	/**
	 * @param mixed $value Value to encode.
	 */
	private function json( $value ): string {
		$encoded = function_exists( 'wp_json_encode' ) ? wp_json_encode( $value ) : json_encode( $value );

		return is_string( $encoded ) ? $encoded : '{}';
	}

	private function clean_slug( string $value ): string {
		$value = strtolower( trim( $value ) );
		$value = preg_replace( '/[^a-z0-9_-]+/', '-', $value );
		$value = trim( is_string( $value ) ? $value : '', '-' );

		return substr( $value, 0, 191 );
	}

	/**
	 * @param mixed $value Raw ID.
	 */
	private function clean_id( $value ): string {
		$value = trim( (string) $value );
		$value = preg_replace( '/[^a-zA-Z0-9._:-]+/', '-', $value );
		$value = trim( is_string( $value ) ? $value : '', '-' );

		return substr( $value, 0, 191 );
	}

	/**
	 * @param mixed $value Raw email.
	 */
	private function clean_email( $value ): string {
		$email = strtolower( substr( trim( (string) $value ), 0, 191 ) );

		return false !== filter_var( $email, FILTER_VALIDATE_EMAIL ) ? $email : '';
	}

	/**
	 * @param mixed $value Raw name.
	 */
	private function clean_name( $value ): string {
		$value = preg_replace( '/\s+/', ' ', trim( (string) $value ) );

		return substr( is_string( $value ) ? $value : '', 0, 160 );
	}

	private function nullable_name( mixed $value ): ?string {
		$value = $this->clean_name( $value );

		return '' === $value ? null : $value;
	}

	private function nullable_text( mixed $value ): ?string {
		$value = trim( (string) $value );

		return '' === $value ? null : substr( $value, 0, 4000 );
	}

	private function nullable_url( mixed $value ): ?string {
		$value = trim( (string) $value );

		if ( '' === $value ) {
			return null;
		}

		if ( function_exists( 'esc_url_raw' ) ) {
			$value = esc_url_raw( $value );
		}

		return false !== filter_var( $value, FILTER_VALIDATE_URL ) ? substr( $value, 0, 255 ) : null;
	}

	/**
	 * @param mixed $value Raw check-in method.
	 */
	private function clean_method( $value ): string {
		$value = strtolower( trim( (string) $value ) );
		$value = preg_replace( '/[^a-z0-9_-]+/', '_', $value );
		$value = trim( is_string( $value ) ? $value : '', '_' );

		return '' === $value ? 'manual_lookup' : substr( $value, 0, 64 );
	}

	private function mysql_datetime( mixed $value ): string {
		try {
			return ( new DateTimeImmutable( (string) $value ) )->format( 'Y-m-d H:i:s' );
		} catch ( \Exception ) {
			return '';
		}
	}

	private function nullable_mysql_datetime( mixed $value ): ?string {
		$datetime = $this->mysql_datetime( $value );

		return '' === $datetime ? null : $datetime;
	}

	private function money_amount( mixed $value ): float {
		return max( 0.0, round( (float) $value, 2 ) );
	}

	private function positive_int_or_null( mixed $value ): ?int {
		$parsed = is_numeric( $value ) ? (int) $value : 0;

		return $parsed > 0 ? $parsed : null;
	}

	private function currency( mixed $value ): string {
		$value = strtoupper( preg_replace( '/[^A-Z]/', '', (string) $value ) ?? '' );

		return 3 === strlen( $value ) ? $value : 'USD';
	}

	private function truthy( mixed $value ): bool {
		if ( is_bool( $value ) ) {
			return $value;
		}

		return in_array( strtolower( trim( (string) $value ) ), array( '1', 'true', 'yes', 'on' ), true );
	}

	private function unique_event_slug( string $slug, string $events_table ): string {
		global $wpdb;

		$base = '' === $slug ? 'event' : $slug;
		$next = $base;
		$suffix = 2;

		while ( $this->event_slug_exists( $events_table, $next ) ) {
			$next = substr( $base, 0, 180 ) . '-' . (string) $suffix;
			++$suffix;
		}

		return $next;
	}

	private function event_slug_exists( string $events_table, string $slug ): bool {
		global $wpdb;

		$sql = $wpdb->prepare( "SELECT event_id FROM {$events_table} WHERE slug = %s LIMIT 1", $slug );
		$row = is_string( $sql ) ? $wpdb->get_row( $sql, ARRAY_A ) : null;

		return is_array( $row );
	}

	private function create_event_product( string $title, float $entry_fee, ?int $capacity, string $event_public_id, string $slug ): int {
		if ( ! class_exists( '\WC_Product_Simple' ) ) {
			return 0;
		}

		$product = new \WC_Product_Simple();
		$product->set_name( sprintf( 'Event Registration: %s', $title ) );
		$product->set_status( 'publish' );
		$product->set_catalog_visibility( 'hidden' );
		$product->set_virtual( true );
		$product->set_sold_individually( false );
		$product->set_regular_price( number_format( $entry_fee, 2, '.', '' ) );
		$product->set_price( number_format( $entry_fee, 2, '.', '' ) );
		if ( null !== $capacity ) {
			$product->set_manage_stock( true );
			$product->set_stock_quantity( $capacity );
		}

		$product_id = (int) $product->save();

		if ( $product_id > 0 && function_exists( 'update_post_meta' ) ) {
			update_post_meta( $product_id, '_tcg_event_public_id', $event_public_id );
			update_post_meta( $product_id, '_tcg_event_slug', $slug );
			update_post_meta( $product_id, '_tcg_event_registration_product', '1' );
		}

		return $product_id;
	}

	private function uuid(): string {
		return function_exists( 'wp_generate_uuid4' ) ? wp_generate_uuid4() : sprintf(
			'%s-%s-%s-%s-%s',
			bin2hex( random_bytes( 4 ) ),
			bin2hex( random_bytes( 2 ) ),
			bin2hex( random_bytes( 2 ) ),
			bin2hex( random_bytes( 2 ) ),
			bin2hex( random_bytes( 6 ) )
		);
	}

	private function repository(): EventRepository {
		global $wpdb;

		return new EventRepository( $wpdb );
	}

	private function registration_service(): EventRegistrationService {
		global $wpdb;

		return new EventRegistrationService( new EventRegistrationRepository( $wpdb ) );
	}

	private static function rest_method( string $method ): string {
		return match ( $method ) {
			'GET'   => \WP_REST_Server::READABLE,
			'POST'  => \WP_REST_Server::CREATABLE,
			default => $method,
		};
	}
}
