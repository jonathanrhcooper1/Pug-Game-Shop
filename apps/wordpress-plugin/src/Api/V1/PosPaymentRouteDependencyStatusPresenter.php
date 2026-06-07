<?php
/**
 * Presentation helpers for POS/payment route dependency readiness.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

final class PosPaymentRouteDependencyStatusPresenter {
	private PosPaymentRouteDependencyFactory $dependency_factory;

	public function __construct( ?PosPaymentRouteDependencyFactory $dependency_factory = null ) {
		$this->dependency_factory = $dependency_factory ?? new PosPaymentRouteDependencyFactory();
	}

	/**
	 * @return array<string, mixed>
	 */
	public function health_payload(): array {
		$summary = $this->dependency_factory->readiness_summary();

		return array_merge(
			array(
				'status' => true === $summary['configured'] ? 'ready' : 'blocked',
			),
			$summary
		);
	}

	/**
	 * @return array{value:string,status:string}
	 */
	public function admin_summary(): array {
		$payload = $this->health_payload();

		return array(
			'value'  => sprintf(
				'handlers %d / %d; permissions %d / %d; webhook verifier %s; registrar %s; bootstrapper %s; routes deferred; writes deferred',
				(int) ( $payload['controller_handler_count'] ?? 0 ),
				(int) ( $payload['route_contract_count'] ?? 0 ),
				(int) ( $payload['permission_callback_count'] ?? 0 ),
				(int) ( $payload['route_contract_count'] ?? 0 ),
				true === ( $payload['webhook_signature_verifier_configured'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['registrar_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['bootstrapper_ready'] ?? false ) ? 'ready' : 'not ready'
			),
			'status' => (string) $payload['status'],
		);
	}
}
