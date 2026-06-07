<?php
/**
 * Offline route bootstrap orchestration.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\FeatureFlags\FeatureFlags;

final class OfflineRouteBootstrapper {
	/**
	 * @var callable(null|list<array<string, mixed>>, array<string, mixed>): array<string, mixed>
	 */
	private $registrar;

	private OfflineRouteBootstrapStatusPresenter $presenter;

	public function __construct(
		?OfflineRouteBootstrapStatusPresenter $presenter = null,
		?callable $registrar = null
	) {
		$this->presenter = $presenter ?? new OfflineRouteBootstrapStatusPresenter();
		$this->registrar = $registrar ?? static function ( ?array $route_contracts, array $payload ): array {
			$registered_count = ( new OfflineRouteRegistrar() )->register_enabled_routes( $route_contracts );
			$route_keys       = array_slice(
				self::list_values( $payload['registerable_route_keys'] ?? array() ),
				0,
				$registered_count
			);

			return array_fill_keys( $route_keys, array( 'registered' => true ) );
		};
	}

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'bootstrap_current_routes' ), 20 );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function bootstrap_current_routes(): array {
		return $this->bootstrap( FeatureFlags::is_enabled( 'offline_sync' ) );
	}

	/**
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @return array<string, mixed>
	 */
	public function bootstrap( bool $offline_feature_enabled, ?array $route_contracts = null ): array {
		return $this->bootstrap_from_payload(
			$this->presenter->health_payload( $offline_feature_enabled, $route_contracts ),
			$route_contracts
		);
	}

	/**
	 * @param array<string, array<string, mixed>> $route_plans Planned route registrations.
	 * @return array<string, mixed>
	 */
	public function bootstrap_from_registration_args( bool $offline_feature_enabled, array $route_plans ): array {
		return $this->bootstrap_from_payload(
			$this->presenter->health_payload_from_registration_args( $offline_feature_enabled, $route_plans ),
			null
		);
	}

	/**
	 * @param array<string, mixed>              $payload Health payload.
	 * @param null|list<array<string, mixed>> $route_contracts Planned route contracts.
	 * @return array<string, mixed>
	 */
	private function bootstrap_from_payload( array $payload, ?array $route_contracts ): array {
		$registered_routes = array();

		if ( true === $payload['should_register_routes'] ) {
			$registered_routes = ( $this->registrar )( $route_contracts, $payload );
			if ( ! is_array( $registered_routes ) ) {
				$registered_routes = array();
			}
		}

		return array(
			'status'                   => (string) $payload['status'],
			'feature_enabled'          => true === $payload['feature_enabled'],
			'should_register_routes'   => true === $payload['should_register_routes'],
			'planned_route_count'      => (int) $payload['planned_route_count'],
			'registerable_route_count' => (int) $payload['registerable_route_count'],
			'registered_route_count'   => count( $registered_routes ),
			'registered_route_keys'    => self::list_values( array_keys( $registered_routes ) ),
			'registration_deferred'    => true !== $payload['should_register_routes'],
			'bootstrap_block_reasons'  => self::list_values( $payload['bootstrap_block_reasons'] ?? array() ),
		);
	}

	/**
	 * @return list<string>
	 */
	private static function list_values( mixed $values ): array {
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
