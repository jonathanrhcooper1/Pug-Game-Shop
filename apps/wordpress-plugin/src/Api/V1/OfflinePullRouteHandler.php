<?php
/**
 * Staged offline pull route handler.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use InvalidArgumentException;
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
	private $server_time_provider;

	public function __construct(
		private ?OfflinePullRequestParser $parser = null,
		private ?OfflinePullResponsePresenter $presenter = null,
		?callable $change_set_provider = null,
		?callable $server_time_provider = null
	) {
		$this->change_set_provider = $change_set_provider;
		$this->server_time_provider = $server_time_provider;
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
			$response = $this->presenter()->present(
				$request,
				$this->change_sets( $request ),
				$this->server_time_utc()
			);
		} catch ( InvalidArgumentException $exception ) {
			return $this->rejected( 'offline_pull_response_invalid', array( $exception->getMessage() ) );
		} catch ( Throwable ) {
			return $this->rejected( 'offline_pull_change_provider_failed', array( 'change_set_provider_failed' ) );
		}

		return array(
			'status'      => 'ready',
			'status_code' => 200,
			'code'        => 'offline_pull_response_ready',
			'callback'    => 'pull_offline_changes',
			'data'        => $response,
			'meta'        => array(
				'query_deferred'          => true,
				'cursor_advance_deferred' => true,
				'write_deferred'          => true,
				'route_still_gated'       => true,
			),
		);
	}

	private function parser(): OfflinePullRequestParser {
		return $this->parser ?? new OfflinePullRequestParser();
	}

	private function presenter(): OfflinePullResponsePresenter {
		return $this->presenter ?? new OfflinePullResponsePresenter();
	}

	/**
	 * @return array<string, mixed>
	 */
	private function change_sets( OfflinePullRequest $request ): array {
		if ( ! is_callable( $this->change_set_provider ) ) {
			return array();
		}

		$change_sets = ( $this->change_set_provider )( $request );

		if ( ! is_array( $change_sets ) ) {
			throw new InvalidArgumentException( 'Offline pull change set provider must return an array.' );
		}

		return $change_sets;
	}

	private function server_time_utc(): string {
		if ( ! is_callable( $this->server_time_provider ) ) {
			return gmdate( 'Y-m-d\TH:i:s\Z' );
		}

		return trim( (string) ( $this->server_time_provider )() );
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
