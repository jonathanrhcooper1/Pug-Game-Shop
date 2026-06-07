<?php
/**
 * Result for a TopDeck registration push attempt.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

use TCGStorePlatform\TopDeck\TopDeckResult;

final class EventTopDeckRegistrationSyncResult {
	/**
	 * @param array<string, mixed> $provider_body Provider response body.
	 */
	private function __construct(
		private bool $success,
		private string $local_status,
		private string $provider_status,
		private int $http_status,
		private ?string $error_code,
		private string $message,
		private bool $should_retry,
		private array $provider_body
	) {
	}

	/**
	 * @param array<string, mixed> $provider_body Provider response body.
	 */
	public static function failure(
		string $local_status,
		string $error_code,
		string $message,
		bool $should_retry = false,
		array $provider_body = array()
	): self {
		return new self(
			false,
			$local_status,
			TopDeckResult::FAILED,
			0,
			$error_code,
			$message,
			$should_retry,
			$provider_body
		);
	}

	public static function from_topdeck_result( TopDeckResult $result ): self {
		$local_status = EventRegistrationStatus::from_topdeck_result(
			$result->status(),
			$result->http_status()
		);

		$should_retry = TopDeckResult::FAILED === $result->status()
			&& ( 0 === $result->http_status() || $result->http_status() >= 500 );

		return new self(
			$result->is_success(),
			$local_status,
			$result->status(),
			$result->http_status(),
			$result->error_code(),
			$result->message(),
			$should_retry,
			$result->body()
		);
	}

	public function is_success(): bool {
		return $this->success;
	}

	public function local_status(): string {
		return $this->local_status;
	}

	public function provider_status(): string {
		return $this->provider_status;
	}

	public function should_retry(): bool {
		return $this->should_retry;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function to_registration_update(): array {
		return array(
			'status'            => $this->local_status,
			'topdeck_status'    => $this->provider_status,
			'topdeck_http_code' => $this->http_status,
			'topdeck_error'     => $this->error_code,
			'topdeck_message'   => $this->message,
			'topdeck_response'  => $this->provider_body,
			'should_retry'      => $this->should_retry,
		);
	}
}
