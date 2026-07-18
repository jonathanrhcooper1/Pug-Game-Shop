<?php
/**
 * Signed webhook permission callback for planned payment provider routes.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use Throwable;

final class PosPaymentWebhookPermissionCallbackAdapter {
	private mixed $signature_verifier;

	/**
	 * @var array<string, mixed>|null
	 */
	private ?array $last_audit_payload = null;

	/**
	 * @param callable(mixed): bool|null $signature_verifier Provider webhook signature verifier.
	 */
	public function __construct( ?callable $signature_verifier = null ) {
		$this->signature_verifier = $signature_verifier;
	}

	public function __invoke( mixed $request = null ): bool {
		return $this->authorize( $request );
	}

	public function is_configured(): bool {
		return is_callable( $this->signature_verifier );
	}

	public function authorize( mixed $request = null ): bool {
		if ( ! is_callable( $this->signature_verifier ) ) {
			$this->last_audit_payload = $this->audit_payload(
				'denied',
				array( 'webhook_signature_verifier_not_configured' )
			);

			return false;
		}

		$errors = array();

		try {
			$authorized = true === call_user_func( $this->signature_verifier, $request );
		} catch ( Throwable ) {
			$authorized = false;
			$errors[]   = 'webhook_signature_verifier_failed';
		}

		if ( ! $authorized && array() === $errors ) {
			$errors[] = 'webhook_signature_invalid';
		}

		$this->last_audit_payload = $this->audit_payload(
			$authorized ? 'authorized' : 'denied',
			$errors
		);

		return $authorized;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function last_audit_payload(): array {
		return $this->last_audit_payload ?? array();
	}

	/**
	 * @param list<string> $errors Authorization errors.
	 * @return array<string, mixed>
	 */
	private function audit_payload( string $status, array $errors ): array {
		return array(
			'action'              => 'pos_payment_webhook_permission_callback',
			'status'              => $status,
			'verifier_configured' => $this->is_configured(),
			'errors'              => array_values( array_unique( $errors ) ),
		);
	}
}
