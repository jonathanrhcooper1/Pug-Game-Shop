<?php
/**
 * Planned offline device token lookup.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineDeviceTokenLookupPlan {
	/**
	 * @param array<string, string> $lookup_filters Repository lookup filters.
	 * @param list<string>          $errors Parse errors.
	 */
	private function __construct(
		private string $token_hash,
		private string $token_fingerprint,
		private array $lookup_filters,
		private array $errors
	) {
	}

	public static function accepted( string $token_hash ): self {
		$token_hash = strtolower( trim( $token_hash ) );

		return new self(
			$token_hash,
			substr( $token_hash, 0, 12 ),
			array(
				'token_hash' => $token_hash,
			),
			array()
		);
	}

	/**
	 * @param list<string> $errors Parse errors.
	 */
	public static function rejected( array $errors ): self {
		return new self( '', '', array(), array_values( array_unique( $errors ) ) );
	}

	public function is_valid(): bool {
		return '' !== $this->token_hash && array() === $this->errors;
	}

	public function token_hash(): string {
		return $this->token_hash;
	}

	public function token_fingerprint(): string {
		return $this->token_fingerprint;
	}

	/**
	 * @return array<string, string>
	 */
	public function lookup_filters(): array {
		return $this->lookup_filters;
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
			'action'            => 'offline_device_token_lookup_planned',
			'token_fingerprint' => $this->token_fingerprint,
			'has_lookup_filter' => array() !== $this->lookup_filters,
			'errors'            => $this->errors,
		);
	}
}
