<?php
/**
 * Parser-only POS/payment route validation handlers.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Payments\PosPaymentFeeSnapshotQueryBuilder;
use TCGStorePlatform\Payments\PosPaymentFeeSnapshotQueryPlanner;
use TCGStorePlatform\Payments\PosPaymentFeeSnapshotRepository;
use TCGStorePlatform\Payments\PosPaymentLogPlan;
use TCGStorePlatform\Payments\PosPaymentLogPlanner;

final class PosPaymentRouteValidationHandlerFactory {
	private PosPaymentLogPlanner $log_planner;
	private PosPaymentFeeSnapshotQueryPlanner $fee_snapshot_query_planner;
	private PosPaymentFeeSnapshotQueryBuilder $fee_snapshot_query_builder;
	private ?PosPaymentFeeSnapshotRepository $fee_snapshot_repository;
	private string $table_prefix;

	public function __construct(
		?PosPaymentLogPlanner $log_planner = null,
		?PosPaymentFeeSnapshotQueryPlanner $fee_snapshot_query_planner = null,
		?PosPaymentFeeSnapshotQueryBuilder $fee_snapshot_query_builder = null,
		string $table_prefix = 'wp_',
		?PosPaymentFeeSnapshotRepository $fee_snapshot_repository = null
	) {
		$this->log_planner                 = $log_planner ?? new PosPaymentLogPlanner();
		$this->fee_snapshot_query_planner  = $fee_snapshot_query_planner ?? new PosPaymentFeeSnapshotQueryPlanner();
		$this->fee_snapshot_query_builder  = $fee_snapshot_query_builder ?? new PosPaymentFeeSnapshotQueryBuilder();
		$this->fee_snapshot_repository     = $fee_snapshot_repository;
		$this->table_prefix                = $table_prefix;
	}

	/**
	 * @return array<string, callable(OfflineRestRequestData): array<string, mixed>>
	 */
	public function handlers(): array {
		return array(
			'ingest_pos_event'                     => fn ( OfflineRestRequestData $data ): array => $this->ingest_pos_event( $data ),
			'get_pos_event_status'                 => fn ( OfflineRestRequestData $data ): array => $this->get_pos_event_status( $data ),
			'run_pos_reconciliation'               => fn ( OfflineRestRequestData $data ): array => $this->run_pos_reconciliation( $data ),
			'list_pos_reconciliation_conflicts'    => fn ( OfflineRestRequestData $data ): array => $this->list_pos_reconciliation_conflicts( $data ),
			'resolve_pos_reconciliation_conflict'  => fn ( OfflineRestRequestData $data ): array => $this->resolve_pos_reconciliation_conflict( $data ),
			'receive_payment_provider_webhook'     => fn ( OfflineRestRequestData $data ): array => $this->receive_payment_provider_webhook( $data ),
			'list_payment_fee_snapshots'           => fn ( OfflineRestRequestData $data ): array => $this->list_payment_fee_snapshots( $data ),
			'create_payment_fee_snapshot'          => fn ( OfflineRestRequestData $data ): array => $this->create_payment_fee_snapshot( $data ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function readiness_summary(): array {
		return array(
			'parser_validation_factory_ready'                  => true,
			'fee_snapshot_query_planner_ready'                 => method_exists( PosPaymentFeeSnapshotQueryPlanner::class, 'plan' ),
			'fee_snapshot_query_builder_ready'                 => method_exists( PosPaymentFeeSnapshotQueryBuilder::class, 'build' ),
			'fee_snapshot_repository_configured'               => null !== $this->fee_snapshot_repository,
			'fee_snapshot_repository_adapter_ready'            => null !== $this->fee_snapshot_repository,
			'fee_snapshot_repository_deferred'                 => true,
			'fee_snapshot_route_connected_reads_deferred'      => true,
			'fee_snapshot_route_connected_writes_deferred'     => true,
			'fee_snapshot_repository_execution_requires_route' => false,
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function ingest_pos_event( OfflineRestRequestData $data ): array {
		return $this->validate_transaction_plan( 'ingest_pos_event', $data, 202 );
	}

	/**
	 * @return array<string, mixed>
	 */
	public function receive_payment_provider_webhook( OfflineRestRequestData $data ): array {
		$body     = $data->body_params();
		$provider = $data->route_param( 'provider' ) ?? $this->string_value( $body['provider'] ?? '' );

		return $this->validate_transaction_plan(
			'receive_payment_provider_webhook',
			$data,
			202,
			array(
				'provider' => $provider,
			)
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function get_pos_event_status( OfflineRestRequestData $data ): array {
		$event_id = $data->route_param( 'provider_event_id' );

		if ( null === $event_id ) {
			return $this->rejected( 'get_pos_event_status', array( 'provider_event_id_required' ) );
		}

		return $this->validated(
			'get_pos_event_status',
			array(
				'provider_event_id' => $event_id,
				'read_deferred'     => true,
			),
			200
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function run_pos_reconciliation( OfflineRestRequestData $data ): array {
		$body     = $data->body_params();
		$provider = $this->string_value( $body['provider'] ?? '' );

		if ( '' === $provider ) {
			return $this->rejected( 'run_pos_reconciliation', array( 'provider_required' ) );
		}

		return $this->validated(
			'run_pos_reconciliation',
			array(
				'provider'           => $provider,
				'window_start'       => $this->string_value( $body['window_start'] ?? '' ),
				'window_end'         => $this->string_value( $body['window_end'] ?? '' ),
				'reconciliation_deferred' => true,
			),
			202
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function list_pos_reconciliation_conflicts( OfflineRestRequestData $data ): array {
		$params = $this->params( $data );

		return $this->validated(
			'list_pos_reconciliation_conflicts',
			array(
				'status'        => $this->defaulted_string( $params['status'] ?? '', 'open' ),
				'cursor'        => $this->nullable_string( $params['cursor'] ?? null ),
				'page_size'     => $this->bounded_page_size( $params['page_size'] ?? 50 ),
				'read_deferred' => true,
			),
			200
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function resolve_pos_reconciliation_conflict( OfflineRestRequestData $data ): array {
		$body       = $data->body_params();
		$conflict_id = $data->route_param( 'conflict_id' ) ?? $this->string_value( $body['conflict_id'] ?? '' );
		$action     = $this->string_value( $body['resolution_action'] ?? '' );
		$key        = $data->idempotency_key();
		$errors     = array();

		if ( '' === $conflict_id ) {
			$errors[] = 'conflict_id_required';
		}

		if ( '' === $action ) {
			$errors[] = 'resolution_action_required';
		}

		if ( null === $key ) {
			$errors[] = 'idempotency_key_required';
		}

		if ( array() !== $errors ) {
			return $this->rejected( 'resolve_pos_reconciliation_conflict', $errors );
		}

		return $this->validated(
			'resolve_pos_reconciliation_conflict',
			array(
				'conflict_id'           => $conflict_id,
				'resolution_action'     => $action,
				'idempotency_key'       => $key,
				'conflict_write_deferred' => true,
			),
			202
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function list_payment_fee_snapshots( OfflineRestRequestData $data ): array {
		$params     = $this->params( $data );
		$query_plan = $this->fee_snapshot_query_planner->plan( $params, $this->table_prefix );

		if ( ! $query_plan->is_valid() ) {
			return $this->rejected( 'list_payment_fee_snapshots', $query_plan->errors() );
		}

		$query_build_plan = $this->fee_snapshot_query_builder->build( $query_plan );
		if ( ! $query_build_plan->is_valid() ) {
			return $this->rejected( 'list_payment_fee_snapshots', $query_build_plan->errors() );
		}

		$filters = $query_plan->filters();

		return $this->validated(
			'list_payment_fee_snapshots',
			array(
				'provider'                      => $filters['provider'],
				'channel'                       => $filters['channel'],
				'currency'                      => $filters['currency'],
				'effective_on'                  => $filters['effective_on'],
				'page_size'                     => $query_plan->limit(),
				'fee_snapshot_query_ready'      => true,
				'fee_snapshot_read_query'       => $query_plan->query_contract(),
				'fee_snapshot_sql_ready'        => true,
				'fee_snapshot_sql_prepare_args' => $query_build_plan->prepare_arg_count(),
				'fee_snapshot_repository_configured' => null !== $this->fee_snapshot_repository,
				'fee_snapshot_repository_adapter_ready' => null !== $this->fee_snapshot_repository,
				'fee_snapshot_repository_deferred' => true,
				'read_deferred'                 => true,
				'fee_snapshot_read_deferred'    => true,
				'route_connected_reads_deferred' => true,
			),
			200
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function create_payment_fee_snapshot( OfflineRestRequestData $data ): array {
		$body     = $data->body_params();
		$provider = $this->string_value( $body['provider'] ?? '' );
		$currency = $this->currency( $body['currency'] ?? '' );
		$errors   = array();

		if ( '' === $provider ) {
			$errors[] = 'provider_required';
		}

		if ( '' === $currency ) {
			$errors[] = 'currency_required';
		}

		if ( ! isset( $body['fee_basis_points'] ) && ! isset( $body['fee_percent'] ) ) {
			$errors[] = 'fee_amount_required';
		}

		if ( array() !== $errors ) {
			return $this->rejected( 'create_payment_fee_snapshot', $errors );
		}

		return $this->validated(
			'create_payment_fee_snapshot',
			array(
				'provider'                    => $provider,
				'currency'                    => $currency,
				'fee_basis_points_configured' => isset( $body['fee_basis_points'] ),
				'fee_percent_configured'      => isset( $body['fee_percent'] ),
				'fee_write_deferred'          => true,
			),
			202
		);
	}

	/**
	 * @param array<string, mixed> $context Context overrides.
	 * @return array<string, mixed>
	 */
	private function validate_transaction_plan(
		string $callback,
		OfflineRestRequestData $data,
		int $status_code,
		array $context = array()
	): array {
		$body             = $data->body_params();
		$transaction_plan = $body['transaction_plan'] ?? null;

		if ( ! is_array( $transaction_plan ) ) {
			return $this->rejected( $callback, array( 'transaction_plan_required' ) );
		}

		$plan_context = array_merge(
			is_array( $body['context'] ?? null ) ? $body['context'] : array(),
			$context
		);
		$plan         = $this->log_planner->plan_transaction( $transaction_plan, $plan_context );

		if ( PosPaymentLogPlan::FAILED === $plan->status() ) {
			return $this->rejected( $callback, $plan->errors() );
		}

		return $this->validated(
			$callback,
			array(
				'log_plan_status'            => $plan->status(),
				'log_plan_code'              => $plan->code(),
				'planned_pos_sync_rows'      => count( $plan->pos_sync_rows() ),
				'planned_payment_log_rows'   => count( $plan->payment_provider_rows() ),
				'planned_write_count'        => $plan->write_count(),
				'log_write_deferred'         => true,
			),
			$status_code
		);
	}

	/**
	 * @param array<string, mixed> $data Response data.
	 * @return array<string, mixed>
	 */
	private function validated( string $callback, array $data, int $status_code ): array {
		return array(
			'status'                              => 'validated',
			'status_code'                         => $status_code,
			'code'                                => 'pos_payment_route_request_validated',
			'callback'                            => $callback,
			'data'                                => array_merge(
				$data,
				array(
					'route_connected_writes_deferred'      => true,
					'transaction_execution_deferred'       => true,
					'provider_capture_deferred'            => true,
					'provider_inventory_write_deferred'    => true,
					'woocommerce_gateway_capture_deferred' => true,
					'route_still_gated'                    => true,
				)
			),
		);
	}

	/**
	 * @param list<string> $errors Validation errors.
	 * @return array<string, mixed>
	 */
	private function rejected( string $callback, array $errors ): array {
		return array(
			'status'      => 'invalid',
			'status_code' => 400,
			'code'        => 'pos_payment_route_request_invalid',
			'callback'    => $callback,
			'errors'      => array_values( array_unique( $errors ) ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function params( OfflineRestRequestData $data ): array {
		return array_merge( $data->query_params(), $data->body_params() );
	}

	private function defaulted_string( mixed $value, string $default ): string {
		$value = $this->string_value( $value );

		return '' === $value ? $default : $value;
	}

	private function nullable_string( mixed $value ): ?string {
		$value = $this->string_value( $value );

		return '' === $value ? null : $value;
	}

	private function string_value( mixed $value ): string {
		if ( is_array( $value ) || is_object( $value ) ) {
			return '';
		}

		return trim( (string) $value );
	}

	private function currency( mixed $value ): string {
		$value = strtoupper( $this->string_value( $value ) );

		return 1 === preg_match( '/^[A-Z]{3}$/', $value ) ? $value : '';
	}

	private function bounded_page_size( mixed $value ): int {
		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			$value = (int) $value;
		}

		if ( ! is_int( $value ) ) {
			return 50;
		}

		return max( 1, min( 100, $value ) );
	}
}
