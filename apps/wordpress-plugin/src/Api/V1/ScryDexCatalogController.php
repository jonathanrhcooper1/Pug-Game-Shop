<?php
/**
 * Admin ScryDex catalog indexing endpoints.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Settings\Settings;
use TCGStorePlatform\ScryDex\ScryDexCardsSyncWorker;
use TCGStorePlatform\ScryDex\ScryDexCardsSyncWorkerPlanner;
use TCGStorePlatform\ScryDex\ScryDexPersistenceRepository;
use TCGStorePlatform\ScryDex\ScryDexPersistenceRepositoryReadinessPlanner;
use TCGStorePlatform\ScryDex\ScryDexProvider;
use TCGStorePlatform\ScryDex\ScryDexProviderFactory;
use TCGStorePlatform\ScryDex\ScryDexSyncCheckpointRepositoryPlanner;
use TCGStorePlatform\ScryDex\ScryDexSyncDryRunPlanner;
use TCGStorePlatform\ScryDex\ScryDexSyncExecutionGate;
use TCGStorePlatform\ScryDex\ScryDexUsageBudgetPlanner;

final class ScryDexCatalogController {
	private const NAMESPACE     = 'tcg-store/v1';
	private const MAX_PAGE_SIZE = 100;
	private const MAX_PAGES     = 25;

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ), 25 );
	}

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/scrydex/catalog/status',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'status' ),
				'permission_callback' => array( $this, 'can_view_catalog' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/scrydex/catalog/index',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'index' ),
				'permission_callback' => array( $this, 'can_manage_catalog' ),
			)
		);
	}

	public function can_manage_catalog(): bool {
		return function_exists( 'current_user_can' ) && current_user_can( 'manage_settings' );
	}

	public function can_view_catalog(): bool {
		return function_exists( 'current_user_can' )
			&& ( current_user_can( 'manage_settings' ) || current_user_can( 'edit_inventory' ) );
	}

	public function status( \WP_REST_Request $request ): \WP_REST_Response {
		unset( $request );

		return new \WP_REST_Response(
			array(
				'data' => array(
					'resource'                     => 'scrydex_catalog_status',
					'counts'                       => $this->catalog_counts(),
					'latest_checkpoints'           => $this->latest_checkpoints(),
					'database_prefix_valid'        => $this->table_prefix_ready(),
					'credential_values_redacted'   => true,
					'credentials_synced_to_client' => false,
					'timestamp'                    => gmdate( 'c' ),
				),
			),
			200
		);
	}

	public function index( \WP_REST_Request $request ): \WP_REST_Response {
		$payload  = $this->payload( $request );
		$settings = Settings::all();
		$database = $this->database();

		if ( null === $database || ! $this->table_prefix_ready() ) {
			return $this->blocked_response( 'scrydex_catalog_database_unavailable', array( 'database_prefix_invalid' ) );
		}

		$factory   = new ScryDexProviderFactory( $settings );
		$readiness = $factory->readiness_summary();
		if ( true !== ( $readiness['configured'] ?? false ) ) {
			return $this->blocked_response(
				'scrydex_provider_not_configured',
				is_array( $readiness['configuration_issues'] ?? null ) ? $readiness['configuration_issues'] : array()
			);
		}

		$game                    = $this->slug( $payload['game'] ?? 'pokemon', 'pokemon' );
		$expansion_id            = $this->slug( $payload['expansion_id'] ?? '', '' );
		$page_size               = $this->bounded_int( $payload['page_size'] ?? self::MAX_PAGE_SIZE, 1, self::MAX_PAGE_SIZE );
		$max_pages               = $this->bounded_int( $payload['max_pages'] ?? 1, 1, self::MAX_PAGES );
		$execute_database_writes = $this->truthy( $payload['execute_database_writes'] ?? false );
		$index_expansions        = $this->truthy( $payload['index_expansions'] ?? false );
		$provider                = $factory->provider();
		$usage                   = $this->usage_snapshot( $provider );

		if ( 'ready' !== $usage['status'] ) {
			return $this->blocked_response( 'scrydex_usage_unavailable', $usage['errors'] );
		}

		$gate_overrides = array(
			'network_requests_enabled'    => true,
			'usage_budget_configured'     => true,
			'database_writes_enabled'     => true,
			'scheduled_worker_configured' => true,
			'usage_snapshot'              => $usage['snapshot'],
		);

		$expansion_result = $index_expansions
			? $this->index_expansions( $provider, $game, $page_size, $execute_database_writes )
			: array(
				'status'                    => 'skipped',
				'expansion_index_requested' => false,
			);

		$worker = $this->worker( $settings, $factory, $gate_overrides );
		$cards  = $worker->run_cards_pages(
			array(
				'game'                    => $game,
				'expansion_id'            => $expansion_id,
				'page_size'               => $page_size,
				'max_pages'               => $max_pages,
				'execute_database_writes' => $execute_database_writes,
			),
			array(),
			$gate_overrides
		);

		return new \WP_REST_Response(
			array(
				'data' => array(
					'resource'                       => 'scrydex_catalog_index',
					'accepted'                       => true,
					'game'                           => $game,
					'expansion_id'                   => $expansion_id,
					'page_size'                      => $page_size,
					'max_pages'                      => $max_pages,
					'execute_database_writes'        => $execute_database_writes,
					'usage_snapshot'                 => $usage['public_snapshot'],
					'expansions'                     => $expansion_result,
					'cards'                          => $cards,
					'counts_after'                   => $this->catalog_counts(),
					'credential_values_redacted'     => true,
					'provider_result_bodies_logged'  => false,
					'credentials_synced_to_client'   => false,
					'next_action'                    => $this->next_action( $cards ),
				),
			),
			200
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function payload( \WP_REST_Request $request ): array {
		$json = $request->get_json_params();

		return is_array( $json ) ? $json : $request->get_body_params();
	}

	private function worker( array $settings, ScryDexProviderFactory $factory, array $gate_overrides ): ScryDexCardsSyncWorker {
		unset( $gate_overrides );

		$database     = $this->database();
		$table_prefix = null === $database ? '' : $database->prefix;
		$gate         = new ScryDexSyncExecutionGate(
			new ScryDexSyncDryRunPlanner( $factory ),
			new ScryDexUsageBudgetPlanner( $settings ),
			new ScryDexSyncCheckpointRepositoryPlanner( $table_prefix ),
			new ScryDexPersistenceRepositoryReadinessPlanner( $table_prefix )
		);
		$planner      = new ScryDexCardsSyncWorkerPlanner(
			$table_prefix,
			$gate,
			null,
			null,
			null,
			new ScryDexPersistenceRepository( $database )
		);

		return new ScryDexCardsSyncWorker( $table_prefix, $factory, $gate, $planner );
	}

	/**
	 * @return array{status:string,snapshot:array<string,mixed>,public_snapshot:array<string,mixed>,errors:list<string>}
	 */
	private function usage_snapshot( ScryDexProvider $provider ): array {
		$result = $provider->get_usage();
		if ( ! $result->is_success() ) {
			return array(
				'status'          => 'blocked',
				'snapshot'        => array(),
				'public_snapshot' => array(
					'available'   => false,
					'http_status' => $result->http_status(),
					'error_code'  => $result->error_code(),
				),
				'errors'          => array( $result->error_code() ?? 'scrydex_usage_request_failed' ),
			);
		}

		$body     = $result->body();
		$snapshot = array(
			'used_credits'          => (int) ( $body['used_credits'] ?? ( $body['usedCredits'] ?? 0 ) ),
			'remaining_credits'     => (int) ( $body['remaining_credits'] ?? ( $body['remainingCredits'] ?? 0 ) ),
			'total_credits'         => (int) ( $body['total_credits'] ?? ( $body['totalCredits'] ?? 0 ) ),
			'snapshot_recorded_at'  => gmdate( 'c' ),
			'usage_window_start_at' => '',
		);

		return array(
			'status'          => 'ready',
			'snapshot'        => $snapshot,
			'public_snapshot' => array(
				'available'          => true,
				'used_credits'       => $snapshot['used_credits'],
				'remaining_credits'  => $snapshot['remaining_credits'],
				'total_credits'      => $snapshot['total_credits'],
				'refreshed_at_utc'   => $snapshot['snapshot_recorded_at'],
				'credentials_hidden' => true,
			),
			'errors'          => array(),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function index_expansions(
		ScryDexProvider $provider,
		string $game,
		int $page_size,
		bool $execute_database_writes
	): array {
		$result = $provider->search_expansions(
			'',
			array(
				'game'      => $game,
				'page_size' => (string) $page_size,
			),
			1,
			''
		);

		if ( ! $result->is_success() ) {
			return array(
				'status'      => 'blocked',
				'http_status' => $result->http_status(),
				'error_code'  => $result->error_code(),
			);
		}

		$rows       = $this->expansion_rows( $result->body(), $game );
		$write_rows = $execute_database_writes ? $this->persist_expansions( $rows ) : 0;

		return array(
			'status'                    => 'completed',
			'expansion_index_requested' => true,
			'provider_request_count'    => 1,
			'row_count'                 => count( $rows ),
			'write_count'               => $write_rows,
			'database_writes_deferred'  => ! $execute_database_writes,
			'provider_body_logged'      => false,
		);
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function expansion_rows( array $body, string $game ): array {
		$data = $body['data'] ?? $body['expansions'] ?? array();

		if ( ! is_array( $data ) ) {
			return array();
		}

		$rows = array();
		foreach ( $data as $raw ) {
			if ( ! is_array( $raw ) ) {
				continue;
			}

			$provider_set_id = $this->text( $raw['id'] ?? '' );
			$name            = $this->text( $raw['name'] ?? '' );

			if ( '' === $provider_set_id || '' === $name ) {
				continue;
			}

			$rows[] = array(
				'public_id'           => $this->uuid_from_key( 'scrydex:set:' . $provider_set_id ),
				'provider_name'       => 'scrydex',
				'provider_set_id'     => $provider_set_id,
				'game'                => $game,
				'name'                => $name,
				'series'              => $this->nullable_text( $raw['series'] ?? null ),
				'set_code'            => $this->nullable_text( $raw['code'] ?? $provider_set_id ),
				'total_cards'         => $this->nullable_int( $raw['total'] ?? null ),
				'printed_total'       => $this->nullable_int( $raw['printed_total'] ?? ( $raw['printedTotal'] ?? null ) ),
				'language'            => $this->nullable_text( $raw['language'] ?? null ),
				'language_code'       => $this->nullable_text( $raw['language_code'] ?? ( $raw['languageCode'] ?? null ) ),
				'release_date'        => $this->date_value( $raw['release_date'] ?? ( $raw['releaseDate'] ?? null ) ),
				'logo_url'            => $this->url( $raw['logo'] ?? ( $raw['logo_url'] ?? null ) ),
				'symbol_url'          => $this->url( $raw['symbol'] ?? ( $raw['symbol_url'] ?? null ) ),
				'is_online_only'      => ! empty( $raw['is_online_only'] ?? ( $raw['isOnlineOnly'] ?? false ) ) ? 1 : 0,
				'search_text'         => implode( ' ', array_filter( array( $game, $name, $provider_set_id, $raw['series'] ?? '' ) ) ),
				'provider_updated_at' => null,
				'created_at'          => gmdate( 'Y-m-d H:i:s' ),
				'updated_at'          => gmdate( 'Y-m-d H:i:s' ),
				'row_version'         => 1,
			);
		}

		return $rows;
	}

	/**
	 * @param list<array<string, mixed>> $rows Expansion rows.
	 */
	private function persist_expansions( array $rows ): int {
		$database = $this->database();
		if ( null === $database ) {
			return 0;
		}

		$table    = $database->prefix . 'tcg_reference_sets';
		$count    = 0;

		foreach ( $rows as $row ) {
			$result = $database->query(
				$database->prepare(
					"INSERT INTO {$table}
					(public_id, provider_name, provider_set_id, game, name, series, set_code, total_cards, printed_total, language, language_code, release_date, logo_url, symbol_url, is_online_only, search_text, provider_updated_at, created_at, updated_at, row_version)
					VALUES (%s, %s, %s, %s, %s, %s, %s, %d, %d, %s, %s, %s, %s, %s, %d, %s, %s, %s, %s, %d)
					ON DUPLICATE KEY UPDATE name = VALUES(name), series = VALUES(series), set_code = VALUES(set_code), total_cards = VALUES(total_cards), printed_total = VALUES(printed_total), language = VALUES(language), language_code = VALUES(language_code), release_date = VALUES(release_date), logo_url = VALUES(logo_url), symbol_url = VALUES(symbol_url), is_online_only = VALUES(is_online_only), search_text = VALUES(search_text), updated_at = VALUES(updated_at), row_version = row_version + 1",
					$row['public_id'],
					$row['provider_name'],
					$row['provider_set_id'],
					$row['game'],
					$row['name'],
					$row['series'],
					$row['set_code'],
					$row['total_cards'],
					$row['printed_total'],
					$row['language'],
					$row['language_code'],
					$row['release_date'],
					$row['logo_url'],
					$row['symbol_url'],
					$row['is_online_only'],
					$row['search_text'],
					$row['provider_updated_at'],
					$row['created_at'],
					$row['updated_at'],
					$row['row_version']
				)
			);

			if ( false !== $result ) {
				++$count;
			}
		}

		return $count;
	}

	/**
	 * @return array<string, int>
	 */
	private function catalog_counts(): array {
		if ( ! $this->table_prefix_ready() ) {
			return array(
				'reference_sets'              => 0,
				'reference_cards'             => 0,
				'reference_variants'          => 0,
				'provider_price_observations' => 0,
				'provider_price_points'       => 0,
				'sync_checkpoints'            => 0,
			);
		}

		$database = $this->database();
		$tables = array(
			'reference_sets'              => 'tcg_reference_sets',
			'reference_cards'             => 'tcg_reference_cards',
			'reference_variants'          => 'tcg_reference_variants',
			'provider_price_observations' => 'tcg_provider_price_observations',
			'provider_price_points'       => 'tcg_provider_price_points',
			'sync_checkpoints'            => 'tcg_sync_checkpoints',
		);
		$counts = array();

		foreach ( $tables as $key => $table ) {
			$counts[ $key ] = $this->table_count( $database->prefix . $table );
		}

		return $counts;
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function latest_checkpoints(): array {
		$database = $this->database();
		if ( null === $database || ! $this->table_prefix_ready() ) {
			return array();
		}

		$table    = $database->prefix . 'tcg_sync_checkpoints';

		if ( ! $this->table_exists( $table ) ) {
			return array();
		}

		$rows = $database->get_results(
			"SELECT provider_name, resource_type, resource_key, page_number, cursor_value, committed_count, updated_at FROM {$table} WHERE provider_name = 'scrydex' ORDER BY updated_at DESC LIMIT 10", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			ARRAY_A
		);

		return is_array( $rows ) ? $rows : array();
	}

	private function table_count( string $table_name ): int {
		$database = $this->database();
		if ( null === $database ) {
			return 0;
		}

		if ( ! $this->table_exists( $table_name ) ) {
			return 0;
		}

		return max( 0, (int) $database->get_var( "SELECT COUNT(1) FROM {$table_name}" ) ); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
	}

	private function table_exists( string $table_name ): bool {
		$database = $this->database();
		if ( null === $database ) {
			return false;
		}

		$like = method_exists( $database, 'esc_like' )
			? $database->esc_like( $table_name )
			: addcslashes( $table_name, '_%\\' );
		$found    = $database->get_var(
			$database->prepare( 'SHOW TABLES LIKE %s', array( $like ) )
		);

		return $found === $table_name;
	}

	private function database(): ?\wpdb {
		global $wpdb;

		return is_object( $wpdb ) && class_exists( '\wpdb' ) && $wpdb instanceof \wpdb ? $wpdb : null;
	}

	private function table_prefix_ready(): bool {
		$database = $this->database();
		$prefix   = null === $database ? '' : (string) $database->prefix;

		return '' !== $prefix && 1 === preg_match( '/^[A-Za-z0-9_]+$/', $prefix );
	}

	/**
	 * @param list<string> $errors Blocking errors.
	 */
	private function blocked_response( string $code, array $errors ): \WP_REST_Response {
		return new \WP_REST_Response(
			array(
				'error' => array(
					'code'    => $code,
					'message' => __( 'ScryDex catalog indexing is not ready.', 'tcg-store-platform' ),
					'details' => array(
						'errors'                       => array_values( array_unique( array_map( 'strval', $errors ) ) ),
						'credential_values_redacted'   => true,
						'credentials_synced_to_client' => false,
					),
				),
			),
			409
		);
	}

	private function next_action( array $cards ): string {
		if ( true === ( $cards['continuation_available'] ?? false ) ) {
			return 'Run the same request again to continue from the saved ScryDex checkpoint.';
		}

		if ( 'completed' === (string) ( $cards['status'] ?? '' ) ) {
			return 'Catalog batch completed for this scope.';
		}

		return 'Review block reasons before continuing.';
	}

	private function slug( mixed $value, string $fallback ): string {
		$value = strtolower( trim( (string) $value ) );
		$value = preg_replace( '/[^a-z0-9_-]+/', '-', $value ) ?? '';
		$value = trim( $value, '-' );

		return '' === $value ? $fallback : substr( $value, 0, 64 );
	}

	private function text( mixed $value ): string {
		return substr( trim( (string) $value ), 0, 191 );
	}

	private function nullable_text( mixed $value ): ?string {
		$value = $this->text( $value ?? '' );

		return '' === $value ? null : $value;
	}

	private function nullable_int( mixed $value ): ?int {
		return is_numeric( $value ) ? max( 0, (int) $value ) : null;
	}

	private function url( mixed $value ): ?string {
		$value = trim( (string) ( $value ?? '' ) );

		return filter_var( $value, FILTER_VALIDATE_URL ) ? substr( $value, 0, 255 ) : null;
	}

	private function date_value( mixed $value ): ?string {
		$value = trim( (string) ( $value ?? '' ) );
		if ( '' === $value ) {
			return null;
		}

		$timestamp = strtotime( str_replace( '/', '-', $value ) );

		return false === $timestamp ? null : gmdate( 'Y-m-d', $timestamp );
	}

	private function bounded_int( mixed $value, int $min, int $max ): int {
		return max( $min, min( $max, (int) $value ) );
	}

	private function truthy( mixed $value ): bool {
		if ( true === $value ) {
			return true;
		}

		return is_scalar( $value ) && in_array( strtolower( trim( (string) $value ) ), array( '1', 'true', 'yes', 'on' ), true );
	}

	private function uuid_from_key( string $key ): string {
		$hash = md5( $key );

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
}
