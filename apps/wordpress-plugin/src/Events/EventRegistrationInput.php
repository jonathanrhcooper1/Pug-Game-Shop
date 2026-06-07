<?php
/**
 * Event registration request input.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Events;

final class EventRegistrationInput {
	private string $first_name;
	private string $last_name;
	private string $phone;
	private string $email;
	private string $topdeck_email;
	private string $idempotency_key;

	/**
	 * @var list<string>
	 */
	private array $errors;

	/**
	 * @param list<string> $errors Validation errors.
	 */
	private function __construct(
		string $first_name,
		string $last_name,
		string $phone,
		string $email,
		string $topdeck_email,
		string $idempotency_key,
		array $errors
	) {
		$this->first_name      = $first_name;
		$this->last_name       = $last_name;
		$this->phone           = $phone;
		$this->email           = $email;
		$this->topdeck_email   = $topdeck_email;
		$this->idempotency_key = $idempotency_key;
		$this->errors          = $errors;
	}

	/**
	 * @param array<string, mixed> $raw Raw request data.
	 */
	public static function from_array( array $raw, string $fallback_idempotency_key = '' ): self {
		$first_name      = self::clean_text( $raw['first_name'] ?? '', 100 );
		$last_name       = self::clean_text( $raw['last_name'] ?? '', 100 );
		$phone           = self::clean_phone( $raw['phone'] ?? '' );
		$email           = strtolower( self::clean_text( $raw['email'] ?? '', 191 ) );
		$topdeck_email   = strtolower( self::clean_text( $raw['topdeck_email'] ?? '', 191 ) );
		$idempotency_key = self::clean_text( $raw['idempotency_key'] ?? $fallback_idempotency_key, 191 );
		$errors          = array();

		if ( '' === $first_name ) {
			$errors[] = 'first_name_required';
		}

		if ( '' === $last_name ) {
			$errors[] = 'last_name_required';
		}

		if ( ! self::is_email( $email ) ) {
			$errors[] = 'email_invalid';
		}

		if ( '' !== $topdeck_email && ! self::is_email( $topdeck_email ) ) {
			$errors[] = 'topdeck_email_invalid';
		}

		return new self( $first_name, $last_name, $phone, $email, $topdeck_email, $idempotency_key, $errors );
	}

	public function is_valid(): bool {
		return array() === $this->errors;
	}

	/**
	 * @return list<string>
	 */
	public function errors(): array {
		return $this->errors;
	}

	public function first_name(): string {
		return $this->first_name;
	}

	public function last_name(): string {
		return $this->last_name;
	}

	public function phone(): string {
		return $this->phone;
	}

	public function email(): string {
		return $this->email;
	}

	public function topdeck_email(): string {
		return '' === $this->topdeck_email ? $this->email : $this->topdeck_email;
	}

	public function idempotency_key(): string {
		return $this->idempotency_key;
	}

	/**
	 * @return array<string, string>
	 */
	public function to_insert_data(): array {
		return array(
			'first_name'      => $this->first_name,
			'last_name'       => $this->last_name,
			'phone'           => $this->phone,
			'email'           => $this->email,
			'topdeck_email'   => $this->topdeck_email(),
			'idempotency_key' => $this->idempotency_key,
		);
	}

	private static function clean_text( mixed $value, int $max_length ): string {
		$value = trim( preg_replace( '/\s+/', ' ', (string) $value ) ?? '' );

		return substr( $value, 0, $max_length );
	}

	private static function clean_phone( mixed $value ): string {
		$value = preg_replace( '/[^0-9+().\-\s]/', '', (string) $value ) ?? '';
		$value = trim( preg_replace( '/\s+/', ' ', $value ) ?? '' );

		return substr( $value, 0, 50 );
	}

	private static function is_email( string $email ): bool {
		return false !== filter_var( $email, FILTER_VALIDATE_EMAIL );
	}
}
