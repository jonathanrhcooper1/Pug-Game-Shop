<?php
/**
 * Registered offline device wpdb repository.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Offline;

final class OfflineRegisteredDeviceRepository {
	private \wpdb $database;
	private OfflineRegisteredDeviceLookupQueryBuilder $query_builder;
	private OfflineRegisteredDeviceRowNormalizer $row_normalizer;

	public function __construct(
		\wpdb $database,
		?OfflineRegisteredDeviceLookupQueryBuilder $query_builder = null,
		?OfflineRegisteredDeviceRowNormalizer $row_normalizer = null
	) {
		$this->database       = $database;
		$this->query_builder  = $query_builder ?? new OfflineRegisteredDeviceLookupQueryBuilder();
		$this->row_normalizer = $row_normalizer ?? new OfflineRegisteredDeviceRowNormalizer();
	}

	public function find_by_lookup_plan(
		OfflineRegisteredDeviceLookupPlan $lookup_plan
	): OfflineRegisteredDeviceRepositoryResult {
		$query_plan = $this->query_builder->build( $lookup_plan, $this->database->prefix );

		if ( ! $query_plan->is_valid() ) {
			return OfflineRegisteredDeviceRepositoryResult::rejected(
				$query_plan,
				$query_plan->errors()
			);
		}

		$prepared_sql = $this->database->prepare(
			$query_plan->sql_template(), // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$query_plan->prepare_args()
		);
		$row          = $this->database->get_row(
			$prepared_sql, // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
			$this->array_a_output_type()
		);

		if ( ! is_array( $row ) ) {
			return OfflineRegisteredDeviceRepositoryResult::not_found( $query_plan );
		}

		$normalization = $this->row_normalizer->normalize( $row );

		if ( ! $normalization->is_valid() ) {
			return OfflineRegisteredDeviceRepositoryResult::rejected(
				$query_plan,
				$normalization->errors(),
				$normalization->audit_payload()
			);
		}

		return OfflineRegisteredDeviceRepositoryResult::found(
			$normalization->device_row(),
			$query_plan,
			$normalization->audit_payload()
		);
	}

	private function array_a_output_type(): string {
		if ( defined( 'ARRAY_A' ) ) {
			return ARRAY_A;
		}

		return 'ARRAY_A';
	}
}
