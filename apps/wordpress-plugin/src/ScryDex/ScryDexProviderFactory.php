<?php
/**
 * ScryDex provider factory and readiness summary.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\ScryDex;

use TCGStorePlatform\Settings\ScryDexProviderSettings;
use TCGStorePlatform\Settings\Settings;

final class ScryDexProviderFactory {
	private mixed $transport;

	/**
	 * @param array<string, mixed>|null $settings Full platform settings or ScryDex settings.
	 * @param callable|null             $transport Optional test transport.
	 */
	public function __construct(
		private ?array $settings = null,
		?callable $transport = null
	) {
		$this->transport = $transport;
	}

	public static function from_settings( array $settings, ?callable $transport = null ): self {
		return new self( $settings, $transport );
	}

	public function provider(): ScryDexProvider {
		$context = ScryDexProviderSettings::provider_context( $this->settings() );

		return new ScryDexHttpProvider(
			(string) $context['api_key'],
			(string) $context['team_id'],
			(string) $context['base_url'],
			is_callable( $this->transport ) ? $this->transport : null
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	public function readiness_summary(): array {
		$status = ScryDexProviderSettings::public_status( $this->settings() );
		$issues = $status['configuration_issues'];

		return array(
			'configured'                    => true === $status['configured'],
			'status'                        => true === $status['configured'] ? 'ready' : 'blocked',
			'provider_factory_ready'        => true,
			'provider_class'                => ScryDexHttpProvider::class,
			'provider_context_ready'        => true === $status['configured'],
			'environment'                   => $status['environment'],
			'base_url'                      => $status['base_url'],
			'team_id_configured'            => true === $status['team_id_configured'],
			'primary_key_configured'        => true === $status['primary_key_configured'],
			'secondary_key_configured'      => true === $status['secondary_key_configured'],
			'active_key_slot'               => $status['active_key_slot'],
			'active_key_fingerprint'        => $status['active_key_fingerprint'],
			'credential_values_redacted'    => true,
			'network_requests_deferred'     => true,
			'database_writes_deferred'      => true,
			'scheduled_workers_deferred'    => true,
			'webhook_registration_deferred' => true,
			'configuration_issues'          => is_array( $issues ) ? array_values( $issues ) : array(),
		);
	}

	/**
	 * @return array{value:string,status:string}
	 */
	public function admin_summary(): array {
		$summary = $this->readiness_summary();

		return array(
			'value'  => sprintf(
				'%s; provider %s; team %s; active key %s; workers deferred',
				(string) $summary['environment'],
				true === $summary['provider_context_ready'] ? 'ready' : 'blocked',
				true === $summary['team_id_configured'] ? 'configured' : 'missing',
				(string) $summary['active_key_slot']
			),
			'status' => true === $summary['configured'] ? 'ready' : 'degraded',
		);
	}

	/**
	 * @return array<string, mixed>
	 */
	private function settings(): array {
		return $this->settings ?? Settings::all();
	}
}
