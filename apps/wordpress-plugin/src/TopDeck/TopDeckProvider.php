<?php
/**
 * TopDeck provider adapter contract.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\TopDeck;

interface TopDeckProvider {
	public function get_my_tournaments(): TopDeckResult;

	public function get_tournament_info( string $tid ): TopDeckResult;

	public function get_attendees( string $tid ): TopDeckResult;

	/**
	 * @param list<string> $emails Player emails.
	 */
	public function register_players( string $tid, array $emails, bool $override_cap = false ): TopDeckResult;

	public function sync_event_from_topdeck( string $tid ): TopDeckResult;

	public function import_owned_events(): TopDeckResult;

	/**
	 * @param array<string, mixed> $event_data Event payload.
	 */
	public function create_event( array $event_data ): TopDeckResult;
}
