<?php
/**
 * Phase 1 database schema.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class FoundationSchema {
	/**
	 * Return dbDelta-compatible CREATE TABLE statements.
	 *
	 * @return array<string, string>
	 */
	public static function tables( string $prefix, string $collation ): array {
		$migrations_table = $prefix . 'tcg_schema_migrations';
		$settings_table   = $prefix . 'tcg_settings';
		$roles_table      = $prefix . 'tcg_role_permissions';
		$audit_table      = $prefix . 'tcg_audit_log';

		return array(
			$migrations_table => "CREATE TABLE {$migrations_table} (
migration_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
migration_version int(10) unsigned NOT NULL,
migration_name varchar(191) NOT NULL,
checksum char(64) NOT NULL,
applied_at datetime(6) NOT NULL,
PRIMARY KEY  (migration_id),
UNIQUE KEY migration_version (migration_version),
KEY applied_at (applied_at)
) {$collation};",
			$settings_table   => "CREATE TABLE {$settings_table} (
setting_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
setting_namespace varchar(100) NOT NULL,
setting_key varchar(191) NOT NULL,
scope_type varchar(32) NOT NULL DEFAULT 'global',
scope_id bigint(20) unsigned NULL,
scope_key varchar(191) NOT NULL DEFAULT 'global',
value_type varchar(32) NOT NULL DEFAULT 'string',
value_text longtext NULL,
is_encrypted tinyint(1) unsigned NOT NULL DEFAULT 0,
is_feature_flag tinyint(1) unsigned NOT NULL DEFAULT 0,
setting_version bigint(20) unsigned NOT NULL DEFAULT 1,
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
PRIMARY KEY  (setting_id),
UNIQUE KEY setting_scope (setting_namespace, setting_key, scope_key),
KEY feature_flags (is_feature_flag, setting_namespace),
KEY updated_at (updated_at)
) {$collation};",
			$roles_table      => "CREATE TABLE {$roles_table} (
role_permission_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
role_slug varchar(191) NOT NULL,
capability varchar(191) NOT NULL,
scope_type varchar(32) NOT NULL DEFAULT 'global',
scope_id bigint(20) unsigned NULL,
scope_key varchar(191) NOT NULL DEFAULT 'global',
permission_effect varchar(16) NOT NULL DEFAULT 'allow',
created_at datetime(6) NOT NULL,
updated_at datetime(6) NOT NULL,
PRIMARY KEY  (role_permission_id),
UNIQUE KEY role_capability_scope (role_slug, capability, scope_key),
KEY capability_scope (capability, scope_key),
KEY updated_at (updated_at)
) {$collation};",
			$audit_table      => "CREATE TABLE {$audit_table} (
audit_id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
public_id char(36) NOT NULL,
request_id char(36) NULL,
action_name varchar(191) NOT NULL,
entity_type varchar(100) NOT NULL,
entity_id varchar(191) NULL,
actor_user_id bigint(20) unsigned NULL,
manager_user_id bigint(20) unsigned NULL,
device_id varchar(191) NULL,
location_id bigint(20) unsigned NULL,
result_status varchar(32) NOT NULL DEFAULT 'success',
before_hash char(64) NULL,
after_hash char(64) NULL,
context_json longtext NULL,
created_at datetime(6) NOT NULL,
PRIMARY KEY  (audit_id),
UNIQUE KEY public_id (public_id),
KEY entity_lookup (entity_type, entity_id, created_at),
KEY actor_lookup (actor_user_id, created_at),
KEY action_lookup (action_name, created_at),
KEY created_at (created_at)
) {$collation};",
		);
	}

	/**
	 * Return tables in safe reverse dependency order.
	 *
	 * @return list<string>
	 */
	public static function drop_order( string $prefix ): array {
		return array(
			$prefix . 'tcg_audit_log',
			$prefix . 'tcg_role_permissions',
			$prefix . 'tcg_settings',
			$prefix . 'tcg_schema_migrations',
		);
	}

	private function __construct() {
	}
}
