<?php
/**
 * Provider price reference-card backfill migration.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Migrations;

final class Version0015ProviderPriceReferenceBackfill implements Migration {
	public function version(): int {
		return 15;
	}

	public function name(): string {
		return 'provider_price_reference_backfill';
	}

	public function up( \wpdb $database ): void {
		$cards_table        = $database->prefix . 'tcg_reference_cards';
		$observations_table = $database->prefix . 'tcg_provider_price_observations';
		$points_table       = $database->prefix . 'tcg_provider_price_points';

		if ( $this->table_exists( $database, $cards_table ) && $this->table_exists( $database, $observations_table ) ) {
			$database->query(
				"UPDATE `{$observations_table}` observations
				INNER JOIN `{$cards_table}` cards
					ON cards.provider_name = observations.provider_name
					AND cards.provider_card_id = observations.provider_card_id
				SET observations.reference_card_id = cards.reference_card_id,
					observations.game = COALESCE(NULLIF(observations.game, ''), cards.game)
				WHERE observations.reference_card_id IS NULL" // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			);
		}

		if ( $this->table_exists( $database, $cards_table ) && $this->table_exists( $database, $points_table ) ) {
			$database->query(
				"UPDATE `{$points_table}` price_points
				INNER JOIN `{$cards_table}` cards
					ON cards.provider_name = price_points.provider_name
					AND cards.provider_card_id = price_points.provider_card_id
				SET price_points.reference_card_id = cards.reference_card_id,
					price_points.game = COALESCE(NULLIF(price_points.game, ''), cards.game)
				WHERE price_points.reference_card_id IS NULL" // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			);
		}
	}

	public function down( \wpdb $database ): void {
		unset( $database );
	}

	public function checksum(): string {
		return hash( 'sha256', 'provider_price_reference_backfill.v1' );
	}

	private function table_exists( \wpdb $database, string $table_name ): bool {
		$found = $database->get_var(
			$database->prepare( 'SHOW TABLES LIKE %s', $database->esc_like( $table_name ) )
		);

		return $found === $table_name;
	}
}
