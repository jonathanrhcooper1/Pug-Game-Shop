<?php
/**
 * Immutable audit log writer.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Logging;

final class AuditLogger {
	/**
	 * Append a sensitive-action audit record.
	 *
	 * @param array<string, mixed> $context Audit context.
	 */
	public function record(
		string $action,
		string $entity_type,
		?string $entity_id = null,
		array $context = array(),
		?int $manager_user_id = null,
		string $result = 'success'
	): bool {
		global $wpdb;

		$table_name = $wpdb->prefix . 'tcg_audit_log';
		$redacted   = Redactor::redact( $context );
		$before     = $redacted['before'] ?? null;
		$after      = $redacted['after'] ?? null;
		$json       = wp_json_encode( $redacted, JSON_UNESCAPED_SLASHES );
		$actor_id   = get_current_user_id();

		$inserted = $wpdb->insert(
			$table_name,
			array(
				'public_id'       => wp_generate_uuid4(),
				'request_id'      => wp_generate_uuid4(),
				'action_name'     => $action,
				'entity_type'     => $entity_type,
				'entity_id'       => $entity_id,
				'actor_user_id'   => $actor_id ? $actor_id : null,
				'manager_user_id' => $manager_user_id,
				'device_id'       => isset( $redacted['device_id'] ) ? (string) $redacted['device_id'] : null,
				'location_id'     => isset( $redacted['location_id'] ) ? (int) $redacted['location_id'] : null,
				'result_status'   => $result,
				'before_hash'     => $this->hash_value( $before ),
				'after_hash'      => $this->hash_value( $after ),
				'context_json'    => false === $json ? null : $json,
				'created_at'      => gmdate( 'Y-m-d H:i:s.u' ),
			),
			array(
				'%s',
				'%s',
				'%s',
				'%s',
				'%s',
				'%d',
				'%d',
				'%s',
				'%d',
				'%s',
				'%s',
				'%s',
				'%s',
				'%s',
			)
		);

		return false !== $inserted;
	}

	private function hash_value( mixed $value ): ?string {
		if ( null === $value ) {
			return null;
		}

		$encoded = wp_json_encode( $value );

		return hash( 'sha256', false === $encoded ? '' : $encoded );
	}
}
