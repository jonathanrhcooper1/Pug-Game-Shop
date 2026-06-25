<?php
/**
 * ScryDex provider adapter contract.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

interface ScryDexProvider {
	/**
	 * @param array<string, string> $filters Provider search filters.
	 */
	public function search_cards(
		string $query = '',
		array $filters = array(),
		int $page = 1,
		string $cursor = ''
	): ScryDexResult;

	/**
	 * @param array<string, string> $filters Provider expansion filters.
	 */
	public function search_expansions(
		string $query = '',
		array $filters = array(),
		int $page = 1,
		string $cursor = ''
	): ScryDexResult;

	/**
	 * @param array<string, string> $filters Provider card filters.
	 */
	public function search_expansion_cards(
		string $expansion_id,
		string $query = '',
		array $filters = array(),
		int $page = 1,
		string $cursor = ''
	): ScryDexResult;

	public function get_card( string $provider_card_id ): ScryDexResult;

	/**
	 * @param array<string, string> $filters Provider price-history filters.
	 */
	public function get_card_price_history( string $provider_card_id, array $filters = array() ): ScryDexResult;

	public function get_usage(): ScryDexResult;

	public function register_webhook( string $event_type, string $callback_url ): ScryDexResult;
}
