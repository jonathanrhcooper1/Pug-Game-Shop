<?php
/**
 * Normalized ScryDex adapter result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

final class ScryDexResult {
	public const SUCCESS        = 'success';
	public const FAILED         = 'failed';
	public const RATE_LIMITED   = 'rate_limited';
	public const UNAUTHORIZED   = 'unauthorized';
	public const NOT_CONFIGURED = 'not_configured';
	public const NOT_SUPPORTED  = 'not_supported';

	/**
	 * @param array<string, mixed> $body Response body.
	 * @param array<string, mixed> $meta Extra metadata.
	 */
	public function __construct(
		private string $status,
		private int $http_status = 0,
		private array $body = array(),
		private ?string $error_code = null,
		private string $message = '',
		private array $meta = array()
	) {
	}

	public static function not_configured( string $message ): self {
		return new self( self::NOT_CONFIGURED, 0, array(), 'scrydex_not_configured', $message );
	}

	public static function not_supported( string $message ): self {
		return new self( self::NOT_SUPPORTED, 0, array(), 'scrydex_not_supported', $message );
	}

	public function status(): string {
		return $this->status;
	}

	public function http_status(): int {
		return $this->http_status;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function body(): array {
		return $this->body;
	}

	public function error_code(): ?string {
		return $this->error_code;
	}

	public function message(): string {
		return $this->message;
	}

	public function is_success(): bool {
		return self::SUCCESS === $this->status;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function to_array(): array {
		return array(
			'status'      => $this->status,
			'http_status' => $this->http_status,
			'body'        => $this->body,
			'error_code'  => $this->error_code,
			'message'     => $this->message,
			'meta'        => $this->meta,
		);
	}
}
