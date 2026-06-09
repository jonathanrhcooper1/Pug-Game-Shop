<?php
/**
 * Reference-card catalog search REST handler.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\ScryDex\ScryDexPersistencePlanner;
use TCGStorePlatform\ScryDex\ScryDexPersistenceQueryBuilder;
use TCGStorePlatform\ScryDex\ScryDexPersistenceRepository;
use TCGStorePlatform\ScryDex\ScryDexProvider;
use TCGStorePlatform\ScryDex\ScryDexResult;
use TCGStorePlatform\ScryDex\ScryDexSyncCheckpoint;
use TCGStorePlatform\ScryDex\ScryDexSyncPagePlan;
use TCGStorePlatform\ScryDex\ScryDexSyncPageProcessor;
use Throwable;

final class ReferenceCardSearchRouteHandler {
	public function __construct(
		private \wpdb $database,
		private string $table_prefix = 'wp_',
		private ?ScryDexProvider $scrydex_provider = null,
		private ?ScryDexPersistenceRepository $scrydex_repository = null,
		private ?ScryDexSyncPageProcessor $scrydex_page_processor = null,
		private ?ScryDexPersistencePlanner $scrydex_persistence_planner = null,
		private ?ScryDexPersistenceQueryBuilder $scrydex_query_builder = null
	) {
	}

	/**
	 * @return array<string, mixed>
	 */
	public function search_reference_cards( OfflineRestRequestData $data ): array {
		$request = $this->parse_request( $data );

		if ( array() !== $request['errors'] ) {
			return $this->rejected(
				'reference_search_request_invalid',
				$request['errors']
			);
		}

		$query = $this->build_query(
			(string) $request['query'],
			(string) $request['game'],
			(int) $request['page_size'],
			( (int) $request['page'] - 1 ) * (int) $request['page_size']
		);

		if ( array() !== $query['errors'] ) {
			return $this->rejected(
				'reference_search_query_invalid',
				$query['errors']
			);
		}

		$rows = $this->fetch_rows( $query );

		if ( ! is_array( $rows ) ) {
			return $this->rejected(
				'reference_search_repository_rejected',
				array( 'reference_search_query_failed' )
			);
		}

		$variants_by_reference = $this->fetch_variants( $query, $rows );

		if ( ! is_array( $variants_by_reference ) ) {
			return $this->rejected(
				'reference_search_repository_rejected',
				array( 'reference_search_variants_failed' )
			);
		}

		$total = $this->fetch_total( $query );

		if ( null === $total ) {
			return $this->rejected(
				'reference_search_repository_rejected',
				array( 'reference_search_count_failed' )
			);
		}

		$fallback_response = $this->maybe_provider_fallback( $request, $query, $rows, $total );
		if ( null !== $fallback_response ) {
			return $fallback_response;
		}

		return array(
			'status'      => 'ready',
			'status_code' => 200,
			'code'        => 'reference_search_read_ready',
			'callback'    => 'search_reference_cards',
			'data'        => array(
				'cards'        => $this->present_rows( $rows, $variants_by_reference ),
				'query'        => (string) $request['query'],
				'game'         => (string) $request['game'],
				'source'       => 'wordpress_catalog_cache',
				'lookup_order' => array( 'wordpress_catalog_cache', 'scrydex_provider' ),
				'meta'         => array(
					'total'                     => $total,
					'page'                      => (int) $request['page'],
					'page_size'                 => (int) $request['page_size'],
					'public_catalog_safe'       => true,
					'credentials_in_response'   => false,
					'live_provider_request'     => false,
					'scrydex_credentials_scope' => 'wordpress_server_settings',
				),
			),
			'meta'        => $this->ready_meta( $query, count( $rows ), $total ),
		);
	}

	/**
	 * @return array{query:string,game:string,page:int,page_size:int,errors:list<string>}
	 */
	private function parse_request( OfflineRestRequestData $data ): array {
		$params    = array_merge( $data->query_params(), $data->body_params() );
		$query     = trim( (string) ( $params['q'] ?? ( $params['query'] ?? '' ) ) );
		$game      = strtolower( trim( (string) ( $params['game'] ?? '' ) ) );
		$page_raw  = $params['page'] ?? 1;
		$limit_raw = $params['page_size'] ?? ( $params['limit'] ?? 25 );
		$page      = $this->positive_int( $page_raw, 1 );
		$page_size = $this->positive_int( $limit_raw, 25 );
		$errors    = array();

		if ( '' === $query ) {
			$errors[] = 'reference_search_query_required';
		}

		if ( strlen( $query ) > 120 ) {
			$errors[] = 'query_too_long';
			$query    = substr( $query, 0, 120 );
		}

		if ( '' !== $game && 1 !== preg_match( '/^[a-z0-9_-]{2,64}$/', $game ) ) {
			$errors[] = 'game_invalid';
			$game     = '';
		}

		if ( ! $this->is_positive_intish( $page_raw ) ) {
			$errors[] = 'page_invalid';
			$page     = 1;
		}

		if ( ! $this->is_positive_intish( $limit_raw ) ) {
			$errors[]  = 'page_size_invalid';
			$page_size = 25;
		}

		if ( $page_size > 50 ) {
			$errors[]  = 'page_size_too_large';
			$page_size = 50;
		}

		return array(
			'query'     => $query,
			'game'      => $game,
			'page'      => $page,
			'page_size' => $page_size,
			'errors'    => array_values( array_unique( $errors ) ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function build_query( string $query, string $game, int $limit, int $offset ): array {
		$table_prefix = trim( $this->table_prefix );
		$errors       = array();

		if ( '' === $table_prefix || 1 !== preg_match( '/^[A-Za-z0-9_]+$/', $table_prefix ) ) {
			$errors[] = 'table_prefix_invalid';
		}

		if ( array() !== $errors ) {
			return array( 'errors' => $errors );
		}

		$cards_table    = $table_prefix . 'tcg_reference_cards';
		$variants_table = $table_prefix . 'tcg_reference_variants';
		$prices_table   = $table_prefix . 'tcg_provider_price_observations';
		$like          = '%' . addcslashes( $query, "\\_%" ) . '%';
		$where_parts   = array(
			'(cards.name LIKE %s OR cards.set_name LIKE %s OR cards.set_code LIKE %s OR cards.card_number LIKE %s OR cards.printed_number LIKE %s OR cards.provider_card_id LIKE %s OR cards.search_text LIKE %s)',
		);
		$where_args    = array( $like, $like, $like, $like, $like, $like, $like );

		if ( '' !== $game ) {
			$where_parts[] = 'cards.game = %s';
			$where_args[]  = $game;
		}

		$where_sql = implode( ' AND ', $where_parts );
		$select    = "
			SELECT
				cards.public_id,
				cards.reference_card_id,
				cards.provider_name,
				cards.provider_card_id,
				cards.game,
				cards.name,
				cards.set_name,
				cards.set_code,
				cards.card_number,
				cards.printed_number,
				cards.front_image_url,
				cards.back_image_url,
				cards.provider_updated_at,
				cards.updated_at,
				cards.row_version,
				latest.market_price,
				latest.currency AS market_price_currency,
				latest.observed_at AS price_observed_at
			FROM {$cards_table} cards
			LEFT JOIN {$prices_table} latest
				ON latest.provider_price_observation_id = (
					SELECT price.provider_price_observation_id
					FROM {$prices_table} price
					WHERE price.provider_name = cards.provider_name
						AND price.provider_card_id = cards.provider_card_id
					ORDER BY price.observed_at DESC, price.provider_price_observation_id DESC
					LIMIT 1
				)
			WHERE {$where_sql}
			ORDER BY cards.name ASC, cards.set_code ASC, cards.card_number ASC
			LIMIT %d OFFSET %d
		";
		$count     = "
			SELECT COUNT(1)
			FROM {$cards_table} cards
			WHERE {$where_sql}
		";

		return array(
			'cards_table'         => $cards_table,
			'variants_table'      => $variants_table,
			'prices_table'        => $prices_table,
			'select_sql_template' => $select,
			'select_prepare_args' => array_merge( $where_args, array( $limit, $offset ) ),
			'count_sql_template'  => $count,
			'count_prepare_args'  => $where_args,
			'errors'              => array(),
		);
	}

	/**
	 * @param array<string, mixed> $query Query plan.
	 * @param list<array<string, mixed>> $rows Reference card rows.
	 * @return array<int, list<array<string, mixed>>>|false
	 */
	private function fetch_variants( array $query, array $rows ): array|false {
		if ( ! method_exists( $this->database, 'prepare' ) || ! method_exists( $this->database, 'get_results' ) ) {
			return false;
		}

		$reference_ids = array_values(
			array_unique(
				array_filter(
					array_map(
						fn ( array $row ): ?int => $this->positive_reference_id( $row['reference_card_id'] ?? null ),
						$rows
					)
				)
			)
		);

		if ( array() === $reference_ids ) {
			return array();
		}

		$placeholders = implode( ', ', array_fill( 0, count( $reference_ids ), '%d' ) );
		$template     = "
			SELECT
				reference_card_id,
				provider_variant_id,
				variant,
				finish,
				parallel_name,
				edition,
				language,
				raw_or_graded_support,
				normalized_attributes_json
			FROM {$query['variants_table']}
			WHERE reference_card_id IN ({$placeholders})
			ORDER BY reference_card_id ASC, variant ASC, finish ASC, edition ASC
		";
		$prepared     = $this->database->prepare(
			$template, // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$reference_ids
		);
		$variant_rows = $this->database->get_results(
			$prepared, // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$this->array_a_output_type()
		);

		if ( ! is_array( $variant_rows ) ) {
			return false;
		}

		$indexed = array();
		foreach ( $variant_rows as $variant_row ) {
			if ( ! is_array( $variant_row ) ) {
				continue;
			}

			$reference_id = $this->positive_reference_id( $variant_row['reference_card_id'] ?? null );
			if ( null === $reference_id ) {
				continue;
			}

			$indexed[ $reference_id ][] = $this->present_variant_row( $variant_row );
		}

		return $indexed;
	}

	/**
	 * @param array<string, mixed> $query Query plan.
	 * @return list<array<string, mixed>>|false
	 */
	private function fetch_rows( array $query ): array|false {
		if ( ! method_exists( $this->database, 'prepare' ) || ! method_exists( $this->database, 'get_results' ) ) {
			return false;
		}

		$prepared = $this->database->prepare(
			(string) $query['select_sql_template'], // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$query['select_prepare_args']
		);
		$rows     = $this->database->get_results(
			$prepared, // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$this->array_a_output_type()
		);

		return is_array( $rows ) ? $rows : false;
	}

	/**
	 * @param array<string, mixed> $query Query plan.
	 */
	private function fetch_total( array $query ): ?int {
		if ( ! method_exists( $this->database, 'prepare' ) || ! method_exists( $this->database, 'get_var' ) ) {
			return null;
		}

		$prepared = $this->database->prepare(
			(string) $query['count_sql_template'], // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$query['count_prepare_args']
		);
		$value    = $this->database->get_var(
			$prepared // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
		);

		return $this->non_negative_int( $value );
	}

	/**
	 * @param list<array<string, mixed>> $rows Reference card rows.
	 * @return list<array<string, mixed>>
	 */
	private function present_rows( array $rows, array $variants_by_reference = array() ): array {
		return array_values(
			array_map(
				fn ( array $row ): array => $this->present_row(
					$row,
					$variants_by_reference[ (int) ( $row['reference_card_id'] ?? 0 ) ] ?? array()
				),
				array_filter( $rows, 'is_array' )
			)
		);
	}

	/**
	 * @param array{query:string,game:string,page:int,page_size:int,errors:list<string>} $request Parsed request.
	 * @param array<string, mixed>                                                      $query Query plan.
	 * @param list<array<string, mixed>>                                                $rows Reference rows.
	 * @return array<string, mixed>|null
	 */
	private function maybe_provider_fallback( array $request, array $query, array $rows, int $total ): ?array {
		if ( null === $this->scrydex_provider || 0 !== $total || array() !== $rows || 1 !== (int) $request['page'] ) {
			return null;
		}

		$game = '' !== (string) $request['game'] ? (string) $request['game'] : 'pokemon';

		try {
			$result = $this->scrydex_provider->search_cards(
				(string) $request['query'],
				array(
					'game'      => $game,
					'page_size' => (string) $request['page_size'],
					'include'   => 'prices',
				),
				1,
				''
			);
		} catch ( Throwable $error ) {
			return $this->provider_fallback_unavailable_response(
				$request,
				$query,
				'scrydex_provider_exception',
				$error->getMessage()
			);
		}

		if ( ! $result->is_success() ) {
			return $this->provider_fallback_unavailable_response(
				$request,
				$query,
				$result->error_code() ?? 'scrydex_provider_failed',
				$result->message(),
				$result
			);
		}

		$page_plan          = $this->page_processor()->process_cards_page(
			ScryDexSyncCheckpoint::initial( 0, 'cards', $game ),
			$result
		);
		$persistence       = $this->persist_provider_fallback( $page_plan );
		$variants_by_card  = $this->provider_variants_by_card( $page_plan );
		$provider_cards    = $this->present_provider_rows(
			$page_plan->reference_rows(),
			$this->provider_prices_by_card( $page_plan ),
			$variants_by_card
		);
		$normalizer_errors = $page_plan->errors();

		return array(
			'status'      => 'ready',
			'status_code' => 200,
			'code'        => 'reference_search_read_ready',
			'callback'    => 'search_reference_cards',
			'data'        => array(
				'cards'        => $provider_cards,
				'query'        => (string) $request['query'],
				'game'         => $game,
				'source'       => 'scrydex_provider',
				'lookup_order' => array( 'wordpress_catalog_cache', 'scrydex_provider' ),
				'meta'         => array(
					'total'                       => count( $provider_cards ),
					'page'                        => (int) $request['page'],
					'page_size'                   => (int) $request['page_size'],
					'public_catalog_safe'         => true,
					'credentials_in_response'     => false,
					'live_provider_request'       => true,
					'wordpress_catalog_cache_hit' => false,
					'scrydex_fallback_status'     => 'completed',
					'scrydex_persistence_status'  => $persistence['status'],
					'scrydex_persistence_errors'  => $persistence['errors'],
					'scrydex_normalizer_errors'   => $normalizer_errors,
					'scrydex_credentials_scope'   => 'wordpress_server_settings',
				),
			),
			'meta'        => array_merge(
				$this->ready_meta( $query, count( $provider_cards ), count( $provider_cards ) ),
				array(
					'row_count'                     => count( $provider_cards ),
					'total'                         => count( $provider_cards ),
					'live_provider_request'         => true,
					'wordpress_catalog_cache_hit'   => false,
					'scrydex_persistence_status'    => $persistence['status'],
					'scrydex_credentials_in_response' => false,
				)
			),
		);
	}

	/**
	 * @param array{query:string,game:string,page:int,page_size:int,errors:list<string>} $request Parsed request.
	 * @param array<string, mixed>                                                      $query Query plan.
	 * @return array<string, mixed>
	 */
	private function provider_fallback_unavailable_response(
		array $request,
		array $query,
		string $error_code,
		string $message = '',
		?ScryDexResult $result = null
	): array {
		return array(
			'status'      => 'ready',
			'status_code' => 200,
			'code'        => 'reference_search_read_ready',
			'callback'    => 'search_reference_cards',
			'data'        => array(
				'cards'        => array(),
				'query'        => (string) $request['query'],
				'game'         => (string) $request['game'],
				'source'       => 'wordpress_catalog_cache',
				'lookup_order' => array( 'wordpress_catalog_cache', 'scrydex_provider' ),
				'meta'         => array(
					'total'                       => 0,
					'page'                        => (int) $request['page'],
					'page_size'                   => (int) $request['page_size'],
					'public_catalog_safe'         => true,
					'credentials_in_response'     => false,
					'live_provider_request'       => true,
					'wordpress_catalog_cache_hit' => false,
					'scrydex_fallback_status'     => 'blocked',
					'scrydex_provider_status'     => null === $result ? 'failed' : $result->status(),
					'scrydex_provider_http_status' => null === $result ? 0 : $result->http_status(),
					'scrydex_provider_error_code' => $error_code,
					'scrydex_provider_message'    => $this->safe_provider_message( $message ),
					'scrydex_credentials_scope'   => 'wordpress_server_settings',
				),
			),
			'meta'        => array_merge(
				$this->ready_meta( $query, 0, 0 ),
				array(
					'live_provider_request'          => true,
					'wordpress_catalog_cache_hit'    => false,
					'scrydex_fallback_status'        => 'blocked',
					'scrydex_provider_error_code'    => $error_code,
					'scrydex_credentials_in_response' => false,
				)
			),
		);
	}

	/**
	 * @return array{status:string,errors:list<string>}
	 */
	private function persist_provider_fallback( ScryDexSyncPagePlan $page_plan ): array {
		if ( null === $this->scrydex_repository ) {
			return array(
				'status' => 'deferred',
				'errors' => array( 'scrydex_persistence_repository_not_configured' ),
			);
		}

		$persistence_plan = $this->persistence_planner()->plan_page(
			$page_plan,
			array(),
			gmdate( 'Y-m-d H:i:s' )
		);
		$query_plan       = $this->query_builder()->build( $persistence_plan, $this->table_prefix, false );
		$result           = $this->scrydex_repository->execute( $query_plan );

		if ( method_exists( $result, 'status' ) ) {
			$status = (string) $result->status();
		} else {
			$status = 'unknown';
		}

		return array(
			'status' => $status,
			'errors' => method_exists( $result, 'errors' ) ? $this->string_list( $result->errors() ) : array(),
		);
	}

	/**
	 * @param list<array<string, mixed>>               $rows Normalized provider rows.
	 * @param array<string, array<string, mixed>>      $prices_by_card Provider prices by card ID.
	 * @param array<string, list<array<string, mixed>>> $variants_by_card Provider variants by card ID.
	 * @return list<array<string, mixed>>
	 */
	private function present_provider_rows( array $rows, array $prices_by_card, array $variants_by_card ): array {
		$presented = array();

		foreach ( $rows as $row ) {
			$provider_card_id = $this->text( $row['provider_card_id'] ?? '' );
			$price            = $prices_by_card[ $provider_card_id ] ?? array();
			$market_price     = $this->decimal_string( $price['market_price'] ?? null );
			$currency         = $this->currency( $price['currency'] ?? null );
			$front_image_url  = $this->url( $row['front_image_url'] ?? '' );

			$presented[] = array(
				'provider_card_id'          => $provider_card_id,
				'public_id'                 => '',
				'provider_name'             => $this->text( $row['provider_name'] ?? 'scrydex' ),
				'game'                      => $this->slug( $row['game'] ?? '' ),
				'card_name'                 => $this->text( $row['name'] ?? '' ),
				'name'                      => $this->text( $row['name'] ?? '' ),
				'set_name'                  => $this->text( $row['set_name'] ?? '' ),
				'set_code'                  => strtoupper( $this->text( $row['set_code'] ?? '' ) ),
				'card_number'               => $this->text( $row['card_number'] ?? '' ),
				'printed_number'            => $this->text( $row['printed_number'] ?? '' ),
				'suggested_barcode'         => $provider_card_id,
				'image_url'                 => $front_image_url,
				'front_image_url'           => $front_image_url,
				'back_image_url'            => $this->url( $row['back_image_url'] ?? '' ),
				'market_price_minor_units'  => $this->minor_units( $market_price ),
				'market_price'              => array(
					'amount'   => $market_price,
					'currency' => $currency,
				),
				'currency'                  => $currency,
				'price_observed_at_utc'     => $this->utc_timestamp( $price['source_observed_at'] ?? null ),
				'catalog_synced_at_utc'     => gmdate( 'c' ),
				'provider_updated_at_utc'   => $this->utc_timestamp( $row['provider_updated_at'] ?? null ),
				'catalog_source'            => 'scrydex_provider',
				'stock_available_count'     => 0,
				'stock_total_count'         => 0,
				'stock_by_condition'        => array(),
				'variants'                  => $variants_by_card[ $provider_card_id ] ?? array(),
				'live_provider_request'     => true,
				'credentials_in_response'   => false,
			);
		}

		return $presented;
	}

	/**
	 * @return array<string, array<string, mixed>>
	 */
	private function provider_prices_by_card( ScryDexSyncPagePlan $page_plan ): array {
		$indexed = array();

		foreach ( $page_plan->price_rows() as $row ) {
			$key = $this->text( $row['provider_card_id'] ?? '' );
			if ( '' !== $key ) {
				$indexed[ $key ] = $row;
			}
		}

		return $indexed;
	}

	/**
	 * @return array<string, list<array<string, mixed>>>
	 */
	private function provider_variants_by_card( ScryDexSyncPagePlan $page_plan ): array {
		$indexed = array();

		foreach ( $page_plan->variant_rows() as $row ) {
			$key = $this->text( $row['provider_card_id'] ?? '' );
			if ( '' === $key ) {
				continue;
			}

			$indexed[ $key ][] = $this->present_provider_variant_row( $row );
		}

		return $indexed;
	}

	/**
	 * @param array<string, mixed> $row Normalized provider variant row.
	 * @return array<string, mixed>
	 */
	private function present_provider_variant_row( array $row ): array {
		return array(
			'provider_variant_id'   => $this->text( $row['provider_variant_id'] ?? '' ),
			'variant'               => $this->text( $row['variant'] ?? '' ),
			'finish'                => $this->text( $row['finish'] ?? '' ),
			'parallel_name'         => $this->text( $row['parallel_name'] ?? '' ),
			'edition'               => $this->text( $row['edition'] ?? '' ),
			'language'              => $this->text( $row['language'] ?? '' ),
			'raw_or_graded_support' => $this->text( $row['raw_or_graded_support'] ?? 'both' ),
			'attributes'            => $this->json_object( $row['normalized_attributes_json'] ?? null ),
		);
	}

	private function page_processor(): ScryDexSyncPageProcessor {
		if ( null === $this->scrydex_page_processor ) {
			$this->scrydex_page_processor = new ScryDexSyncPageProcessor();
		}

		return $this->scrydex_page_processor;
	}

	private function persistence_planner(): ScryDexPersistencePlanner {
		if ( null === $this->scrydex_persistence_planner ) {
			$this->scrydex_persistence_planner = new ScryDexPersistencePlanner();
		}

		return $this->scrydex_persistence_planner;
	}

	private function query_builder(): ScryDexPersistenceQueryBuilder {
		if ( null === $this->scrydex_query_builder ) {
			$this->scrydex_query_builder = new ScryDexPersistenceQueryBuilder();
		}

		return $this->scrydex_query_builder;
	}

	/**
	 * @param array<string, mixed> $row Reference card row.
	 * @return array<string, mixed>
	 */
	private function present_row( array $row, array $variants = array() ): array {
		$provider_card_id = $this->text( $row['provider_card_id'] ?? '' );
		$front_image_url  = $this->url( $row['front_image_url'] ?? '' );
		$market_price     = $this->decimal_string( $row['market_price'] ?? null );
		$currency         = $this->currency( $row['market_price_currency'] ?? null );

		return array(
			'provider_card_id'          => $provider_card_id,
			'public_id'                 => $this->text( $row['public_id'] ?? '' ),
			'provider_name'             => $this->text( $row['provider_name'] ?? 'scrydex' ),
			'game'                      => $this->slug( $row['game'] ?? '' ),
			'card_name'                 => $this->text( $row['name'] ?? '' ),
			'name'                      => $this->text( $row['name'] ?? '' ),
			'set_name'                  => $this->text( $row['set_name'] ?? '' ),
			'set_code'                  => strtoupper( $this->text( $row['set_code'] ?? '' ) ),
			'card_number'               => $this->text( $row['card_number'] ?? '' ),
			'printed_number'            => $this->text( $row['printed_number'] ?? '' ),
			'suggested_barcode'         => $provider_card_id,
			'image_url'                 => $front_image_url,
			'front_image_url'           => $front_image_url,
			'back_image_url'            => $this->url( $row['back_image_url'] ?? '' ),
			'market_price_minor_units'  => $this->minor_units( $market_price ),
			'market_price'              => array(
				'amount'   => $market_price,
				'currency' => $currency,
			),
			'currency'                  => $currency,
			'price_observed_at_utc'     => $this->utc_timestamp( $row['price_observed_at'] ?? null ),
			'catalog_synced_at_utc'     => $this->utc_timestamp( $row['updated_at'] ?? null ),
			'provider_updated_at_utc'   => $this->utc_timestamp( $row['provider_updated_at'] ?? null ),
			'catalog_source'            => 'wordpress_catalog_cache',
			'stock_available_count'     => 0,
			'stock_total_count'         => 0,
			'stock_by_condition'        => array(),
			'variants'                  => array_values( $variants ),
			'live_provider_request'     => false,
			'credentials_in_response'   => false,
		);
	}

	/**
	 * @param array<string, mixed> $row Reference variant row.
	 * @return array<string, mixed>
	 */
	private function present_variant_row( array $row ): array {
		$attributes = $this->json_object( $row['normalized_attributes_json'] ?? null );

		return array(
			'provider_variant_id'   => $this->text( $row['provider_variant_id'] ?? '' ),
			'variant'               => $this->text( $row['variant'] ?? '' ),
			'finish'                => $this->text( $row['finish'] ?? '' ),
			'parallel_name'         => $this->text( $row['parallel_name'] ?? '' ),
			'edition'               => $this->text( $row['edition'] ?? '' ),
			'language'              => $this->text( $row['language'] ?? '' ),
			'raw_or_graded_support' => $this->text( $row['raw_or_graded_support'] ?? 'both' ),
			'attributes'            => $attributes,
		);
	}

	/**
	 * @param array<string, mixed> $query Query plan.
	 * @return array<string, mixed>
	 */
	private function ready_meta( array $query, int $row_count, int $total ): array {
		return array(
			'route_connected_reads_enabled'   => true,
			'route_connected_reads_deferred'  => false,
			'route_connected_writes_deferred' => true,
			'reference_repository_deferred'   => false,
			'default_route_registration_deferred' => true,
			'route_still_gated'               => true,
			'cards_table'                     => (string) ( $query['cards_table'] ?? '' ),
			'variants_table'                  => (string) ( $query['variants_table'] ?? '' ),
			'prices_table'                    => (string) ( $query['prices_table'] ?? '' ),
			'row_count'                       => $row_count,
			'total'                           => $total,
		);
	}

	/**
	 * @param list<string> $errors Validation or repository errors.
	 * @return array<string, mixed>
	 */
	private function rejected( string $code, array $errors ): array {
		return array(
			'status'      => 'invalid',
			'status_code' => 400,
			'code'        => $code,
			'callback'    => 'search_reference_cards',
			'errors'      => array_values( array_unique( $errors ) ),
			'meta'        => array(
				'route_connected_reads_enabled'   => true,
				'route_connected_reads_deferred'  => true,
				'route_connected_writes_deferred' => true,
				'reference_repository_deferred'   => true,
				'credentials_in_response'         => false,
			),
		);
	}

	/**
	 * @param mixed $values Candidate list.
	 * @return list<string>
	 */
	private function string_list( mixed $values ): array {
		if ( ! is_array( $values ) ) {
			return array();
		}

		return array_values(
			array_unique(
				array_filter(
					array_map(
						static fn ( mixed $value ): string => trim( (string) $value ),
						$values
					),
					static fn ( string $value ): bool => '' !== $value
				)
			)
		);
	}

	private function safe_provider_message( string $message ): string {
		$message = trim( $message );

		if ( '' === $message ) {
			return '';
		}

		return substr( preg_replace( '/[A-Za-z0-9+\/=_-]{24,}/', '[redacted]', $message ) ?? $message, 0, 180 );
	}

	private function positive_int( mixed $value, int $fallback ): int {
		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		return $fallback;
	}

	private function is_positive_intish( mixed $value ): bool {
		return ( is_int( $value ) && $value > 0 )
			|| ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 );
	}

	private function non_negative_int( mixed $value ): ?int {
		if ( is_int( $value ) && $value >= 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			return (int) $value;
		}

		return null;
	}

	private function positive_reference_id( mixed $value ): ?int {
		if ( is_int( $value ) && $value > 0 ) {
			return $value;
		}

		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) && (int) $value > 0 ) {
			return (int) $value;
		}

		return null;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function json_object( mixed $value ): array {
		$decoded = json_decode( (string) $value, true );

		return is_array( $decoded ) ? $decoded : array();
	}

	private function minor_units( string $amount ): int {
		$value = (float) $amount;

		return $value > 0 ? (int) round( $value * 100 ) : 0;
	}

	private function decimal_string( mixed $value ): string {
		if ( is_numeric( $value ) ) {
			return number_format( (float) $value, 4, '.', '' );
		}

		return '0.0000';
	}

	private function currency( mixed $value ): string {
		$currency = strtoupper( trim( (string) $value ) );

		return 1 === preg_match( '/^[A-Z]{3}$/', $currency ) ? $currency : 'USD';
	}

	private function text( mixed $value ): string {
		return trim( (string) $value );
	}

	private function slug( mixed $value ): string {
		$value = strtolower( $this->text( $value ) );

		return 1 === preg_match( '/^[a-z0-9_-]{2,64}$/', $value ) ? $value : 'unknown';
	}

	private function url( mixed $value ): string {
		$value = trim( (string) $value );

		return str_starts_with( $value, 'https://' ) || str_starts_with( $value, 'http://' ) ? $value : '';
	}

	private function utc_timestamp( mixed $value ): ?string {
		$text = trim( (string) $value );

		if ( '' === $text ) {
			return null;
		}

		$timestamp = strtotime( $text );

		return false === $timestamp ? null : gmdate( 'Y-m-d\TH:i:s.000\Z', $timestamp );
	}

	private function array_a_output_type(): string {
		return defined( 'ARRAY_A' ) ? (string) ARRAY_A : 'ARRAY_A';
	}
}
