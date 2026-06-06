<?php
/**
 * Repository-backed registered offline device permission resolver.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineRegisteredDevicePermissionResolver {
	private OfflineRegisteredDeviceRepository $repository;
	private OfflineRegisteredDevicePermissionPlanner $permission_planner;

	public function __construct(
		OfflineRegisteredDeviceRepository $repository,
		?OfflineRegisteredDevicePermissionPlanner $permission_planner = null
	) {
		$this->repository         = $repository;
		$this->permission_planner = $permission_planner ?? new OfflineRegisteredDevicePermissionPlanner();
	}

	/**
	 * @param array<string, mixed> $headers REST request headers.
	 */
	public function resolve(
		array $headers,
		string $required_scope,
		string $server_time_utc
	): OfflineRegisteredDevicePermissionResolution {
		$initial_permission = $this->permission_planner->plan(
			$headers,
			null,
			$required_scope,
			$server_time_utc
		);

		if ( ! $initial_permission->requires_device_lookup() ) {
			return OfflineRegisteredDevicePermissionResolution::permission_only( $initial_permission );
		}

		$device_lookup_plan = $initial_permission->device_lookup_plan();

		if ( null === $device_lookup_plan ) {
			return OfflineRegisteredDevicePermissionResolution::permission_only( $initial_permission );
		}

		$repository_result = $this->repository->find_by_lookup_plan( $device_lookup_plan );

		if ( $repository_result->is_not_found() ) {
			return OfflineRegisteredDevicePermissionResolution::repository_denied(
				$initial_permission,
				$repository_result,
				array( 'registered_device_not_found' )
			);
		}

		if ( $repository_result->is_rejected() ) {
			return OfflineRegisteredDevicePermissionResolution::repository_denied(
				$initial_permission,
				$repository_result,
				$repository_result->errors()
			);
		}

		$device_row = $repository_result->device_row();

		if ( null === $device_row ) {
			return OfflineRegisteredDevicePermissionResolution::repository_denied(
				$initial_permission,
				$repository_result,
				array( 'registered_device_row_missing' )
			);
		}

		$final_permission = $this->permission_planner->plan(
			$headers,
			$device_row,
			$required_scope,
			$server_time_utc
		);

		return OfflineRegisteredDevicePermissionResolution::resolved(
			$initial_permission,
			$repository_result,
			$final_permission
		);
	}
}
