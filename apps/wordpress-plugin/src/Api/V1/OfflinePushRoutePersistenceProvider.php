<?php
/**
 * Route-aware offline push persistence provider.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use RuntimeException;
use TCGStorePlatform\Offline\OfflinePushBatchResolver;
use TCGStorePlatform\Offline\OfflinePushPayload;
use TCGStorePlatform\Offline\OfflinePushPersistencePlanner;
use TCGStorePlatform\Offline\OfflinePushPersistenceRepository;
use TCGStorePlatform\Offline\OfflineRegisteredDevicePermissionResolver;

final class OfflinePushRoutePersistenceProvider {
	private OfflineRegisteredDevicePermissionResolver $permission_resolver;
	private OfflinePushPersistenceRepository $persistence_repository;
	private OfflinePushBatchResolver $batch_resolver;
	private OfflinePushPersistencePlanner $persistence_planner;

	/**
	 * @var callable|null
	 */
	private $server_time_provider;

	/**
	 * @var callable|null
	 */
	private $server_snapshots_provider;

	/**
	 * @var callable|null
	 */
	private $operation_options_provider;

	/**
	 * @var callable|null
	 */
	private $existing_operation_rows_provider;

	public function __construct(
		OfflineRegisteredDevicePermissionResolver $permission_resolver,
		OfflinePushPersistenceRepository $persistence_repository,
		?OfflinePushBatchResolver $batch_resolver = null,
		?OfflinePushPersistencePlanner $persistence_planner = null,
		?callable $server_time_provider = null,
		?callable $server_snapshots_provider = null,
		?callable $operation_options_provider = null,
		?callable $existing_operation_rows_provider = null
	) {
		$this->permission_resolver              = $permission_resolver;
		$this->persistence_repository           = $persistence_repository;
		$this->batch_resolver                   = $batch_resolver ?? new OfflinePushBatchResolver();
		$this->persistence_planner              = $persistence_planner ?? new OfflinePushPersistencePlanner();
		$this->server_time_provider             = $server_time_provider;
		$this->server_snapshots_provider        = $server_snapshots_provider;
		$this->operation_options_provider       = $operation_options_provider;
		$this->existing_operation_rows_provider = $existing_operation_rows_provider;
	}

	public function __invoke(
		OfflinePushPayload $payload,
		OfflineRestRequestData $data
	): OfflinePushRouteProcessingResult {
		$server_time_utc = $this->server_time_utc();
		$permission      = $this->permission_resolver->resolve(
			$data->headers(),
			'offline_push',
			$server_time_utc
		);

		if ( ! $permission->is_authorized() ) {
			throw new RuntimeException( 'offline_push_permission_rejected' );
		}

		$device_row = $permission->repository_result()?->device_row();

		if ( null === $device_row ) {
			throw new RuntimeException( 'offline_push_device_row_missing' );
		}

		$resolution = $this->batch_resolver->resolve(
			$payload,
			$this->provider_payload(
				$this->server_snapshots_provider,
				$payload,
				$data,
				array(
					'device_row'      => $device_row,
					'server_time_utc' => $server_time_utc,
				)
			),
			$server_time_utc,
			$this->provider_payload(
				$this->operation_options_provider,
				$payload,
				$data,
				array(
					'device_row'      => $device_row,
					'server_time_utc' => $server_time_utc,
				)
			)
		);
		$plan       = $this->persistence_planner->plan(
			$payload,
			$resolution,
			$device_row,
			$server_time_utc,
			$this->provider_payload(
				$this->existing_operation_rows_provider,
				$payload,
				$data,
				array(
					'device_row'      => $device_row,
					'server_time_utc' => $server_time_utc,
				)
			)
		);

		return new OfflinePushRouteProcessingResult(
			$resolution,
			$this->persistence_repository->persist( $plan ),
			$permission->audit_payload()
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function readiness_summary(): array {
		return array(
			'action'                                      => 'offline_push_route_persistence_provider_ready',
			'provider_ready'                              => $this->provider_ready(),
			'permission_resolver_ready'                   => method_exists( $this->permission_resolver, 'resolve' ),
			'batch_resolver_ready'                        => method_exists( $this->batch_resolver, 'resolve' ),
			'persistence_planner_ready'                   => method_exists( $this->persistence_planner, 'plan' ),
			'persistence_repository_ready'                => method_exists( $this->persistence_repository, 'persist' ),
			'server_snapshot_provider_configured'         => is_callable( $this->server_snapshots_provider ),
			'operation_options_provider_configured'       => is_callable( $this->operation_options_provider ),
			'existing_operation_rows_provider_configured' => is_callable( $this->existing_operation_rows_provider ),
			'route_connected_writes_ready'                => $this->provider_ready(),
			'route_registration_deferred'                 => true,
			'default_route_execution_deferred'            => true,
			'queue_replay_deferred'                       => true,
			'canonical_mutations_deferred'                => true,
		);
	}

	private function provider_ready(): bool {
		return method_exists( $this->permission_resolver, 'resolve' )
			&& method_exists( $this->batch_resolver, 'resolve' )
			&& method_exists( $this->persistence_planner, 'plan' )
			&& method_exists( $this->persistence_repository, 'persist' )
			&& is_callable( $this->server_snapshots_provider );
	}

	/**
	 * @param callable|null $provider Provider callable.
	 * @param array<string, mixed> $context Route processing context.
	 * @return array<string|int, mixed>
	 */
	private function provider_payload(
		?callable $provider,
		OfflinePushPayload $payload,
		OfflineRestRequestData $data,
		array $context = array()
	): array {
		if ( ! is_callable( $provider ) ) {
			return array();
		}

		$value = $provider( $payload, $data, $context );

		if ( ! is_array( $value ) ) {
			throw new RuntimeException( 'offline_push_provider_payload_invalid' );
		}

		return $value;
	}

	private function server_time_utc(): string {
		if ( is_callable( $this->server_time_provider ) ) {
			return trim( (string) ( $this->server_time_provider )() );
		}

		return gmdate( 'Y-m-d\TH:i:s\Z' );
	}
}
