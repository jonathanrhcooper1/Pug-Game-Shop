<?php
/**
 * Staged offline push route handler.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use InvalidArgumentException;
use TCGStorePlatform\Offline\OfflinePushPayload;
use TCGStorePlatform\Offline\OfflinePushPayloadParser;
use Throwable;

final class OfflinePushRouteHandler {
	/**
	 * @var callable|null
	 */
	private $processing_provider;

	public function __construct(
		private ?OfflinePushPayloadParser $parser = null,
		?callable $processing_provider = null
	) {
		$this->processing_provider = $processing_provider;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function handle( OfflineRestRequestData $data ): array {
		$result = $this->parser()->parse( $data->body_params(), $data->idempotency_key() );

		if ( ! $result->is_valid() || null === $result->payload() ) {
			return $this->rejected( 'offline_request_invalid', $result->errors() );
		}

		$payload = $result->payload();

		if ( ! is_callable( $this->processing_provider ) ) {
			return $this->validated( $payload );
		}

		try {
			$route_result = ( $this->processing_provider )( $payload, $data );
		} catch ( InvalidArgumentException $exception ) {
			return $this->rejected( 'offline_push_processing_invalid', array( $exception->getMessage() ) );
		} catch ( Throwable ) {
			return $this->rejected( 'offline_push_processing_failed', array( 'push_processing_provider_failed' ) );
		}

		if ( ! $route_result instanceof OfflinePushRouteProcessingResult ) {
			return $this->rejected(
				'offline_push_processing_invalid',
				array( 'push_processing_provider_result_invalid' )
			);
		}

		$persistence = $route_result->persistence_result();

		if ( $persistence->is_rejected() ) {
			return $this->rejected(
				'offline_push_persistence_failed',
				array() !== $persistence->errors()
					? $persistence->errors()
					: array( 'push_persistence_rejected' )
			);
		}

		return array(
			'status'      => 'ready',
			'status_code' => 202,
			'code'        => 'offline_push_response_ready',
			'callback'    => 'push_offline_operations',
			'data'        => $route_result->response_payload(),
			'meta'        => $this->ready_meta( $route_result ),
		);
	}

	private function parser(): OfflinePushPayloadParser {
		return $this->parser ?? new OfflinePushPayloadParser();
	}

	/**
	 * @return array<string, mixed>
	 */
	private function validated( OfflinePushPayload $payload ): array {
		return array(
			'status'      => 'validated',
			'status_code' => 202,
			'code'        => 'offline_request_validated',
			'callback'    => 'push_offline_operations',
			'data'        => array(
				'batch_id'                           => $payload->batch_id(),
				'device_id'                          => $payload->device_id(),
				'operation_count'                    => count( $payload->operations() ),
				'write_deferred'                     => true,
				'route_still_gated'                  => true,
				'push_resolution_deferred'           => true,
				'push_queue_persistence_deferred'    => true,
				'push_conflict_persistence_deferred' => true,
				'push_queue_replay_deferred'         => true,
				'push_canonical_mutations_deferred'  => true,
			),
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function ready_meta( OfflinePushRouteProcessingResult $route_result ): array {
		$persistence = $route_result->persistence_result();

		return array(
			'push_resolution_deferred'           => false,
			'push_queue_persistence_deferred'    => false,
			'push_conflict_persistence_deferred' => false,
			'push_queue_replay_deferred'         => true,
			'push_canonical_mutations_deferred'  => true,
			'route_still_gated'                  => true,
			'default_route_execution_deferred'   => true,
			'route_registration_deferred'        => true,
			'write_deferred'                     => false,
			'persistence_attempted'              => true,
			'persistence_status'                 => $persistence->status(),
			'persistence_rows_affected'          => $persistence->rows_affected(),
			'operation_rows_affected'            => $persistence->operation_rows_affected(),
			'conflict_rows_affected'             => $persistence->conflict_rows_affected(),
			'audit'                              => $route_result->audit_payload(),
		);
	}

	/**
	 * @param list<string> $errors Validation or processing errors.
	 * @return array<string, mixed>
	 */
	private function rejected( string $code, array $errors ): array {
		return array(
			'status'      => 'invalid',
			'status_code' => 400,
			'code'        => $code,
			'callback'    => 'push_offline_operations',
			'errors'      => array_values( array_unique( $errors ) ),
			'meta'        => array(
				'push_resolution_deferred'           => true,
				'push_queue_persistence_deferred'    => true,
				'push_conflict_persistence_deferred' => true,
				'push_queue_replay_deferred'         => true,
				'push_canonical_mutations_deferred'  => true,
				'write_deferred'                     => true,
				'route_still_gated'                  => true,
			),
		);
	}
}
