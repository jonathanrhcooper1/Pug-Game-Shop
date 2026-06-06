<?php
/**
 * Normalized TopDeck adapter result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\TopDeck;

final class TopDeckResult {
	public const SUCCESS            = 'success';
	public const REGISTERED         = 'registered';
	public const PENDING_INVITATION = 'pending_invitation';
	public const ALREADY_REGISTERED = 'already_registered';
	public const CAPACITY_CONFLICT  = 'capacity_conflict';
	public const FAILED             = 'failed';
	public const NOT_CONFIGURED     = 'not_configured';
	public const NOT_SUPPORTED      = 'not_supported';

	private string $status;
	private int $http_status;

	/**
	 * @var array<string, mixed>
	 */
	private array $body;
	private ?string $error_code;
	private string $message;

	/**
	 * @var array<string, mixed>
	 */
	private array $meta;

	/**
	 * @param array<string, mixed> $body Response body.
	 * @param array<string, mixed> $meta Extra metadata.
	 */
	public function __construct(
		string $status,
		int $http_status = 0,
		array $body = array(),
		?string $error_code = null,
		string $message = '',
		array $meta = array()
	) {
		$this->status      = $status;
		$this->http_status = $http_status;
		$this->body        = $body;
		$this->error_code  = $error_code;
		$this->message     = $message;
		$this->meta        = $meta;
	}

	public static function not_configured( string $message ): self {
		return new self( self::NOT_CONFIGURED, 0, array(), 'topdeck_not_configured', $message );
	}

	public static function not_supported( string $message ): self {
		return new self( self::NOT_SUPPORTED, 0, array(), 'topdeck_not_supported', $message );
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
		return in_array(
			$this->status,
			array(
				self::SUCCESS,
				self::REGISTERED,
				self::PENDING_INVITATION,
				self::ALREADY_REGISTERED,
			),
			true
		);
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
