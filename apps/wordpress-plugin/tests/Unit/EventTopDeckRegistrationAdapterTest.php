<?php
/**
 * Event TopDeck registration adapter tests.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Tests\Unit;

use TCGStorePlatform\Events\EventRegistrationStatus;
use TCGStorePlatform\Events\EventTopDeckRegistrationAdapter;
use TCGStorePlatform\Tests\TestCase;
use TCGStorePlatform\TopDeck\TopDeckProvider;
use TCGStorePlatform\TopDeck\TopDeckResult;

final class EventTopDeckRegistrationAdapterTest extends TestCase {
	public function test_adapter_pushes_topdeck_email_and_maps_registered_result(): void {
		$provider = new RecordingTopDeckProvider(
			new TopDeckResult(
				TopDeckResult::REGISTERED,
				200,
				array(
					'result' => 'registered',
					'email'  => 'morgan+topdeck@example.test',
				)
			)
		);
		$result   = ( new EventTopDeckRegistrationAdapter( $provider ) )->push(
			$this->event(),
			array(
				'email'         => 'morgan@example.test',
				'topdeck_email' => ' Morgan+TopDeck@example.test ',
			),
			true
		);

		$this->assert_true( $result->is_success() );
		$this->assert_same( EventRegistrationStatus::REGISTERED_TOPDECK, $result->local_status() );
		$this->assert_same( TopDeckResult::REGISTERED, $result->provider_status() );
		$this->assert_same( 'td-dev-1001', $provider->last_tid );
		$this->assert_same( array( 'morgan+topdeck@example.test' ), $provider->last_emails );
		$this->assert_true( $provider->last_override_cap );
	}

	public function test_adapter_falls_back_to_customer_email(): void {
		$provider = new RecordingTopDeckProvider(
			new TopDeckResult( TopDeckResult::PENDING_INVITATION, 202, array( 'result' => 'pending_invitation' ) )
		);
		$result   = ( new EventTopDeckRegistrationAdapter( $provider ) )->push(
			$this->event(),
			array(
				'email' => ' Customer@example.test ',
			)
		);

		$this->assert_true( $result->is_success() );
		$this->assert_same( EventRegistrationStatus::PENDING_TOPDECK_INVITE, $result->local_status() );
		$this->assert_same( array( 'customer@example.test' ), $provider->last_emails );
	}

	public function test_capacity_conflict_maps_to_explicit_local_status_without_retry(): void {
		$provider = new RecordingTopDeckProvider(
			new TopDeckResult(
				TopDeckResult::CAPACITY_CONFLICT,
				409,
				array( 'result' => 'capacity_conflict' ),
				'topdeck_capacity_conflict',
				'Tournament is full.'
			)
		);
		$result   = ( new EventTopDeckRegistrationAdapter( $provider ) )->push(
			$this->event(),
			array( 'email' => 'morgan@example.test' )
		);

		$this->assert_false( $result->is_success() );
		$this->assert_same( EventRegistrationStatus::TOPDECK_CAPACITY_CONFLICT, $result->local_status() );
		$this->assert_false( $result->should_retry() );
	}

	public function test_missing_tid_or_email_does_not_call_provider(): void {
		$provider = new RecordingTopDeckProvider( new TopDeckResult( TopDeckResult::REGISTERED, 200 ) );
		$result   = ( new EventTopDeckRegistrationAdapter( $provider ) )->push(
			array( 'topdeck_tid' => '' ),
			array( 'email' => 'morgan@example.test' )
		);

		$this->assert_false( $result->is_success() );
		$this->assert_same( EventRegistrationStatus::STAFF_REVIEW_REQUIRED, $result->local_status() );
		$this->assert_same( 0, $provider->calls );

		$result = ( new EventTopDeckRegistrationAdapter( $provider ) )->push(
			$this->event(),
			array( 'email' => 'not-an-email' )
		);

		$this->assert_false( $result->is_success() );
		$this->assert_same( EventRegistrationStatus::STAFF_REVIEW_REQUIRED, $result->local_status() );
		$this->assert_same( 0, $provider->calls );
	}

	public function test_retryable_provider_failure_marks_result_for_retry(): void {
		$provider = new RecordingTopDeckProvider(
			new TopDeckResult(
				TopDeckResult::FAILED,
				503,
				array( 'result' => 'failed' ),
				'topdeck_unavailable',
				'Provider unavailable.'
			)
		);
		$result   = ( new EventTopDeckRegistrationAdapter( $provider ) )->push(
			$this->event(),
			array( 'email' => 'morgan@example.test' )
		);
		$update   = $result->to_registration_update();

		$this->assert_false( $result->is_success() );
		$this->assert_same( EventRegistrationStatus::FAILED, $result->local_status() );
		$this->assert_true( $result->should_retry() );
		$this->assert_same( true, $update['should_retry'] );
	}

	/**
	 * @return array<string, mixed>
	 */
	private function event(): array {
		return array(
			'topdeck_tid' => 'td-dev-1001',
		);
	}
}

final class RecordingTopDeckProvider implements TopDeckProvider {
	public int $calls = 0;
	public string $last_tid = '';

	/**
	 * @var list<string>
	 */
	public array $last_emails = array();
	public bool $last_override_cap = false;

	public function __construct( private TopDeckResult $result ) {
	}

	public function get_my_tournaments(): TopDeckResult {
		return TopDeckResult::not_supported( 'Not needed for this test.' );
	}

	public function get_tournament_info( string $tid ): TopDeckResult {
		unset( $tid );

		return TopDeckResult::not_supported( 'Not needed for this test.' );
	}

	public function get_attendees( string $tid ): TopDeckResult {
		unset( $tid );

		return TopDeckResult::not_supported( 'Not needed for this test.' );
	}

	public function register_players( string $tid, array $emails, bool $override_cap = false ): TopDeckResult {
		++$this->calls;
		$this->last_tid          = $tid;
		$this->last_emails       = $emails;
		$this->last_override_cap = $override_cap;

		return $this->result;
	}

	public function sync_event_from_topdeck( string $tid ): TopDeckResult {
		unset( $tid );

		return TopDeckResult::not_supported( 'Not needed for this test.' );
	}

	public function import_owned_events(): TopDeckResult {
		return TopDeckResult::not_supported( 'Not needed for this test.' );
	}

	public function create_event( array $event_data ): TopDeckResult {
		unset( $event_data );

		return TopDeckResult::not_supported( 'Not needed for this test.' );
	}
}
