<?php
/**
 * Presentation helpers for POS/payment route dependency readiness.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Square\SquarePaymentDelegationPolicy;

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
				'handlers %d / %d; permissions %d / %d; webhook verifier %s; fee repo %s; fee handler %s; registrar %s; bootstrapper %s; routes %s; reads %s; writes %s; Square payments %s',
				(int) ( $payload['controller_handler_count'] ?? 0 ),
				(int) ( $payload['route_contract_count'] ?? 0 ),
				(int) ( $payload['permission_callback_count'] ?? 0 ),
				(int) ( $payload['route_contract_count'] ?? 0 ),
				true === ( $payload['webhook_signature_verifier_configured'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['fee_snapshot_repository_adapter_ready'] ?? false ) ? 'staged' : 'deferred',
				true === ( $payload['fee_snapshot_route_handler_ready'] ?? false ) ? 'ready' : 'deferred',
				true === ( $payload['registrar_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['bootstrapper_ready'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['route_registration_deferred'] ?? true ) ? 'deferred' : 'ready',
				true === ( $payload['route_connected_reads_deferred'] ?? true ) ? 'deferred' : 'ready',
				true === ( $payload['route_connected_writes_deferred'] ?? true ) ? 'deferred' : 'ready',
				SquarePaymentDelegationPolicy::status_label()
			),
			'status' => (string) $payload['status'],
		);
	}
}
