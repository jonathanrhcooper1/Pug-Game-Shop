<?php
/**
 * Result of a pricing policy evaluation.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Pricing;

final class PriceEvaluation {
	public function __construct(
		public readonly int $suggested_price_minor_units,
		public readonly int $sale_price_minor_units,
		public readonly bool $floor_hit,
		public readonly bool $should_change,
		public readonly string $reason
	) {
	}
}
