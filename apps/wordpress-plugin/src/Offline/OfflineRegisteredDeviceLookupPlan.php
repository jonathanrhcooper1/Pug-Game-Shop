<?php
/**
 * Planned registered offline device repository lookup.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineRegisteredDeviceLookupPlan {
	/**
	 * @param array<string, mixed> $lookup_filters Repository lookup filters.
	 * @param array<string, mixed> $query_args Future repository query args.
	 * @param list<string>         $errors Planning errors.
	 */
	private function __construct(
		private string $token_fingerprint,
		private array $lookup_filters,
		private array $query_args,
		private array $errors
	) {
	}

	/**
	 * @param array<string, mixed> $lookup_filters Repository lookup filters.
	 * @param array<string, mixed> $query_args Future repository query args.
	 */
	public static function accepted(
		string $token_fingerprint,
		array $lookup_filters,
		array $query_args
	): self {
		return new self( $token_fingerprint, $lookup_filters, $query_args, array() );
	}

	/**
	 * @param list<string> $errors Planning errors.
	 */
	public static function rejected( string $token_fingerprint, array $errors ): self {
		return new self( $token_fingerprint, array(), array(), array_values( array_unique( $errors ) ) );
	}

	public function is_valid(): bool {
		return array() !== $this->query_args && array() === $this->errors;
	}

	public function token_fingerprint(): string {
		return $this->token_fingerprint;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function lookup_filters(): array {
		return $this->lookup_filters;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function query_args(): array {
		return $this->query_args;
	}

	/**
	 * @return list<string>
	 */
	public function selected_columns(): array {
		return $this->query_args['selected_columns'] ?? array();
	}

	public function lock_intent(): string {
		return (string) ( $this->query_args['lock_intent'] ?? '' );
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function audit_payload(): array {
		return array(
			'action'                => 'offline_registered_device_lookup_planned',
			'is_valid'              => $this->is_valid(),
			'token_fingerprint'     => $this->token_fingerprint,
			'has_lookup_filter'     => array() !== $this->lookup_filters,
			'selected_column_count' => count( $this->selected_columns() ),
			'lock_intent'           => $this->lock_intent(),
			'scope_check_deferred'  => 'deferred_to_access_policy' === ( $this->query_args['scope_check'] ?? '' ),
			'errors'                => $this->errors,
		);
	}
}
