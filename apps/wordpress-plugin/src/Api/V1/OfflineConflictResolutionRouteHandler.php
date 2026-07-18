<?php
/**
 * Staged offline conflict resolution route handler.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use InvalidArgumentException;
use TCGStorePlatform\Offline\OfflineConflictResolutionPlanner;
use TCGStorePlatform\Offline\OfflineConflictResolutionRepository;
use TCGStorePlatform\Offline\OfflineConflictResolutionRepositoryResult;
use TCGStorePlatform\Offline\OfflineConflictResolutionRequest;
use TCGStorePlatform\Offline\OfflineConflictResolutionRequestParser;
use Throwable;

final class OfflineConflictResolutionRouteHandler {
	/**
	 * @var callable|null
	 */
	private $current_conflict_provider;

	/**
	 * @var callable|null
	 */
	private $server_time_provider;

	public function __construct(
		private ?OfflineConflictResolutionRequestParser $parser = null,
		private ?OfflineConflictResolutionPlanner $planner = null,
		private ?OfflineConflictResolutionRepository $repository = null,
		?callable $current_conflict_provider = null,
		?callable $server_time_provider = null
	) {
		$this->current_conflict_provider = $current_conflict_provider;
		$this->server_time_provider      = $server_time_provider;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function handle( OfflineRestRequestData $data ): array {
		$result = $this->parser()->parse(
			$this->route_conflict_id( $data ),
			$data->body_params(),
			$data->idempotency_key()
		);

		if ( ! $result->is_valid() || null === $result->request() ) {
			return $this->rejected( 'offline_conflict_resolution_invalid', $result->errors(), 400 );
		}

		$request = $result->request();

		if ( null === $this->repository || ! is_callable( $this->current_conflict_provider ) ) {
			return $this->validated( $request );
		}

		try {
			$current_row = ( $this->current_conflict_provider )( $request, $data );
		} catch ( InvalidArgumentException $exception ) {
			return $this->rejected( 'offline_conflict_lookup_invalid', array( $exception->getMessage() ), 400 );
		} catch ( Throwable ) {
			return $this->rejected( 'offline_conflict_lookup_failed', array( 'current_conflict_provider_failed' ), 500 );
		}

		if ( null === $current_row ) {
			return $this->rejected( 'offline_conflict_not_found', array( 'conflict_not_found' ), 404 );
		}

		if ( ! is_array( $current_row ) ) {
			return $this->rejected( 'offline_conflict_lookup_invalid', array( 'current_conflict_row_invalid' ), 400 );
		}

		try {
			$resolution_plan = $this->planner()->plan(
				$request,
				$current_row,
				$this->server_time_utc()
			);
		} catch ( InvalidArgumentException $exception ) {
			return $this->rejected( 'offline_conflict_resolution_conflict', array( $exception->getMessage() ), 409 );
		}

		$write_result = $this->repository->apply( $resolution_plan );

		if ( $write_result->is_applied() ) {
			return $this->ready( $write_result, 200, 'offline_conflict_resolution_applied' );
		}

		if ( $write_result->is_stale() ) {
			return $this->ready( $write_result, 409, 'offline_conflict_resolution_stale' );
		}

		return $this->rejected(
			'offline_conflict_resolution_write_failed',
			array() !== $write_result->errors()
				? $write_result->errors()
				: array( 'conflict_resolution_write_rejected' ),
			400,
			$write_result->audit_payload()
		);
	}

	private function parser(): OfflineConflictResolutionRequestParser {
		return $this->parser ?? new OfflineConflictResolutionRequestParser();
	}

	private function planner(): OfflineConflictResolutionPlanner {
		return $this->planner ?? new OfflineConflictResolutionPlanner();
	}

	/**
	 * @return array<string, mixed>
	 */
	private function validated( OfflineConflictResolutionRequest $request ): array {
		return array(
			'status'      => 'validated',
			'status_code' => 202,
			'code'        => 'offline_request_validated',
			'callback'    => 'resolve_offline_conflict',
			'data'        => array(
				'conflict_id'               => $request->conflict_id(),
				'resolution_id'             => $request->resolution_id(),
				'device_id'                 => $request->device_id(),
				'manager_id'                => $request->manager_id(),
				'resolution_action'         => $request->resolution_action(),
				'expected_conflict_version' => $request->expected_conflict_version(),
				'has_resolution_payload'    => array() !== $request->resolution_payload(),
				'schema_version'            => $request->schema_version(),
				'write_deferred'            => true,
				'route_still_gated'         => true,
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function ready(
		OfflineConflictResolutionRepositoryResult $write_result,
		int $status_code,
		string $code
	): array {
		return array(
			'status'      => $write_result->is_applied() ? 'ready' : $write_result->status(),
			'status_code' => $status_code,
			'code'        => $code,
			'callback'    => 'resolve_offline_conflict',
			'data'        => $write_result->response_payload(),
			'meta'        => array(
				'write_deferred'                   => false,
				'route_still_gated'                => true,
				'default_route_execution_deferred' => false,
				'conflict_resolution_write_status' => $write_result->status(),
				'conflict_resolution_rows_affected' => $write_result->rows_affected(),
				'audit'                            => $write_result->audit_payload(),
			),
		);
	}

	/**
	 * @param list<string>         $errors Validation or processing errors.
	 * @param array<string, mixed> $audit Optional audit payload.
	 * @return array<string, mixed>
	 */
	private function rejected( string $code, array $errors, int $status_code, array $audit = array() ): array {
		return array(
			'status'      => 'invalid',
			'status_code' => $status_code,
			'code'        => $code,
			'callback'    => 'resolve_offline_conflict',
			'errors'      => array_values( array_unique( $errors ) ),
			'meta'        => array(
				'write_deferred'                   => true,
				'route_still_gated'                => true,
				'default_route_execution_deferred' => true,
				'audit'                            => $audit,
			),
		);
	}

	private function route_conflict_id( OfflineRestRequestData $data ): string {
		$conflict_id = $data->route_param( 'conflict_id' );

		if ( null !== $conflict_id ) {
			return $conflict_id;
		}

		$body_value = $data->body_params()['conflict_id'] ?? '';

		return is_array( $body_value ) || is_object( $body_value ) ? '' : trim( (string) $body_value );
	}

	private function server_time_utc(): string {
		if ( ! is_callable( $this->server_time_provider ) ) {
			return gmdate( 'Y-m-d\TH:i:s\Z' );
		}

		return trim( (string) ( $this->server_time_provider )() );
	}
}
