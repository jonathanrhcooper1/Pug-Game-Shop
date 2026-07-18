<?php
/**
 * Staff customer credit REST write endpoints.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Api\V1;

use TCGStorePlatform\Credit\CustomerCreditEntryType;
use TCGStorePlatform\Credit\CustomerCreditLedgerRepository;
use TCGStorePlatform\Credit\CustomerCreditLedgerService;
use TCGStorePlatform\Credit\CustomerCreditRestPostingParser;
use TCGStorePlatform\Credit\CustomerCreditRestPresenter;

final class CustomerCreditController {
	private const NAMESPACE = 'tcg-store/v1';

	public function register(): void {
		add_action( 'rest_api_init', array( $this, 'register_routes' ), 24 );
	}

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/customers/(?P<customer_id>\d+)/credit/adjust',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'adjust_customer_credit' ),
				'permission_callback' => array( $this, 'can_adjust_credit' ),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/customers/(?P<customer_id>\d+)/credit/redeem',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'redeem_customer_credit' ),
				'permission_callback' => array( $this, 'can_redeem_credit' ),
			)
		);
	}

	public function can_adjust_credit(): bool {
		return function_exists( 'current_user_can' ) && current_user_can( 'adjust_credit' );
	}

	public function can_redeem_credit(): bool {
		return function_exists( 'current_user_can' ) && current_user_can( 'redeem_credit' );
	}

	public function adjust_customer_credit( \WP_REST_Request $request ): \WP_REST_Response {
		$payload = $this->request_payload( $request );
		$amount  = (string) ( $payload['amount'] ?? '' );

		$payload['entry_type'] = $this->adjustment_entry_type( $amount );
		$payload['manager_user_id'] = $payload['manager_user_id'] ?? $this->current_user_id();

		return $this->post_credit( $request, $payload, 'adjust_credit' );
	}

	public function redeem_customer_credit( \WP_REST_Request $request ): \WP_REST_Response {
		$payload               = $this->request_payload( $request );
		$payload['entry_type'] = CustomerCreditEntryType::PURCHASE_REDEMPTION;
		$payload['amount']     = $this->negative_amount( $payload['amount'] ?? '' );

		return $this->post_credit( $request, $payload, 'redeem_credit' );
	}

	/**
	 * @param array<string, mixed> $payload Request payload.
	 */
	private function post_credit( \WP_REST_Request $request, array $payload, string $action ): \WP_REST_Response {
		$customer_id = max( 0, (int) $request->get_param( 'customer_id' ) );
		$validation  = ( new CustomerCreditRestPostingParser() )->parse(
			$customer_id,
			$this->enrich_payload( $payload, $request, $action ),
			(string) $request->get_header( 'idempotency-key' ),
			$this->current_user_id()
		);

		if ( ! $validation->is_valid() ) {
			return new \WP_REST_Response(
				CustomerCreditRestPresenter::present_validation_errors( $validation ),
				400
			);
		}

		$posting_request = $validation->request();
		if ( null === $posting_request ) {
			return new \WP_REST_Response(
				CustomerCreditRestPresenter::present_validation_errors( $validation ),
				400
			);
		}

		$result          = $this->ledger_service()->post( $posting_request );
		$status_code     = $result->is_accepted() ? ( $result->is_idempotent() ? 200 : 201 ) : 409;

		return new \WP_REST_Response(
			CustomerCreditRestPresenter::present_posting_result(
				$result,
				$customer_id,
				$posting_request->currency()
			),
			$status_code
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function request_payload( \WP_REST_Request $request ): array {
		$payload = $request->get_json_params();

		if ( ! is_array( $payload ) ) {
			$payload = $request->get_body_params();
		}

		return is_array( $payload ) ? $payload : array();
	}

	/**
	 * @param array<string, mixed> $payload Request payload.
	 * @return array<string, mixed>
	 */
	private function enrich_payload( array $payload, \WP_REST_Request $request, string $action ): array {
		$metadata = $payload['metadata'] ?? array();

		if ( ! is_array( $metadata ) ) {
			$metadata = array();
		}

		$metadata['source'] = $metadata['source'] ?? 'rest_api';
		$metadata['action'] = $action;

		$payload['metadata'] = $metadata;

		if ( ! isset( $payload['offline_operation_id'] ) || '' === trim( (string) $payload['offline_operation_id'] ) ) {
			$payload['offline_operation_id'] = (string) $request->get_header( 'idempotency-key' );
		}

		return $payload;
	}

	private function adjustment_entry_type( string $amount ): string {
		return str_starts_with( trim( $amount ), '-' )
			? CustomerCreditEntryType::MANUAL_SUBTRACT
			: CustomerCreditEntryType::MANUAL_ADD;
	}

	private function negative_amount( mixed $amount ): string {
		$value = trim( (string) $amount );

		if ( '' === $value ) {
			return '';
		}

		return str_starts_with( $value, '-' ) ? $value : '-' . $value;
	}

	private function current_user_id(): ?int {
		if ( function_exists( 'get_current_user_id' ) ) {
			$user_id = (int) get_current_user_id();

			return $user_id > 0 ? $user_id : null;
		}

		return null;
	}

	private function ledger_service(): CustomerCreditLedgerService {
		global $wpdb;

		return new CustomerCreditLedgerService( new CustomerCreditLedgerRepository( $wpdb ) );
	}
}
