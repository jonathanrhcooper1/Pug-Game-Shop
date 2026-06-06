<?php
/**
 * Event registration write result.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

final class EventRegistrationResult {
	/**
	 * @param array<string, mixed>|null $registration Registration row.
	 * @param list<string>              $errors Validation errors.
	 */
	public function __construct(
		private bool $success,
		private string $code,
		private string $message,
		private ?array $registration = null,
		private int $status_code = 200,
		private array $errors = array()
	) {
	}

	/**
	 * @param array<string, mixed> $registration Registration row.
	 */
	public static function success( array $registration, string $message, int $status_code = 201, string $code = 'registered' ): self {
		return new self( true, $code, $message, $registration, $status_code );
	}

	/**
	 * @param list<string> $errors Validation errors.
	 */
	public static function failure( string $code, string $message, int $status_code, array $errors = array() ): self {
		return new self( false, $code, $message, null, $status_code, $errors );
	}

	public function is_success(): bool {
		return $this->success;
	}

	public function status_code(): int {
		return $this->status_code;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function to_response(): array {
		$response = array(
			'success'      => $this->success,
			'code'         => $this->code,
			'message'      => $this->message,
			'registration' => $this->registration,
		);

		if ( array() !== $this->errors ) {
			$response['errors'] = $this->errors;
		}

		return $response;
	}
}
