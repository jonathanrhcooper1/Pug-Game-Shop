<?php
/**
 * WooCommerce hook contract value object.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

final class HookContract {
	private string $hook_name;
	private string $handler_method;
	private string $phase;
	private int $priority;
	private int $accepted_args;
	private bool $live_enabled_by_default;
	private string $purpose;

	public function __construct(
		string $hook_name,
		string $handler_method,
		string $phase,
		int $priority,
		int $accepted_args,
		bool $live_enabled_by_default,
		string $purpose
	) {
		$this->hook_name               = $hook_name;
		$this->handler_method          = $handler_method;
		$this->phase                   = $phase;
		$this->priority                = $priority;
		$this->accepted_args           = $accepted_args;
		$this->live_enabled_by_default = $live_enabled_by_default;
		$this->purpose                 = $purpose;
	}

	public function hook_name(): string {
		return $this->hook_name;
	}

	public function handler_method(): string {
		return $this->handler_method;
	}

	public function phase(): string {
		return $this->phase;
	}

	public function priority(): int {
		return $this->priority;
	}

	public function accepted_args(): int {
		return $this->accepted_args;
	}

	public function live_enabled_by_default(): bool {
		return $this->live_enabled_by_default;
	}

	public function purpose(): string {
		return $this->purpose;
	}
}
