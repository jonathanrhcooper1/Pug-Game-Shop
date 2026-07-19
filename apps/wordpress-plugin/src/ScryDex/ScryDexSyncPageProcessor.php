<?php
/**
 * ScryDex sync page processor.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexSyncPageProcessor {
	public function __construct(
		private ?ScryDexCardNormalizer $normalizer = null,
		private ?ScryDexSyncPlanner $planner = null
	) {
		$this->normalizer = $this->normalizer ?? new ScryDexCardNormalizer();
		$this->planner    = $this->planner ?? new ScryDexSyncPlanner();
	}

	public function process_cards_page(
		ScryDexSyncCheckpoint $checkpoint,
		ScryDexResult $result
	): ScryDexSyncPagePlan {
		if ( ! $result->is_success() ) {
			return ScryDexSyncPagePlan::failed(
				$result->error_code() ?? 'scrydex_failed',
				$this->is_retryable( $result )
			);
		}

		$body             = $result->body();
		$reference_rows   = array();
		$price_rows       = array();
		$variant_rows     = array();
		$price_point_rows = array();
		$errors           = array();

		foreach ( $this->cards_from_body( $body ) as $index => $card ) {
			$normalized = $this->normalizer->normalize_card( $card );

			if ( ! $normalized->is_valid() ) {
				$errors[] = array(
					'index'  => $index,
					'errors' => $normalized->errors(),
				);
				continue;
			}

			$reference_rows[] = $normalized->card();
			$variant_rows     = array_merge( $variant_rows, $normalized->variants() );
			$price_point_rows = array_merge( $price_point_rows, $normalized->price_points() );

			if ( null !== $normalized->price() ) {
				$price_rows[] = $normalized->price();
			}
		}

		return ScryDexSyncPagePlan::planned(
			$reference_rows,
			$price_rows,
			$errors,
			$this->planner->checkpoint_after_response(
				$checkpoint,
				$body,
				count( $reference_rows )
			),
			$variant_rows,
			$price_point_rows
		);
	}

	/**
	 * @param array<string, mixed> $body Provider response body.
	 * @return list<array<string, mixed>>
	 */
	private function cards_from_body( array $body ): array {
		$cards = $body['data'] ?? $body['cards'] ?? array();

		if ( ! is_array( $cards ) ) {
			return array();
		}

		return array_values(
			array_filter(
				$cards,
				static fn ( mixed $card ): bool => is_array( $card )
			)
		);
	}

	private function is_retryable( ScryDexResult $result ): bool {
		if ( ScryDexResult::RATE_LIMITED === $result->status() ) {
			return true;
		}

		return ScryDexResult::FAILED === $result->status()
			&& ( 0 === $result->http_status() || $result->http_status() >= 500 );
	}
}
