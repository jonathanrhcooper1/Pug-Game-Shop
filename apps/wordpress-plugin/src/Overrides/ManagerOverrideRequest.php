<?php
/**
 * Manager override authorization request.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Overrides;

final class ManagerOverrideRequest {
	public function __construct(
		private int $employee_user_id,
		private int $manager_user_id,
		private int $original_price_minor_units,
		private int $override_price_minor_units,
		private int $minimum_sale_price_minor_units,
		private string $currency,
		private string $reason,
		private bool $manager_reauthenticated = false,
		private string $manager_reauthenticated_at = ''
	) {
		$this->currency                   = strtoupper( trim( $currency ) );
		$this->reason                     = trim( $reason );
		$this->manager_reauthenticated_at = trim( $manager_reauthenticated_at );
	}

	public function employee_user_id(): int {
		return $this->employee_user_id;
	}

	public function manager_user_id(): int {
		return $this->manager_user_id;
	}

	public function original_price_minor_units(): int {
		return $this->original_price_minor_units;
	}

	public function override_price_minor_units(): int {
		return $this->override_price_minor_units;
	}

	public function minimum_sale_price_minor_units(): int {
		return $this->minimum_sale_price_minor_units;
	}

	public function currency(): string {
		return $this->currency;
	}

	public function reason(): string {
		return $this->reason;
	}

	public function manager_reauthenticated(): bool {
		return $this->manager_reauthenticated;
	}

	public function manager_reauthenticated_at(): string {
		return $this->manager_reauthenticated_at;
	}
}
