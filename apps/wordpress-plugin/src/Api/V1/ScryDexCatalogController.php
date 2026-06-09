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
	private const MAX_EXPORT_PAGE_SIZE = 1000;
	private const DOCUMENTED_REQUESTS_PER_SECOND_LIMIT = 100;
	private const USAGE_REQUEST_CREDIT_ESTIMATE        = 1;
	private const EXPORT_TABLES = array(
		'reference_sets'              => 'tcg_reference_sets',
		'reference_cards'             => 'tcg_reference_cards',
		'reference_variants'          => 'tcg_reference_variants',
		'provider_price_observations' => 'tcg_provider_price_observations',
		'provider_price_points'       => 'tcg_provider_price_points',
		'sync_checkpoints'            => 'tcg_sync_checkpoints',
	);

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

		register_rest_route(
			self::NAMESPACE,
			'/scrydex/catalog/export',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( $this, 'export' ),
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
					'integrity'                    => $this->catalog_integrity_summary(),
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
		$payload                 = $this->payload( $request );
		$game                    = $this->slug( $payload['game'] ?? 'pokemon', 'pokemon' );
		$expansion_id            = $this->provider_resource_id( $payload['expansion_id'] ?? '' );
		$page_size               = $this->bounded_int( $payload['page_size'] ?? self::MAX_PAGE_SIZE, 1, self::MAX_PAGE_SIZE );
		$max_pages               = $this->unbounded_page_count( $payload['max_pages'] ?? 1 );
		$expansions_page         = $this->bounded_int( $payload['expansions_page'] ?? 1, 1, PHP_INT_MAX );
		$max_expansion_pages     = $this->unbounded_page_count( $payload['max_expansion_pages'] ?? 1 );
		$execute_database_writes = $this->truthy( $payload['execute_database_writes'] ?? false );
		$index_expansions        = $this->truthy( $payload['index_expansions'] ?? false );
		$skip_cards              = $this->truthy( $payload['skip_cards'] ?? false );
		$include_usage_snapshot  = $this->truthy( $payload['include_usage_snapshot'] ?? false );
		$checkpoint              = is_array( $payload['checkpoint'] ?? null ) ? $payload['checkpoint'] : array();
		$catalog_request_count   = $this->planned_catalog_request_count( $index_expansions, $max_expansion_pages, $skip_cards, $max_pages );
		$provider_request_count  = $this->planned_provider_request_count( $catalog_request_count );
		$rate_limit_plan         = $this->rate_limit_plan( $provider_request_count );

		if ( $execute_database_writes && ! $this->can_manage_catalog() ) {
			return $this->blocked_response(
				'scrydex_catalog_write_permission_denied',
				array( 'scrydex_manager_capability_required' ),
				array(
					'write_permission_required' => 'manage_settings',
					'rate_limit_plan'           => $rate_limit_plan,
				)
			);
		}

		$settings = Settings::all();
		$database = $this->database();

		if ( null === $database || ! $this->table_prefix_ready() ) {
			return $this->blocked_response( 'scrydex_catalog_database_unavailable', array( 'database_prefix_invalid' ) );
		}

		$factory   = new ScryDexProviderFactory( $settings );
		$readiness = $factory->readiness_summary();
		$provider  = $factory->provider();
		if ( true !== ( $readiness['configured'] ?? false ) ) {
			return $this->blocked_response(
				'scrydex_provider_not_configured',
				is_array( $readiness['configuration_issues'] ?? null ) ? $readiness['configuration_issues'] : array()
			);
		}

		$usage = $include_usage_snapshot && $provider_request_count > 0 ? $this->usage_snapshot( $provider ) : $this->skipped_usage_snapshot();

		if ( 'ready' !== $usage['status'] && 'skipped' !== $usage['status'] ) {
			return $this->blocked_response( 'scrydex_usage_unavailable', $usage['errors'], array( 'rate_limit_plan' => $rate_limit_plan ) );
		}

		$usage_budget_plan = $this->enterprise_usage_budget_plan( $game, $page_size, $provider_request_count, $include_usage_snapshot );

		$gate_overrides = array(
			'network_requests_enabled'          => true,
			'usage_budget_configured'           => true,
			'checkpoint_repository_configured'  => true,
			'persistence_repository_configured' => true,
			'database_writes_enabled'           => true,
			'scheduled_worker_configured'       => true,
		);
		if ( 'ready' === $usage['status'] ) {
			$gate_overrides['usage_snapshot'] = $usage['snapshot'];
		}

		$expansion_result = $index_expansions
			? $this->index_expansions( $provider, $game, $page_size, $expansions_page, $max_expansion_pages, $execute_database_writes )
			: array(
				'status'                    => 'skipped',
				'expansion_index_requested' => false,
			);

		$cards = $skip_cards
			? array(
				'status'                    => 'skipped',
				'page_count'                => 0,
				'provider_request_count'    => 0,
				'continuation_available'    => false,
				'cards_index_requested'     => false,
				'database_writes_deferred'  => ! $execute_database_writes,
				'provider_result_logged'    => false,
			)
			: $this->worker( $settings, $factory, $gate_overrides )->run_cards_pages(
				array(
					'game'                    => $game,
					'expansion_id'            => $expansion_id,
					'page_size'               => $page_size,
					'max_pages'               => $max_pages,
					'checkpoint'              => $checkpoint,
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
					'expansions_page'                => $expansions_page,
					'max_expansion_pages'            => $max_expansion_pages,
					'include_usage_snapshot'         => $include_usage_snapshot,
					'skip_cards'                     => $skip_cards,
					'execute_database_writes'        => $execute_database_writes,
					'usage_budget_plan'              => $usage_budget_plan,
					'rate_limit_plan'                => $rate_limit_plan,
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

	public function export( \WP_REST_Request $request ): \WP_REST_Response {
		$table_key = $this->slug( $request->get_param( 'table' ) ?? 'reference_cards', 'reference_cards' );
		$page      = $this->bounded_int( $request->get_param( 'page' ) ?? 1, 1, PHP_INT_MAX );
		$page_size = $this->bounded_int( $request->get_param( 'page_size' ) ?? 500, 1, self::MAX_EXPORT_PAGE_SIZE );
		$database  = $this->database();

		if ( null === $database || ! $this->table_prefix_ready() ) {
			return $this->blocked_response( 'scrydex_catalog_database_unavailable', array( 'database_prefix_invalid' ) );
		}

		if ( ! array_key_exists( $table_key, self::EXPORT_TABLES ) ) {
			return $this->blocked_response(
				'scrydex_catalog_export_table_invalid',
				array( 'scrydex_catalog_export_table_invalid' ),
				array(
					'allowed_tables' => array_keys( self::EXPORT_TABLES ),
				)
			);
		}

		$table = $database->prefix . self::EXPORT_TABLES[ $table_key ];
		if ( ! $this->table_exists( $table ) ) {
			return $this->blocked_response(
				'scrydex_catalog_export_table_missing',
				array( 'scrydex_catalog_export_table_missing' ),
				array(
					'table' => $table_key,
				)
			);
		}

		$total  = $this->table_count( $table );
		$offset = ( $page - 1 ) * $page_size;
		$rows   = $database->get_results(
			$database->prepare(
				"SELECT * FROM {$table} LIMIT %d OFFSET %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				array( $page_size, $offset )
			),
			ARRAY_A
		);
		$rows   = is_array( $rows ) ? $rows : array();

		return new \WP_REST_Response(
			array(
				'data' => array(
					'resource'                     => 'scrydex_catalog_export',
					'table'                        => $table_key,
					'page'                         => $page,
					'page_size'                    => $page_size,
					'total'                        => $total,
					'has_more'                     => $offset + count( $rows ) < $total,
					'rows'                         => $rows,
					'credential_values_redacted'   => true,
					'credentials_synced_to_client' => false,
					'timestamp'                    => gmdate( 'c' ),
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
	 * @return array{status:string,snapshot:array<string,mixed>,public_snapshot:array<string,mixed>,errors:list<string>}
	 */
	private function skipped_usage_snapshot(): array {
		return array(
			'status'          => 'skipped',
			'snapshot'        => array(),
			'public_snapshot' => array(
				'available'          => false,
				'status'             => 'skipped',
				'credentials_hidden' => true,
			),
			'errors'          => array(),
		);
	}

	/**
	 * @param array<string, mixed> $settings Platform settings.
	 * @param array<string, mixed> $usage_snapshot ScryDex usage snapshot.
	 * @return array<string, mixed>
	 */
	private function usage_budget_plan(
		array $settings,
		string $game,
		int $page_size,
		int $provider_request_count,
		array $usage_snapshot
	): array {
		if ( 0 === $provider_request_count ) {
			return array(
				'status'                         => 'skipped',
				'action'                         => 'scrydex_catalog_usage_budget_plan',
				'planned_provider_request_count' => 0,
				'estimated_credit_cost'          => 0,
				'block_reasons'                  => array(),
			);
		}

		return ( new ScryDexUsageBudgetPlanner( $settings ) )->plan_provider_request_batch(
			array(
				'provider'                       => 'scrydex',
				'resource_type'                  => 'catalog_import',
				'resource_key'                   => $game,
				'page_size'                      => $page_size,
				'planned_provider_request_count' => $provider_request_count,
			),
			$usage_snapshot,
			$provider_request_count
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function enterprise_usage_budget_plan( string $game, int $page_size, int $provider_request_count, bool $include_usage_snapshot ): array {
		return array(
			'status'                           => 'ready',
			'action'                           => 'scrydex_catalog_enterprise_usage_policy',
			'provider'                         => 'scrydex',
			'resource_type'                    => 'catalog_import',
			'resource_key'                     => $game,
			'page_size'                        => $page_size,
			'planned_provider_request_count'   => $provider_request_count,
			'estimated_credit_cost'            => $provider_request_count,
			'usage_snapshot_requested'         => $include_usage_snapshot,
			'daily_credit_budget_enforced'     => false,
			'minimum_remaining_credit_enforced' => false,
			'enterprise_overage_allowed'       => true,
			'block_reasons'                    => array(),
		);
	}

	private function planned_catalog_request_count( bool $index_expansions, int $max_expansion_pages, bool $skip_cards, int $max_pages ): int {
		$expansion_pages = $index_expansions ? $this->count_for_estimate( $max_expansion_pages ) : 0;
		$card_pages      = $skip_cards ? 0 : $this->count_for_estimate( $max_pages );

		return $expansion_pages + $card_pages;
	}

	private function planned_provider_request_count( int $catalog_request_count ): int {
		return 0 === $catalog_request_count
			? 0
			: $catalog_request_count + self::USAGE_REQUEST_CREDIT_ESTIMATE;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function rate_limit_plan( int $provider_request_count ): array {
		return array(
			'status'                                => 'informational',
			'allowed'                               => true,
			'planned_provider_request_count'        => $provider_request_count,
			'documented_requests_per_second_limit'  => self::DOCUMENTED_REQUESTS_PER_SECOND_LIMIT,
			'max_provider_requests_per_rest_call'   => null,
			'usage_request_credit_estimate_included' => $provider_request_count > 0,
			'short_page_completion_rule'            => 'continue until provider returns fewer rows than page_size',
			'block_reasons'                         => array(),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function index_expansions(
		ScryDexProvider $provider,
		string $game,
		int $page_size,
		int $start_page,
		int $max_pages,
		bool $execute_database_writes
	): array {
		$request_count          = 0;
		$row_count              = 0;
		$write_rows             = 0;
		$current_page           = $start_page;
		$last_page_requested    = $start_page;
		$continuation_available = false;
		$next_page              = null;
		$provider_set_ids       = array();

		for ( $offset = 0; $offset < $max_pages; ++$offset ) {
			$result = $provider->search_expansions(
				'',
				array(
					'game'      => $game,
					'page_size' => (string) $page_size,
				),
				$current_page,
				''
			);

			++$request_count;
			$last_page_requested = $current_page;

			if ( ! $result->is_success() ) {
				return array(
					'status'                    => 'blocked',
					'expansion_index_requested' => true,
					'provider_request_count'    => $request_count,
					'http_status'               => $result->http_status(),
					'error_code'                => $result->error_code(),
					'provider_body_logged'      => false,
				);
			}

			$body   = $result->body();
			$rows   = $this->expansion_rows( $body, $game );
			$row_count += count( $rows );
			$provider_set_ids = array_merge(
				$provider_set_ids,
				array_map(
					static fn ( array $row ): string => (string) $row['provider_set_id'],
					$rows
				)
			);
			$write_rows += $execute_database_writes ? $this->persist_expansions( $rows ) : 0;
			$continuation_available = $this->has_more_pages( $body, $current_page, $page_size, count( $rows ) );
			$next_page              = $continuation_available ? $last_page_requested + 1 : null;

			if ( ! $continuation_available ) {
				break;
			}

			++$current_page;
		}

		if ( $continuation_available && $request_count >= $max_pages ) {
			$next_page = $last_page_requested + 1;
		}

		return array(
			'status'                    => $continuation_available ? 'page_limit_reached' : 'completed',
			'expansion_index_requested' => true,
			'provider_request_count'    => $request_count,
			'start_page'                => $start_page,
			'last_page'                 => $last_page_requested,
			'next_page'                 => $next_page,
			'continuation_available'    => $continuation_available,
			'short_page_reached'        => ! $continuation_available,
			'row_count'                 => $row_count,
			'write_count'               => $write_rows,
			'provider_set_ids'          => array_values( array_unique( $provider_set_ids ) ),
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
	 * @return array<string, mixed>
	 */
	private function catalog_integrity_summary(): array {
		$empty = array(
			'status'                    => 'empty',
			'cards_checked'             => 0,
			'cards_with_images'         => 0,
			'cards_missing_images'      => 0,
			'cards_with_variants'       => 0,
			'cards_missing_variants'    => 0,
			'cards_with_price_points'   => 0,
			'cards_missing_price_points' => 0,
			'price_points_total'        => 0,
			'condition_price_points'    => 0,
			'image_coverage_percent'    => 0,
			'variant_coverage_percent'  => 0,
			'price_coverage_percent'    => 0,
			'game_counts'               => array(),
			'latest_cards'              => array(),
			'missing_tables'            => array(),
			'credential_values_redacted' => true,
		);

		if ( ! $this->table_prefix_ready() ) {
			$empty['status'] = 'database_unavailable';

			return $empty;
		}

		$database = $this->database();
		if ( null === $database ) {
			$empty['status'] = 'database_unavailable';

			return $empty;
		}

		$tables  = $this->catalog_table_names();
		$missing = $this->missing_catalog_tables( $tables );
		if ( $missing ) {
			$empty['status']         = 'missing_tables';
			$empty['missing_tables'] = $missing;

			return $empty;
		}

		$cards_table    = $tables['reference_cards'];
		$variants_table = $tables['reference_variants'];
		$prices_table   = $tables['provider_price_points'];
		$total_cards    = $this->count_query(
			$database->prepare(
				"SELECT COUNT(1) FROM {$cards_table} WHERE provider_name = %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				'scrydex'
			)
		);

		if ( 0 === $total_cards ) {
			return $empty;
		}

		$cards_with_images = $this->count_query(
			$database->prepare(
				"SELECT COUNT(1) FROM {$cards_table} WHERE provider_name = %s AND front_image_url IS NOT NULL AND front_image_url <> ''", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				'scrydex'
			)
		);
		$cards_with_variants = $this->count_query(
			$database->prepare(
				"SELECT COUNT(1) FROM {$cards_table} c WHERE c.provider_name = %s AND EXISTS (SELECT 1 FROM {$variants_table} v WHERE v.provider_name = c.provider_name AND v.provider_card_id = c.provider_card_id)", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				'scrydex'
			)
		);
		$cards_with_prices = $this->count_query(
			$database->prepare(
				"SELECT COUNT(1) FROM {$cards_table} c WHERE c.provider_name = %s AND EXISTS (SELECT 1 FROM {$prices_table} p WHERE p.provider_name = c.provider_name AND p.provider_card_id = c.provider_card_id)", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				'scrydex'
			)
		);
		$price_points_total = $this->count_query(
			$database->prepare(
				"SELECT COUNT(1) FROM {$prices_table} WHERE provider_name = %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				'scrydex'
			)
		);
		$condition_prices = $this->count_query(
			$database->prepare(
				"SELECT COUNT(1) FROM {$prices_table} WHERE provider_name = %s AND condition_code IS NOT NULL AND condition_code <> ''", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				'scrydex'
			)
		);

		return array(
			'status'                    => $cards_with_images > 0 && $cards_with_prices > 0 ? 'usable' : 'partial',
			'cards_checked'             => $total_cards,
			'cards_with_images'         => $cards_with_images,
			'cards_missing_images'      => max( 0, $total_cards - $cards_with_images ),
			'cards_with_variants'       => $cards_with_variants,
			'cards_missing_variants'    => max( 0, $total_cards - $cards_with_variants ),
			'cards_with_price_points'   => $cards_with_prices,
			'cards_missing_price_points' => max( 0, $total_cards - $cards_with_prices ),
			'price_points_total'        => $price_points_total,
			'condition_price_points'    => $condition_prices,
			'image_coverage_percent'    => $this->coverage_percent( $cards_with_images, $total_cards ),
			'variant_coverage_percent'  => $this->coverage_percent( $cards_with_variants, $total_cards ),
			'price_coverage_percent'    => $this->coverage_percent( $cards_with_prices, $total_cards ),
			'game_counts'               => $this->catalog_game_counts( $cards_table ),
			'latest_cards'              => $this->latest_catalog_cards( $cards_table, $variants_table, $prices_table ),
			'missing_tables'            => array(),
			'credential_values_redacted' => true,
		);
	}

	/**
	 * @return array<string, string>
	 */
	private function catalog_table_names(): array {
		$database = $this->database();
		$prefix   = null === $database ? '' : $database->prefix;

		return array(
			'reference_cards'       => $prefix . 'tcg_reference_cards',
			'reference_variants'    => $prefix . 'tcg_reference_variants',
			'provider_price_points' => $prefix . 'tcg_provider_price_points',
		);
	}

	/**
	 * @param array<string, string> $tables Catalog table names.
	 * @return list<string>
	 */
	private function missing_catalog_tables( array $tables ): array {
		$missing = array();

		foreach ( $tables as $key => $table ) {
			if ( ! $this->table_exists( $table ) ) {
				$missing[] = $key;
			}
		}

		return $missing;
	}

	/**
	 * @return list<array{game:string,cards:int}>
	 */
	private function catalog_game_counts( string $cards_table ): array {
		$database = $this->database();
		if ( null === $database ) {
			return array();
		}

		$rows = $database->get_results(
			$database->prepare(
				"SELECT game, COUNT(1) AS cards FROM {$cards_table} WHERE provider_name = %s GROUP BY game ORDER BY cards DESC, game ASC LIMIT 10", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				'scrydex'
			),
			ARRAY_A
		);

		if ( ! is_array( $rows ) ) {
			return array();
		}

		return array_map(
			static fn ( array $row ): array => array(
				'game'  => (string) ( $row['game'] ?? '' ),
				'cards' => max( 0, (int) ( $row['cards'] ?? 0 ) ),
			),
			$rows
		);
	}

	/**
	 * @return list<array<string, mixed>>
	 */
	private function latest_catalog_cards( string $cards_table, string $variants_table, string $prices_table ): array {
		$database = $this->database();
		if ( null === $database ) {
			return array();
		}

		$rows = $database->get_results(
			$database->prepare(
				"SELECT c.provider_card_id, c.game, c.name, c.set_name, c.set_code, c.card_number, c.printed_number, c.front_image_url, c.updated_at,
					EXISTS (SELECT 1 FROM {$variants_table} v WHERE v.provider_name = c.provider_name AND v.provider_card_id = c.provider_card_id) AS has_variants,
					EXISTS (SELECT 1 FROM {$prices_table} p WHERE p.provider_name = c.provider_name AND p.provider_card_id = c.provider_card_id) AS has_price_points
				FROM {$cards_table} c
				WHERE c.provider_name = %s
				ORDER BY c.updated_at DESC, c.reference_card_id DESC
				LIMIT 8", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				'scrydex'
			),
			ARRAY_A
		);

		if ( ! is_array( $rows ) ) {
			return array();
		}

		return array_map(
			static fn ( array $row ): array => array(
				'provider_card_id' => (string) ( $row['provider_card_id'] ?? '' ),
				'game'             => (string) ( $row['game'] ?? '' ),
				'name'             => (string) ( $row['name'] ?? '' ),
				'set_name'         => (string) ( $row['set_name'] ?? '' ),
				'set_code'         => (string) ( $row['set_code'] ?? '' ),
				'card_number'      => (string) ( $row['card_number'] ?? '' ),
				'printed_number'   => (string) ( $row['printed_number'] ?? '' ),
				'front_image_url'  => (string) ( $row['front_image_url'] ?? '' ),
				'has_image'        => '' !== trim( (string) ( $row['front_image_url'] ?? '' ) ),
				'has_variants'     => ! empty( $row['has_variants'] ),
				'has_price_points' => ! empty( $row['has_price_points'] ),
				'updated_at'       => (string) ( $row['updated_at'] ?? '' ),
			),
			$rows
		);
	}

	private function count_query( string $prepared_sql ): int {
		$database = $this->database();
		if ( null === $database ) {
			return 0;
		}

		return max( 0, (int) $database->get_var( $prepared_sql ) );
	}

	private function coverage_percent( int $covered, int $total ): int {
		if ( 0 >= $total ) {
			return 0;
		}

		return (int) round( ( $covered / $total ) * 100 );
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
	 * @param array<string, mixed> $extra_details Extra secret-free error details.
	 */
	private function blocked_response( string $code, array $errors, array $extra_details = array() ): \WP_REST_Response {
		return new \WP_REST_Response(
			array(
				'error' => array(
					'code'    => $code,
					'message' => __( 'ScryDex catalog indexing is not ready.', 'tcg-store-platform' ),
					'details' => array_merge(
						array(
							'errors'                       => array_values( array_unique( array_map( 'strval', $errors ) ) ),
							'credential_values_redacted'   => true,
							'credentials_synced_to_client' => false,
						),
						$extra_details
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

		if ( 'skipped' === (string) ( $cards['status'] ?? '' ) ) {
			return 'Card import skipped for this request.';
		}

		return 'Review block reasons before continuing.';
	}

	private function slug( mixed $value, string $fallback ): string {
		$value = strtolower( trim( (string) $value ) );
		$value = preg_replace( '/[^a-z0-9_-]+/', '-', $value ) ?? '';
		$value = trim( $value, '-' );

		return '' === $value ? $fallback : substr( $value, 0, 64 );
	}

	private function provider_resource_id( mixed $value ): string {
		$value = trim( (string) $value );
		$value = preg_replace( '/[^A-Za-z0-9_:-]+/', '-', $value ) ?? '';
		$value = trim( $value, '-' );

		return substr( $value, 0, 191 );
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

	private function has_more_pages( array $body, int $page, int $page_size, int $row_count ): bool {
		foreach (
			array(
				$body['has_more'] ?? null,
				$body['hasMore'] ?? null,
				is_array( $body['pagination'] ?? null ) ? ( $body['pagination']['has_more'] ?? null ) : null,
				is_array( $body['pagination'] ?? null ) ? ( $body['pagination']['hasMore'] ?? null ) : null,
			) as $value
		) {
			if ( is_bool( $value ) ) {
				return $value;
			}
		}

		$total = $this->total_count( $body );
		if ( null !== $total ) {
			return $page * $page_size < $total;
		}

		return $row_count >= $page_size;
	}

	private function total_count( array $body ): ?int {
		foreach (
			array(
				$body['totalCount'] ?? null,
				$body['total_count'] ?? null,
				$body['total'] ?? null,
				is_array( $body['pagination'] ?? null ) ? ( $body['pagination']['totalCount'] ?? null ) : null,
				is_array( $body['pagination'] ?? null ) ? ( $body['pagination']['total_count'] ?? null ) : null,
				is_array( $body['meta'] ?? null ) ? ( $body['meta']['totalCount'] ?? null ) : null,
				is_array( $body['meta'] ?? null ) ? ( $body['meta']['total_count'] ?? null ) : null,
			) as $value
		) {
			if ( is_numeric( $value ) ) {
				return max( 0, (int) $value );
			}
		}

		return null;
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

	private function unbounded_page_count( mixed $value ): int {
		$value = (int) $value;

		return 0 >= $value ? PHP_INT_MAX : $value;
	}

	private function count_for_estimate( int $value ): int {
		return PHP_INT_MAX === $value ? 1000000 : max( 0, $value );
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
