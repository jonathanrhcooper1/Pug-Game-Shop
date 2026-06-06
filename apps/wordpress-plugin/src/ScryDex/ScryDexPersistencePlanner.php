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
		'game',
		'name',
		'normalized_name',
		'set_name',
		'set_code',
		'card_number',
		'printed_number',
		'rarity',
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

		$now                 = $this->safe_timestamp( $now );
		$existing_by_key     = $this->index_existing_reference_rows( $existing_reference_rows );
		$planned_keys        = array();
		$reference_inserts   = array();
		$reference_updates   = array();
		$unchanged_keys      = array();
		$price_observations  = array();
		$errors              = $page_plan->errors();

		foreach ( $page_plan->reference_rows() as $index => $row ) {
			$key = $this->provider_key_from_row( $row );

			if ( '' === $key ) {
				$errors[] = array(
					'index'  => $index,
					'errors' => array( 'missing_provider_key' ),
				);
				continue;
			}

			$planned_keys[ $key ] = true;
			$existing             = $existing_by_key[ $key ] ?? null;

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

			$price_observations[] = $this->price_observation_payload( $price_row, $key, $existing, $now );
		}

		return ScryDexPersistencePlan::ready(
			$reference_inserts,
			$reference_updates,
			$unchanged_keys,
			$price_observations,
			$errors,
			$page_plan->next_checkpoint()
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
				'public_id'   => $this->public_id_for_key( $key ),
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
	 * @param array<string, mixed>|null $existing Existing reference-card row.
	 * @return array<string, mixed>
	 */
	private function price_observation_payload(
		array $price_row,
		string $key,
		?array $existing,
		string $now
	): array {
		return array(
			'provider_key'        => $key,
			'provider_name'       => (string) $price_row['provider_name'],
			'provider_card_id'    => (string) $price_row['provider_card_id'],
			'reference_card_id'   => null === $existing ? null : $this->positive_int( $existing['reference_card_id'] ?? null ),
			'market_price'        => $price_row['market_price'] ?? null,
			'currency'            => $price_row['currency'] ?? null,
			'source_observed_at'  => $price_row['source_observed_at'] ?? null,
			'provider_updated_at' => $price_row['provider_updated_at'] ?? null,
			'planned_at'          => $now,
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

	private function next_row_version( mixed $value ): int {
		$current = $this->positive_int( $value );

		return null === $current ? 1 : $current + 1;
	}

	private function safe_timestamp( ?string $now ): string {
		$now = trim( (string) $now );

		return '' === $now ? gmdate( 'Y-m-d H:i:s' ) : $now;
	}

	private function public_id_for_key( string $key ): string {
		$hash = hash( 'sha256', 'scrydex-reference-card:' . $key );

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
