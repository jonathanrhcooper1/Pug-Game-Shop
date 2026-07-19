<?php
/**
 * ScryDex normalized-row persistence planner.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexPersistencePlanner {
	private const CARD_FIELDS = array(
		'provider_name',
		'provider_card_id',
		'reference_set_id',
		'provider_set_id',
		'game',
		'name',
		'normalized_name',
		'set_name',
		'set_code',
		'card_number',
		'printed_number',
		'year',
		'rarity',
		'rarity_code',
		'language',
		'language_code',
		'release_date',
		'front_image_url',
		'back_image_url',
		'provider_updated_at',
		'search_text',
	);

	/**
	 * @param list<array<string, mixed>> $existing_reference_rows Current rows keyed later by provider card.
	 */
	public function plan_page(
		ScryDexSyncPagePlan $page_plan,
		array $existing_reference_rows = array(),
		?string $now = null
	): ScryDexPersistencePlan {
		if ( ScryDexSyncPagePlan::FAILED === $page_plan->status() ) {
			return ScryDexPersistencePlan::failed(
				$page_plan->error_code() ?? 'scrydex_page_failed',
				$page_plan->retryable(),
				$page_plan->errors()
			);
		}

		$now                = $this->safe_timestamp( $now );
		$existing_by_key    = $this->index_existing_reference_rows( $existing_reference_rows );
		$planned_by_key     = array();
		$planned_keys       = array();
		$reference_inserts  = array();
		$reference_updates  = array();
		$unchanged_keys     = array();
		$variant_upserts    = array();
		$price_observations = array();
		$price_points       = array();
		$errors             = $page_plan->errors();

		foreach ( $page_plan->reference_rows() as $index => $row ) {
			$key = $this->provider_key_from_row( $row );

			if ( '' === $key ) {
				$errors[] = array(
					'index'  => $index,
					'errors' => array( 'missing_provider_key' ),
				);
				continue;
			}

			$planned_keys[ $key ]   = true;
			$planned_by_key[ $key ] = $row;
			$existing               = $existing_by_key[ $key ] ?? null;

			if ( null === $existing ) {
				$reference_inserts[] = $this->insert_payload( $row, $key, $now );
				continue;
			}

			$update = $this->update_payload( $row, $existing, $now );

			if ( array() === $update ) {
				$unchanged_keys[] = $key;
				continue;
			}

			$reference_updates[] = $update;
		}

		foreach ( $page_plan->variant_rows() as $index => $variant_row ) {
			$key = $this->provider_key_from_row( $variant_row );

			if ( '' === $key ) {
				$errors[] = array(
					'index'  => $index,
					'errors' => array( 'missing_variant_provider_key' ),
				);
				continue;
			}

			$existing = $existing_by_key[ $key ] ?? null;

			if ( null === $existing && ! isset( $planned_keys[ $key ] ) ) {
				$errors[] = array(
					'provider_key' => $key,
					'errors'       => array( 'missing_reference_for_variant' ),
				);
				continue;
			}

			$variant_upserts[] = $this->variant_upsert_payload(
				$variant_row,
				$key,
				$existing,
				$now
			);
		}

		foreach ( $page_plan->price_rows() as $index => $price_row ) {
			$key = $this->provider_key_from_row( $price_row );

			if ( '' === $key ) {
				$errors[] = array(
					'index'  => $index,
					'errors' => array( 'missing_price_provider_key' ),
				);
				continue;
			}

			$existing = $existing_by_key[ $key ] ?? null;

			if ( null === $existing && ! isset( $planned_keys[ $key ] ) ) {
				$errors[] = array(
					'provider_key' => $key,
					'errors'       => array( 'missing_reference_for_price' ),
				);
				continue;
			}

			$price_observations[] = $this->price_observation_payload(
				$price_row,
				$key,
				$planned_by_key[ $key ] ?? null,
				$existing,
				$page_plan->next_checkpoint(),
				$now
			);
		}

		foreach ( $page_plan->price_point_rows() as $index => $price_point_row ) {
			$key = $this->provider_key_from_row( $price_point_row );

			if ( '' === $key ) {
				$errors[] = array(
					'index'  => $index,
					'errors' => array( 'missing_price_point_provider_key' ),
				);
				continue;
			}

			$existing = $existing_by_key[ $key ] ?? null;

			if ( null === $existing && ! isset( $planned_keys[ $key ] ) ) {
				$errors[] = array(
					'provider_key' => $key,
					'errors'       => array( 'missing_reference_for_price_point' ),
				);
				continue;
			}

			$price_points[] = $this->price_point_payload(
				$price_point_row,
				$key,
				$planned_by_key[ $key ] ?? null,
				$existing,
				$page_plan->next_checkpoint(),
				$now
			);
		}

		return ScryDexPersistencePlan::ready(
			$reference_inserts,
			$reference_updates,
			$unchanged_keys,
			$variant_upserts,
			$price_observations,
			$price_points,
			$errors,
			$page_plan->next_checkpoint()
		);
	}

	/**
	 * @param array<string, mixed> $variant_row Normalized reference variant row.
	 * @param array<string, mixed>|null $existing Existing reference-card row.
	 * @return array<string, mixed>
	 */
	private function variant_upsert_payload(
		array $variant_row,
		string $key,
		?array $existing,
		string $now
	): array {
		return array(
			'provider_key'               => $key,
			'provider_name'              => (string) $variant_row['provider_name'],
			'provider_card_id'           => (string) $variant_row['provider_card_id'],
			'reference_card_id'          => null === $existing ? null : $this->positive_int( $existing['reference_card_id'] ?? null ),
			'provider_variant_id'        => $this->nullable_string( $variant_row['provider_variant_id'] ?? null ),
			'variant'                    => $this->nullable_string( $variant_row['variant'] ?? null ),
			'finish'                     => $this->nullable_string( $variant_row['finish'] ?? null ),
			'parallel_name'              => $this->nullable_string( $variant_row['parallel_name'] ?? null ),
			'edition'                    => $this->nullable_string( $variant_row['edition'] ?? null ),
			'language'                   => $this->nullable_string( $variant_row['language'] ?? null ),
			'front_image_url'            => $this->nullable_string( $variant_row['front_image_url'] ?? null ),
			'back_image_url'             => $this->nullable_string( $variant_row['back_image_url'] ?? null ),
			'raw_or_graded_support'      => $this->raw_or_graded_support( $variant_row['raw_or_graded_support'] ?? null ),
			'normalized_attributes_json' => $this->nullable_string( $variant_row['normalized_attributes_json'] ?? null ),
			'created_at'                 => $now,
			'updated_at'                 => $now,
		);
	}

	/**
	 * @param list<array<string, mixed>> $rows Current reference-card rows.
	 * @return array<string, array<string, mixed>>
	 */
	private function index_existing_reference_rows( array $rows ): array {
		$indexed = array();

		foreach ( $rows as $row ) {
			$key = $this->provider_key_from_row( $row );

			if ( '' !== $key ) {
				$indexed[ $key ] = $row;
			}
		}

		return $indexed;
	}

	/**
	 * @param array<string, mixed> $row Reference or price row.
	 */
	private function provider_key_from_row( array $row ): string {
		$provider_name    = trim( (string) ( $row['provider_name'] ?? '' ) );
		$provider_card_id = trim( (string) ( $row['provider_card_id'] ?? '' ) );

		if ( '' === $provider_name || '' === $provider_card_id ) {
			return '';
		}

		return $provider_name . ':' . $provider_card_id;
	}

	/**
	 * @param array<string, mixed> $row Normalized reference-card row.
	 * @return array<string, mixed>
	 */
	private function insert_payload( array $row, string $key, string $now ): array {
		return array_merge(
			$this->card_fields( $row ),
			array(
				'public_id'   => $this->stable_uuid( 'scrydex-reference-card:' . $key ),
				'created_at'  => $now,
				'updated_at'  => $now,
				'row_version' => 1,
			)
		);
	}

	/**
	 * @param array<string, mixed> $row Normalized reference-card row.
	 * @param array<string, mixed> $existing Existing database row.
	 * @return array<string, mixed>
	 */
	private function update_payload( array $row, array $existing, string $now ): array {
		$changes = array();

		foreach ( $this->card_fields( $row ) as $field => $value ) {
			if ( ! $this->values_match( $value, $existing[ $field ] ?? null ) ) {
				$changes[ $field ] = $value;
			}
		}

		if ( array() === $changes ) {
			return array();
		}

		return array_merge(
			array(
				'reference_card_id' => $this->positive_int( $existing['reference_card_id'] ?? null ),
				'provider_name'     => (string) $row['provider_name'],
				'provider_card_id'  => (string) $row['provider_card_id'],
			),
			$changes,
			array(
				'updated_at'  => $now,
				'row_version' => $this->next_row_version( $existing['row_version'] ?? null ),
			)
		);
	}

	/**
	 * @param array<string, mixed> $row Normalized reference-card row.
	 * @return array<string, mixed>
	 */
	private function card_fields( array $row ): array {
		$fields = array();

		foreach ( self::CARD_FIELDS as $field ) {
			$fields[ $field ] = $row[ $field ] ?? null;
		}

		return $fields;
	}

	/**
	 * @param array<string, mixed> $price_row Normalized provider price row.
	 * @param array<string, mixed>|null $planned_reference Planned reference-card row.
	 * @param array<string, mixed>|null $existing Existing reference-card row.
	 * @return array<string, mixed>
	 */
	private function price_observation_payload(
		array $price_row,
		string $key,
		?array $planned_reference,
		?array $existing,
		?ScryDexSyncCheckpoint $checkpoint,
		string $now
	): array {
		$market_price        = $price_row['market_price'] ?? null;
		$currency            = $price_row['currency'] ?? null;
		$source_observed_at  = $price_row['source_observed_at'] ?? null;
		$provider_updated_at = $price_row['provider_updated_at'] ?? null;
		$sync_job_id         = null === $checkpoint ? null : $this->positive_int( $checkpoint->job_id() );

		return array(
			'public_id'           => $this->stable_uuid(
				'scrydex-price-observation:'
					. implode(
						':',
						array(
							$key,
							(string) $market_price,
							(string) $currency,
							(string) $source_observed_at,
							(string) $sync_job_id,
						)
					)
			),
			'provider_key'        => $key,
			'provider_name'       => (string) $price_row['provider_name'],
			'provider_card_id'    => (string) $price_row['provider_card_id'],
			'reference_card_id'   => null === $existing ? null : $this->positive_int( $existing['reference_card_id'] ?? null ),
			'game'                => $this->reference_game( $planned_reference, $existing ),
			'market_price'        => $market_price,
			'currency'            => $currency,
			'source_observed_at'  => $source_observed_at,
			'provider_updated_at' => $provider_updated_at,
			'observed_at'         => $now,
			'sync_job_id'         => $sync_job_id,
			'planned_at'          => $now,
		);
	}

	/**
	 * @param array<string, mixed> $price_row Normalized provider price-point row.
	 * @param array<string, mixed>|null $planned_reference Planned reference-card row.
	 * @param array<string, mixed>|null $existing Existing reference-card row.
	 * @return array<string, mixed>
	 */
	private function price_point_payload(
		array $price_row,
		string $key,
		?array $planned_reference,
		?array $existing,
		?ScryDexSyncCheckpoint $checkpoint,
		string $now
	): array {
		$sync_job_id         = null === $checkpoint ? null : $this->positive_int( $checkpoint->job_id() );
		$provider_variant_id = $this->nullable_string( $price_row['provider_variant_id'] ?? null );
		$condition_code      = $this->nullable_string( $price_row['condition_code'] ?? null );
		$raw_or_graded       = $this->raw_or_graded( $price_row['raw_or_graded'] ?? null );
		$grading_company     = $this->nullable_string( $price_row['grading_company'] ?? null );
		$grade               = $this->nullable_string( $price_row['grade'] ?? null );
		$currency            = (string) ( $price_row['currency'] ?? 'USD' );

		return array(
			'public_id'              => $this->stable_uuid(
				'scrydex-price-point:'
					. implode(
						':',
						array(
							$key,
							(string) $provider_variant_id,
							(string) $condition_code,
							$raw_or_graded,
							(string) $grading_company,
							(string) $grade,
							$currency,
							(string) ( $price_row['source_observed_at'] ?? '' ),
							(string) $sync_job_id,
						)
					)
			),
			'provider_key'           => $key,
			'reference_card_id'      => null === $existing ? null : $this->positive_int( $existing['reference_card_id'] ?? null ),
			'reference_variant_id'   => null,
			'provider_name'          => (string) $price_row['provider_name'],
			'provider_card_id'       => (string) $price_row['provider_card_id'],
			'provider_variant_id'    => $provider_variant_id,
			'game'                   => $this->reference_game( $planned_reference, $existing ),
			'condition_code'         => $condition_code,
			'raw_or_graded'          => $raw_or_graded,
			'grading_company'        => $grading_company,
			'grade'                  => $grade,
			'market_price'           => $price_row['market_price'] ?? null,
			'low_price'              => $price_row['low_price'] ?? null,
			'mid_price'              => $price_row['mid_price'] ?? null,
			'high_price'             => $price_row['high_price'] ?? null,
			'currency'               => $currency,
			'source_observed_at'     => $price_row['source_observed_at'] ?? null,
			'provider_updated_at'    => $price_row['provider_updated_at'] ?? null,
			'observed_at'            => $now,
			'sync_job_id'            => $sync_job_id,
			'raw_price_payload_json' => $price_row['raw_price_payload_json'] ?? null,
			'created_at'             => $now,
		);
	}

	private function values_match( mixed $left, mixed $right ): bool {
		return $this->normalize_comparable( $left ) === $this->normalize_comparable( $right );
	}

	private function normalize_comparable( mixed $value ): ?string {
		if ( null === $value ) {
			return null;
		}

		return (string) $value;
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

	private function nullable_string( mixed $value ): ?string {
		$value = trim( (string) ( $value ?? '' ) );

		return '' === $value ? null : $value;
	}

	private function raw_or_graded_support( mixed $value ): string {
		$value = strtolower( trim( (string) ( $value ?? '' ) ) );

		return in_array( $value, array( 'raw', 'graded', 'both' ), true ) ? $value : 'both';
	}

	private function raw_or_graded( mixed $value ): string {
		$value = strtolower( trim( (string) ( $value ?? '' ) ) );

		return in_array( $value, array( 'raw', 'graded' ), true ) ? $value : 'raw';
	}

	private function next_row_version( mixed $value ): int {
		$current = $this->positive_int( $value );

		return null === $current ? 1 : $current + 1;
	}

	/**
	 * @param array<string, mixed>|null $planned_reference Planned reference-card row.
	 * @param array<string, mixed>|null $existing Existing reference-card row.
	 */
	private function reference_game( ?array $planned_reference, ?array $existing ): ?string {
		$value = trim( (string) ( $planned_reference['game'] ?? $existing['game'] ?? '' ) );

		return '' === $value ? null : $value;
	}

	private function safe_timestamp( ?string $now ): string {
		$now = trim( (string) $now );

		return '' === $now ? gmdate( 'Y-m-d H:i:s' ) : $now;
	}

	private function stable_uuid( string $seed ): string {
		$hash = hash( 'sha256', $seed );

		return sprintf(
			'%s-%s-%s-%s-%s',
			substr( $hash, 0, 8 ),
			substr( $hash, 8, 4 ),
			substr( $hash, 12, 4 ),
			substr( $hash, 16, 4 ),
			substr( $hash, 20, 12 )
		);
	}
}
