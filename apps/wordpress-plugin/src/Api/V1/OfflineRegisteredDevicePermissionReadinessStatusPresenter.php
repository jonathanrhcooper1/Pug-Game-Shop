<?php
/**
 * Presentation helpers for registered-device permission readiness.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolverFactory;

final class OfflineRegisteredDevicePermissionReadinessStatusPresenter {
	private OfflineRegisteredDevicePermissionResolverFactory $resolver_factory;

	public function __construct( ?OfflineRegisteredDevicePermissionResolverFactory $resolver_factory = null ) {
		$this->resolver_factory = $resolver_factory ?? new OfflineRegisteredDevicePermissionResolverFactory();
	}

	/**
	 * @return array<string, mixed>
	 */
	public function health_payload(): array {
		$summary = $this->resolver_factory->readiness_summary();
		$scopes  = array_values(
			array_unique(
				array_values( OfflineRoutePermissionCallbackFactory::registered_device_scope_map() )
			)
		);

		return array_merge(
			array(
				'status'                        => true === $summary['configured'] ? 'ready' : 'blocked',
				'registered_device_route_count' => count( $scopes ),
				'registered_device_scopes'      => $scopes,
			),
			$summary
		);
	}

	/**
	 * @return array{value:string,status:string}
	 */
	public function admin_summary(): array {
		$payload = $this->health_payload();
		$issues  = $this->list_values( $payload['configuration_issues'] ?? array() );
		$details = array() === $issues ? 'ready' : 'blocked: ' . implode( ', ', $issues );

		return array(
			'value'  => sprintf(
				'resolver %s; repository %s; session updates %s; %d scopes; %s',
				true === ( $payload['permission_resolver_configured'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['registered_device_repository_configured'] ?? false ) ? 'ready' : 'not ready',
				true === ( $payload['session_update_repository_configured'] ?? false ) ? 'ready' : 'not ready',
				(int) ( $payload['registered_device_route_count'] ?? 0 ),
				$details
			),
			'status' => (string) $payload['status'],
		);
	}

	/**
	 * @return list<string>
	 */
	private function list_values( mixed $values ): array {
		if ( ! is_array( $values ) ) {
			return array();
		}

		return array_values(
			array_filter(
				array_map(
					static fn ( mixed $value ): string => ( is_array( $value ) || is_object( $value ) )
						? ''
						: trim( (string) $value ),
					$values
				),
				static fn ( string $value ): bool => '' !== $value
			)
		);
	}
}
