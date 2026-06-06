<?php
/**
 * Event registration write repository.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

use DateTimeImmutable;

final class EventRegistrationRepository {
	private \wpdb $database;

	public function __construct( \wpdb $database ) {
		$this->database = $database;
	}

	public function begin_transaction(): void {
		$this->database->query( 'START TRANSACTION' );
	}

	public function commit(): void {
		$this->database->query( 'COMMIT' );
	}

	public function rollback(): void {
		$this->database->query( 'ROLLBACK' );
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function get_public_event_for_update( string $slug ): ?array {
		$table_name = $this->database->prefix . 'tcg_events';

		$row = $this->database->get_row(
			$this->database->prepare(
				"SELECT * FROM {$table_name} WHERE public_visibility = %s AND slug = %s LIMIT 1 FOR UPDATE", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				'published',
				$slug
			),
			ARRAY_A
		);

		return is_array( $row ) ? $row : null;
	}

	/**
	 * @return array<string, mixed>|null
	 */
	public function find_by_idempotency_key( string $idempotency_key ): ?array {
		if ( '' === $idempotency_key ) {
			return null;
		}

		$table_name = $this->database->prefix . 'tcg_event_registrations';

		$row = $this->database->get_row(
			$this->database->prepare(
				"SELECT * FROM {$table_name} WHERE idempotency_key = %s LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$idempotency_key
			),
			ARRAY_A
		);

		return is_array( $row ) ? $row : null;
	}

	public function capacity_count( int $event_id ): int {
		$table_name   = $this->database->prefix . 'tcg_event_registrations';
		$statuses     = EventRegistrationStatus::capacity_consuming_statuses();
		$placeholders = implode( ', ', array_fill( 0, count( $statuses ), '%s' ) );
		$args         = array_merge( array( $event_id ), $statuses );

		$count = $this->database->get_var(
			$this->database->prepare(
				"SELECT COUNT(*) FROM {$table_name} WHERE event_id = %d AND status IN ({$placeholders})", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$args
			)
		);

		return max( 0, (int) $count );
	}

	/**
	 * @param array<string, mixed> $event Event row.
	 * @return array<string, mixed>|null
	 */
	public function create_registration(
		array $event,
		EventRegistrationInput $input,
		EventRegistrationDecision $decision
	): ?array {
		$table_name = $this->database->prefix . 'tcg_event_registrations';
		$now        = $this->now();
		$data       = array(
			'public_id'         => $this->uuid(),
			'event_id'          => (int) $event['event_id'],
			'customer_id'       => null,
			'first_name'        => $input->first_name(),
			'last_name'         => $input->last_name(),
			'phone'             => $input->phone(),
			'email'             => $input->email(),
			'topdeck_email'     => $input->topdeck_email(),
			'status'            => $decision->status(),
			'payment_status'    => $decision->payment_status(),
			'amount_paid'       => '0.0000',
			'store_credit_used' => '0.0000',
			'idempotency_key'   => '' === $input->idempotency_key() ? null : $input->idempotency_key(),
			'created_at'        => $now,
			'updated_at'        => $now,
			'row_version'       => 1,
		);

		$inserted = $this->database->insert(
			$table_name,
			$data,
			array(
				'%s',
				'%d',
				'%d',
				'%s',
				'%s',
				'%s',
				'%s',
				'%s',
				'%s',
				'%s',
				'%f',
				'%f',
				'%s',
				'%s',
				'%s',
				'%d',
			)
		);

		if ( false === $inserted ) {
			return null;
		}

		return $this->get_registration( (int) $this->database->insert_id );
	}

	public function add_waitlist_entry( int $event_id, int $registration_id ): void {
		$table_name = $this->database->prefix . 'tcg_event_waitlist';
		$position   = (int) $this->database->get_var(
			$this->database->prepare(
				"SELECT COALESCE(MAX(position), 0) + 1 FROM {$table_name} WHERE event_id = %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$event_id
			)
		);
		$now        = $this->now();

		$this->database->insert(
			$table_name,
			array(
				'event_id'        => $event_id,
				'registration_id' => $registration_id,
				'position'        => max( 1, $position ),
				'status'          => 'waiting',
				'created_at'      => $now,
				'updated_at'      => $now,
			),
			array( '%d', '%d', '%d', '%s', '%s', '%s' )
		);
	}

	/**
	 * @param array<string, mixed> $event Event row.
	 */
	public function update_event_counts( array $event, int $capacity_count, DateTimeImmutable $now ): void {
		$table_name = $this->database->prefix . 'tcg_events';
		$status     = EventStatus::registration_status(
			$this->nullable_int( $event['player_cap'] ?? null ),
			$capacity_count,
			! empty( $event['waitlist_enabled'] ),
			$this->datetime( $event['registration_deadline'] ?? null ),
			$now
		);

		$this->database->update(
			$table_name,
			array(
				'registered_count'    => $capacity_count,
				'registration_status' => $status,
				'updated_at'          => $this->now(),
				'row_version'         => (int) ( $event['row_version'] ?? 1 ) + 1,
			),
			array( 'event_id' => (int) $event['event_id'] ),
			array( '%d', '%s', '%s', '%d' ),
			array( '%d' )
		);
	}

	/**
	 * @param array<string, mixed> $metadata Metadata payload.
	 */
	public function write_log( int $event_id, ?int $registration_id, string $action, string $message, array $metadata = array() ): void {
		$table_name = $this->database->prefix . 'tcg_event_registration_logs';

		$this->database->insert(
			$table_name,
			array(
				'event_id'        => $event_id,
				'registration_id' => $registration_id,
				'action'          => $action,
				'actor_user_id'   => null,
				'device_id'       => null,
				'message'         => substr( $message, 0, 255 ),
				'metadata_json'   => $this->encode_json( $metadata ),
				'created_at'      => $this->now(),
			),
			array( '%d', '%d', '%s', '%d', '%s', '%s', '%s', '%s' )
		);
	}

	/**
	 * @return array<string, mixed>|null
	 */
	private function get_registration( int $registration_id ): ?array {
		$table_name = $this->database->prefix . 'tcg_event_registrations';

		$row = $this->database->get_row(
			$this->database->prepare(
				"SELECT * FROM {$table_name} WHERE registration_id = %d LIMIT 1", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$registration_id
			),
			ARRAY_A
		);

		return is_array( $row ) ? $row : null;
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

	/**
	 * @param array<string, mixed> $metadata Metadata payload.
	 */
	private function encode_json( array $metadata ): string {
		if ( function_exists( 'wp_json_encode' ) ) {
			return (string) wp_json_encode( $metadata );
		}

		return (string) json_encode( $metadata );
	}

	private function datetime( mixed $value ): ?DateTimeImmutable {
		if ( ! is_string( $value ) || '' === trim( $value ) ) {
			return null;
		}

		return new DateTimeImmutable( $value );
	}

	private function nullable_int( mixed $value ): ?int {
		if ( null === $value || '' === $value ) {
			return null;
		}

		return max( 0, (int) $value );
	}
}
