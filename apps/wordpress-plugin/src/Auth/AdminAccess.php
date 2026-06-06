<?php
/**
 * WordPress admin access controls.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\Auth;

final class AdminAccess {
	public function register(): void {
		add_action( 'admin_init', array( $this, 'block_kiosk_admin' ), 1 );
		add_filter( 'show_admin_bar', array( $this, 'hide_kiosk_admin_bar' ) );
	}

	public function block_kiosk_admin(): void {
		if ( ! $this->current_user_is_kiosk() ) {
			return;
		}

		if ( wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return;
		}

		wp_safe_redirect( home_url( '/' ) );
		exit;
	}

	/**
	 * @param bool $show Whether the admin bar should display.
	 */
	public function hide_kiosk_admin_bar( bool $show ): bool {
		return $this->current_user_is_kiosk() ? false : $show;
	}

	private function current_user_is_kiosk(): bool {
		$user = wp_get_current_user();

		return in_array( 'tcg_store_kiosk', (array) $user->roles, true );
	}
}
