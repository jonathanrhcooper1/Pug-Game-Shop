<?php
/**
 * Parser-only offline route validation handlers.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Offline\OfflineConflictListRequestParser;
use TCGStorePlatform\Offline\OfflineConflictResolutionRequestParser;
use TCGStorePlatform\Offline\OfflineDevicePairingRequestParser;
use TCGStorePlatform\Offline\OfflinePullRequestParser;
use TCGStorePlatform\Offline\OfflinePushPayloadParser;

final class OfflineRouteValidationHandlerFactory {
	private OfflineDevicePairingRequestParser $pairing_parser;
	private OfflinePullRequestParser $pull_parser;
	private OfflinePushPayloadParser $push_parser;
	private OfflineConflictListRequestParser $conflict_list_parser;
	private OfflineConflictResolutionRequestParser $conflict_resolution_parser;

	public function __construct(
		?OfflineDevicePairingRequestParser $pairing_parser = null,
		?OfflinePullRequestParser $pull_parser = null,
		?OfflinePushPayloadParser $push_parser = null,
		?OfflineConflictListRequestParser $conflict_list_parser = null,
		?OfflineConflictResolutionRequestParser $conflict_resolution_parser = null
	) {
		$this->pairing_parser             = $pairing_parser ?? new OfflineDevicePairingRequestParser();
		$this->pull_parser                = $pull_parser ?? new OfflinePullRequestParser();
		$this->push_parser                = $push_parser ?? new OfflinePushPayloadParser();
		$this->conflict_list_parser       = $conflict_list_parser ?? new OfflineConflictListRequestParser();
		$this->conflict_resolution_parser = $conflict_resolution_parser ?? new OfflineConflictResolutionRequestParser();
	}

	/**
	 * @return array<string, callable(OfflineRestRequestData): array<string, mixed>>
	 */
	public function handlers(): array {
		return array(
			'register_offline_device'  => fn ( OfflineRestRequestData $data ): array => $this->register_device( $data ),
			'pull_offline_changes'     => fn ( OfflineRestRequestData $data ): array => $this->pull_changes( $data ),
			'push_offline_operations'  => fn ( OfflineRestRequestData $data ): array => $this->push_operations( $data ),
			'list_offline_conflicts'   => fn ( OfflineRestRequestData $data ): array => $this->list_conflicts( $data ),
			'resolve_offline_conflict' => fn ( OfflineRestRequestData $data ): array => $this->resolve_conflict( $data ),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function register_device( OfflineRestRequestData $data ): array {
		$result = $this->pairing_parser->parse( $data->body_params() );

		if ( ! $result->is_valid() || null === $result->request() ) {
			return $this->rejected( 'register_offline_device', $result->errors() );
		}

		$request = $result->request();

		return $this->validated(
			'register_offline_device',
			array(
				'device_mode'       => $request->device_mode(),
				'location_id'       => $request->location_id(),
				'manager_id'        => $request->manager_id(),
				'app_version'       => $request->app_version(),
				'platform'          => $request->platform(),
				'requested_scopes'  => $request->requested_scopes(),
				'capability_count'  => count( $request->capabilities() ),
				'schema_version'    => $request->schema_version(),
				'write_deferred'    => true,
				'route_still_gated' => true,
			),
			202
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function pull_changes( OfflineRestRequestData $data ): array {
		$result = $this->pull_parser->parse( $data->body_params() );

		if ( ! $result->is_valid() || null === $result->request() ) {
			return $this->rejected( 'pull_offline_changes', $result->errors() );
		}

		$request = $result->request();

		return $this->validated(
			'pull_offline_changes',
			array(
				'device_id'          => $request->device_id(),
				'domains'            => $request->domains(),
				'cursor_count'       => count( $request->cursors() ),
				'page_size'          => $request->page_size(),
				'include_tombstones' => $request->include_tombstones(),
				'schema_version'     => $request->schema_version(),
				'write_deferred'     => true,
				'route_still_gated'  => true,
			),
			200
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function push_operations( OfflineRestRequestData $data ): array {
		$result = $this->push_parser->parse( $data->body_params(), $data->idempotency_key() );

		if ( ! $result->is_valid() || null === $result->payload() ) {
			return $this->rejected( 'push_offline_operations', $result->errors() );
		}

		$payload = $result->payload();

		return $this->validated(
			'push_offline_operations',
			array(
				'batch_id'          => $payload->batch_id(),
				'device_id'         => $payload->device_id(),
				'operation_count'   => count( $payload->operations() ),
				'write_deferred'    => true,
				'route_still_gated' => true,
			),
			202
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function list_conflicts( OfflineRestRequestData $data ): array {
		$result = $this->conflict_list_parser->parse( $this->filter_params( $data ) );

		if ( ! $result->is_valid() || null === $result->request() ) {
			return $this->rejected( 'list_offline_conflicts', $result->errors() );
		}

		$request = $result->request();

		return $this->validated(
			'list_offline_conflicts',
			array(
				'device_id'         => $request->device_id(),
				'statuses'          => $request->statuses(),
				'entity_types'      => $request->entity_types(),
				'has_cursor'        => null !== $request->cursor(),
				'page_size'         => $request->page_size(),
				'include_resolved'  => $request->include_resolved(),
				'schema_version'    => $request->schema_version(),
				'write_deferred'    => true,
				'route_still_gated' => true,
			),
			200
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function resolve_conflict( OfflineRestRequestData $data ): array {
		$result = $this->conflict_resolution_parser->parse(
			$this->route_conflict_id( $data ),
			$data->body_params(),
			$data->idempotency_key()
		);

		if ( ! $result->is_valid() || null === $result->request() ) {
			return $this->rejected( 'resolve_offline_conflict', $result->errors() );
		}

		$request = $result->request();

		return $this->validated(
			'resolve_offline_conflict',
			array(
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
			202
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function filter_params( OfflineRestRequestData $data ): array {
		return array_merge( $data->query_params(), $data->body_params() );
	}

	private function route_conflict_id( OfflineRestRequestData $data ): string {
		$conflict_id = $data->route_param( 'conflict_id' );

		if ( null !== $conflict_id ) {
			return $conflict_id;
		}

		$body_value = $data->body_params()['conflict_id'] ?? '';

		return is_array( $body_value ) || is_object( $body_value ) ? '' : trim( (string) $body_value );
	}

	/**
	 * @param array<string, mixed> $data Response data.
	 * @return array<string, mixed>
	 */
	private function validated( string $callback, array $data, int $status_code ): array {
		return array(
			'status'      => 'validated',
			'status_code' => $status_code,
			'code'        => 'offline_request_validated',
			'callback'    => $callback,
			'data'        => $data,
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
			'code'        => 'offline_request_invalid',
			'callback'    => $callback,
			'errors'      => array_values( array_unique( $errors ) ),
		);
	}
}
