<?php
/**
 * Staged offline pull route handler.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use Closure;
use InvalidArgumentException;
use ReflectionException;
use ReflectionFunction;
use ReflectionMethod;
use TCGStorePlatform\Offline\OfflinePullCursorAdvanceRepositoryResult;
use TCGStorePlatform\Offline\OfflinePullRequest;
use TCGStorePlatform\Offline\OfflinePullRequestParser;
use TCGStorePlatform\Offline\OfflinePullResponsePresenter;
use Throwable;

final class OfflinePullRouteHandler {
	/**
	 * @var callable|null
	 */
	private $change_set_provider;

	/**
	 * @var callable|null
	 */
	private $cursor_advance_provider;

	/**
	 * @var callable|null
	 */
	private $server_time_provider;

	public function __construct(
		private ?OfflinePullRequestParser $parser = null,
		private ?OfflinePullResponsePresenter $presenter = null,
		?callable $change_set_provider = null,
		?callable $server_time_provider = null,
		?callable $cursor_advance_provider = null
	) {
		$this->change_set_provider     = $change_set_provider;
		$this->server_time_provider    = $server_time_provider;
		$this->cursor_advance_provider = $cursor_advance_provider;
	}

	/**
	 * @return array<string, mixed>
	 */
	public function handle( OfflineRestRequestData $data ): array {
		$result = $this->parser()->parse( $data->body_params() );

		if ( ! $result->is_valid() || null === $result->request() ) {
			return $this->rejected( 'offline_pull_request_invalid', $result->errors() );
		}

		$request = $result->request();

		try {
			$server_time_utc = $this->server_time_utc();
			$change_sets     = $this->change_sets( $request, $data );
			$response        = $this->presenter()->present(
				$request,
				$change_sets,
				$server_time_utc
			);
		} catch ( InvalidArgumentException $exception ) {
			return $this->rejected( 'offline_pull_response_invalid', array( $exception->getMessage() ) );
		} catch ( Throwable ) {
			return $this->rejected( 'offline_pull_change_provider_failed', array( 'change_set_provider_failed' ) );
		}

		try {
			$cursor_advance = $this->advance_cursors( $request, $data, $change_sets );
		} catch ( InvalidArgumentException $exception ) {
			return $this->rejected( 'offline_pull_cursor_advance_invalid', array( $exception->getMessage() ) );
		} catch ( Throwable ) {
			return $this->rejected( 'offline_pull_cursor_advance_failed', array( 'cursor_advance_provider_failed' ) );
		}

		if ( null !== $cursor_advance && $cursor_advance->is_rejected() ) {
			return $this->rejected(
				'offline_pull_cursor_advance_failed',
				array() !== $cursor_advance->errors()
					? $cursor_advance->errors()
					: array( 'cursor_advance_rejected' )
			);
		}

		return array(
			'status'      => 'ready',
			'status_code' => 200,
			'code'        => 'offline_pull_response_ready',
			'callback'    => 'pull_offline_changes',
			'data'        => $response,
			'meta'        => $this->ready_meta( $cursor_advance ),
		);
	}

	private function parser(): OfflinePullRequestParser {
		return $this->parser ?? new OfflinePullRequestParser();
	}

	private function presenter(): OfflinePullResponsePresenter {
		return $this->presenter ?? new OfflinePullResponsePresenter();
	}

	/**
	 * @param array<string, mixed> $change_sets Provider change sets keyed by domain.
	 */
	private function advance_cursors(
		OfflinePullRequest $request,
		OfflineRestRequestData $data,
		array $change_sets
	): ?OfflinePullCursorAdvanceRepositoryResult {
		if ( ! is_callable( $this->cursor_advance_provider ) ) {
			return null;
		}

		$provider = $this->cursor_advance_provider;
		$result   = $this->provider_accepts_change_sets( $provider )
			? $provider( $request, $data, $change_sets )
			: $provider( $request, $data );

		if ( ! $result instanceof OfflinePullCursorAdvanceRepositoryResult ) {
			throw new InvalidArgumentException( 'Offline pull cursor advance provider must return a repository result.' );
		}

		return $result;
	}

	/**
	 * @return array<string, mixed>
	 */
	private function change_sets( OfflinePullRequest $request, OfflineRestRequestData $data ): array {
		if ( ! is_callable( $this->change_set_provider ) ) {
			return array();
		}

		$provider    = $this->change_set_provider;
		$change_sets = $this->provider_accepts_request_data( $provider )
			? $provider( $request, $data )
			: $provider( $request );

		if ( ! is_array( $change_sets ) ) {
			throw new InvalidArgumentException( 'Offline pull change set provider must return an array.' );
		}

		return $change_sets;
	}

	/**
	 * @param callable $provider Cursor advance provider.
	 */
	private function provider_accepts_change_sets( callable $provider ): bool {
		try {
			if ( is_array( $provider ) ) {
				$reflection = new ReflectionMethod( $provider[0], (string) $provider[1] );
			} elseif ( is_object( $provider ) && ! $provider instanceof Closure ) {
				$reflection = new ReflectionMethod( $provider, '__invoke' );
			} else {
				$reflection = new ReflectionFunction( $provider );
			}
		} catch ( ReflectionException ) {
			return false;
		}

		return $reflection->isVariadic() || 3 <= $reflection->getNumberOfParameters();
	}

	/**
	 * @param callable $provider Change set provider.
	 */
	private function provider_accepts_request_data( callable $provider ): bool {
		try {
			if ( is_array( $provider ) ) {
				$reflection = new ReflectionMethod( $provider[0], (string) $provider[1] );
			} elseif ( is_object( $provider ) && ! $provider instanceof Closure ) {
				$reflection = new ReflectionMethod( $provider, '__invoke' );
			} else {
				$reflection = new ReflectionFunction( $provider );
			}
		} catch ( ReflectionException ) {
			return false;
		}

		return $reflection->isVariadic() || 2 <= $reflection->getNumberOfParameters();
	}

	private function server_time_utc(): string {
		if ( ! is_callable( $this->server_time_provider ) ) {
			return gmdate( 'Y-m-d\TH:i:s\Z' );
		}

		return trim( (string) ( $this->server_time_provider )() );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function ready_meta( ?OfflinePullCursorAdvanceRepositoryResult $cursor_advance ): array {
		$cursor_advanced = null !== $cursor_advance && $cursor_advance->is_advanced();

		return array(
			'query_deferred'                   => true,
			'cursor_advance_deferred'          => ! $cursor_advanced,
			'write_deferred'                   => ! $cursor_advanced,
			'route_still_gated'                => true,
			'cursor_advance_attempted'         => null !== $cursor_advance,
			'cursor_advance_status'            => null !== $cursor_advance ? $cursor_advance->status() : 'deferred',
			'cursor_advance_rows_affected'     => null !== $cursor_advance ? $cursor_advance->rows_affected() : 0,
			'cursor_advance_audit'             => null !== $cursor_advance ? $cursor_advance->audit_payload() : array(),
			'default_route_execution_deferred' => true,
		);
	}

	/**
	 * @param list<string> $errors Validation errors.
	 * @return array<string, mixed>
	 */
	private function rejected( string $code, array $errors ): array {
		return array(
			'status'      => 'invalid',
			'status_code' => 400,
			'code'        => $code,
			'callback'    => 'pull_offline_changes',
			'errors'      => array_values( array_unique( $errors ) ),
			'meta'        => array(
				'query_deferred'          => true,
				'cursor_advance_deferred' => true,
				'write_deferred'          => true,
				'route_still_gated'       => true,
			),
		);
	}
}
