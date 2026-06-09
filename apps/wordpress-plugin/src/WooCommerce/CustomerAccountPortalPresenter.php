<?php
/**
 * Presents customer-safe WooCommerce account portal data.
 *
 * @package TCGStorePlatform
 */

namespace TCGStorePlatform\WooCommerce;

final class CustomerAccountPortalPresenter {
	public const DEFAULT_LEDGER_LIMIT = 12;
	public const DEFAULT_ORDER_LIMIT  = 10;

	/**
	 * @param array<string, mixed>|null  $customer       Platform customer row matched to the logged-in WordPress user.
	 * @param list<array<string, mixed>> $ledger_entries Recent customer credit ledger rows.
	 * @param list<array<string, mixed>> $orders         WooCommerce order snapshots.
	 * @param array<string, mixed>       $context        Runtime flags.
	 * @return array<string, mixed>
	 */
	public function present(
		?array $customer,
		array $ledger_entries,
		array $orders,
		array $context = array()
	): array {
		$currency = $this->currency( $customer['credit_currency'] ?? $context['currency'] ?? 'USD' );
		$branding = $this->present_branding( $context['branding'] ?? array() );
		$links    = $this->present_links( $context['links'] ?? array(), $branding );

		return array(
			'resource'         => 'customer_account_portal',
			'brand'            => $branding,
			'links'            => $links,
			'customer_linked'  => null !== $customer,
			'customer'         => $this->present_customer( $customer ),
			'store_credit'     => array(
				'available'      => null !== $customer,
				'balance'        => $this->money( $customer['credit_balance'] ?? '0.0000' ),
				'currency'       => $currency,
				'version'        => $this->nonnegative_int( $customer['credit_version'] ?? 0 ),
				'display'        => $this->display_money( $customer['credit_balance'] ?? '0.0000', $currency ),
				'ledger_entries' => array_map(
					fn ( array $entry ): array => $this->present_ledger_entry( $entry, $currency ),
					array_slice( $ledger_entries, 0, self::DEFAULT_LEDGER_LIMIT )
				),
			),
			'purchase_history' => array(
				'woocommerce_available' => (bool) ( $context['woocommerce_orders_available'] ?? true ),
				'orders'                => array_map(
					fn ( array $order ): array => $this->present_order( $order, $currency ),
					array_slice( $orders, 0, self::DEFAULT_ORDER_LIMIT )
				),
			),
			'notices'          => $this->notices( $customer, $orders, $context ),
		);
	}

	/**
	 * Render customer-safe account portal HTML for a WooCommerce My Account endpoint.
	 *
	 * @param array<string, mixed> $portal Presented portal payload.
	 */
	public function render_html( array $portal ): string {
		$brand    = is_array( $portal['brand'] ?? null ) ? $portal['brand'] : array();
		$links    = is_array( $portal['links'] ?? null ) ? $portal['links'] : array();
		$customer = is_array( $portal['customer'] ?? null ) ? $portal['customer'] : array();
		$credit   = is_array( $portal['store_credit'] ?? null ) ? $portal['store_credit'] : array();
		$orders   = is_array( $portal['purchase_history']['orders'] ?? null )
			? $portal['purchase_history']['orders']
			: array();
		$notices  = is_array( $portal['notices'] ?? null ) ? $portal['notices'] : array();

		$html  = '<div class="tcg-account-portal" data-resource="' . $this->esc_attr( (string) ( $portal['resource'] ?? 'customer_account_portal' ) ) . '">';
		$html .= '<section class="tcg-account-portal__hero">';
		$html .= '<div class="tcg-account-portal__brand-lockup">';
		$html .= $this->brand_mark_html( $brand );
		$html .= '<div>';
		$html .= '<p class="tcg-account-portal__eyebrow">' . $this->esc_html( (string) ( $brand['short_name'] ?? 'The Pug' ) ) . '</p>';
		$html .= '<h2>' . $this->esc_html( (string) ( $brand['headline'] ?? 'Collector Vault' ) ) . '</h2>';
		$html .= '<p>' . $this->esc_html( $this->welcome_message( $customer ) ) . '</p>';
		$html .= '</div></div>';
		$html .= '<div class="tcg-account-portal__hero-actions">';
		$html .= $this->action_link_html( $links['shop_url'] ?? null, 'Browse inventory', 'tcg-account-portal__button' );
		$html .= $this->action_link_html( $links['orders_url'] ?? null, 'All orders', 'tcg-account-portal__button tcg-account-portal__button--secondary' );
		$html .= '</div>';
		$html .= '</section>';

		if ( ! (bool) ( $portal['customer_linked'] ?? false ) ) {
			$html .= '<p class="tcg-account-portal__notice tcg-account-portal__notice--warning">';
			$html .= $this->esc_html( 'We could not match this website login to a store customer record yet.' );
			$html .= '</p>';
		}

		if ( in_array( 'woocommerce_orders_unavailable', $notices, true ) ) {
			$html .= '<p class="tcg-account-portal__notice tcg-account-portal__notice--warning">';
			$html .= $this->esc_html( 'Order history is temporarily unavailable.' );
			$html .= '</p>';
		}

		$html .= '<section class="tcg-account-portal__summary" aria-label="' . $this->esc_attr( 'Account summary' ) . '">';
		$html .= '<article class="tcg-account-portal__metric tcg-account-portal__metric--credit">';
		$html .= '<span>' . $this->esc_html( 'Store credit' ) . '</span>';
		$html .= '<strong>' . $this->esc_html( (string) ( $credit['display'] ?? $this->display_money( $credit['balance'] ?? '0.0000', $credit['currency'] ?? 'USD' ) ) ) . '</strong>';
		$html .= '<small>' . $this->esc_html( 'Available balance' ) . '</small>';
		$html .= '</article>';
		$html .= '<article class="tcg-account-portal__metric">';
		$html .= '<span>' . $this->esc_html( 'Card orders' ) . '</span>';
		$html .= '<strong>' . $this->esc_html( (string) count( $orders ) ) . '</strong>';
		$html .= '<small>' . $this->esc_html( 'Recent purchases' ) . '</small>';
		$html .= '</article>';
		$html .= '<article class="tcg-account-portal__metric">';
		$html .= '<span>' . $this->esc_html( 'Account' ) . '</span>';
		$html .= '<strong>' . $this->esc_html( (bool) ( $portal['customer_linked'] ?? false ) ? 'Linked' : 'Needs link' ) . '</strong>';
		$html .= '<small>' . $this->esc_html( (string) ( $customer['status'] ?? 'unlinked' ) ) . '</small>';
		$html .= '</article>';
		$html .= '</section>';

		$html .= '<div class="tcg-account-portal__grid">';
		$html .= '<section class="tcg-account-portal__section tcg-account-portal__credit">';
		$html .= '<div class="tcg-account-portal__section-heading">';
		$html .= '<h3>' . $this->esc_html( 'Store Credit Activity' ) . '</h3>';
		$html .= '<p>' . $this->esc_html( 'Recent account ledger entries' ) . '</p>';
		$html .= '</div>';

		$ledger_entries = is_array( $credit['ledger_entries'] ?? null ) ? $credit['ledger_entries'] : array();
		if ( array() === $ledger_entries ) {
			$html .= $this->empty_state_html( 'No store credit activity is available yet.' );
		} else {
			$html .= '<table class="shop_table shop_table_responsive tcg-account-portal__ledger">';
			$html .= '<thead><tr>';
			$html .= '<th>' . $this->esc_html( 'Date' ) . '</th>';
			$html .= '<th>' . $this->esc_html( 'Activity' ) . '</th>';
			$html .= '<th>' . $this->esc_html( 'Amount' ) . '</th>';
			$html .= '<th>' . $this->esc_html( 'Balance' ) . '</th>';
			$html .= '</tr></thead><tbody>';

			foreach ( $ledger_entries as $entry ) {
				if ( ! is_array( $entry ) ) {
					continue;
				}

				$html .= '<tr>';
				$html .= '<td>' . $this->esc_html( $entry['created_at'] ?? '' ) . '</td>';
				$html .= '<td><span class="tcg-account-portal__badge tcg-account-portal__badge--' . $this->esc_attr( (string) ( $entry['direction'] ?? 'credit' ) ) . '">';
				$html .= $this->esc_html( $entry['label'] ?? '' );
				$html .= '</span></td>';
				$html .= '<td class="tcg-account-portal__money">' . $this->esc_html( $this->display_money( $entry['amount'] ?? '0.0000', $entry['currency'] ?? 'USD' ) ) . '</td>';
				$html .= '<td>' . $this->esc_html( $this->display_money( $entry['balance_after'] ?? '0.0000', $entry['currency'] ?? 'USD' ) ) . '</td>';
				$html .= '</tr>';
			}

			$html .= '</tbody></table>';
		}

		$html .= '</section>';
		$html .= '<section class="tcg-account-portal__section tcg-account-portal__orders">';
		$html .= '<div class="tcg-account-portal__section-heading">';
		$html .= '<h3>' . $this->esc_html( 'Card Purchase History' ) . '</h3>';
		$html .= '<p>' . $this->esc_html( 'Recent WooCommerce card orders' ) . '</p>';
		$html .= '</div>';

		if ( array() === $orders ) {
			$html .= $this->empty_state_html( 'No card purchase history is available yet.' );
		} else {
			$html .= '<div class="tcg-account-portal__order-list">';

			foreach ( $orders as $order ) {
				if ( ! is_array( $order ) ) {
					continue;
				}

				$html .= '<article class="tcg-account-portal__order">';
				$html .= '<div class="tcg-account-portal__order-header">';
				$html .= '<div><h4>' . $this->esc_html( 'Order ' . (string) ( $order['order_number'] ?? '' ) ) . '</h4>';
				$html .= '<p>' . $this->esc_html( (string) ( $order['created_at'] ?? '' ) ) . '</p></div>';
				$html .= '<span class="tcg-account-portal__badge">' . $this->esc_html( (string) ( $order['status_label'] ?? '' ) ) . '</span>';
				$html .= '</div>';
				$html .= '<p class="tcg-account-portal__order-total">' . $this->esc_html( $this->display_money( $order['total'] ?? '0.0000', $order['currency'] ?? 'USD' ) ) . '</p>';

				$lines = is_array( $order['lines'] ?? null ) ? $order['lines'] : array();
				if ( array() !== $lines ) {
					$html .= '<ul class="tcg-account-portal__card-lines">';
					foreach ( $lines as $line ) {
						if ( ! is_array( $line ) ) {
							continue;
						}

						$details = array_filter(
							array(
								(string) ( $line['condition_label'] ?? '' ),
								(string) ( $line['set_name'] ?? '' ),
								(string) ( $line['card_number'] ?? '' ),
							)
						);

						$html .= '<li>';
						$html .= '<span class="tcg-account-portal__card-name">' . $this->esc_html( (string) ( $line['name'] ?? '' ) ) . '</span>';
						$html .= '<span class="tcg-account-portal__quantity">x' . $this->esc_html( (string) ( $line['quantity'] ?? 1 ) ) . '</span>';

						if ( array() !== $details ) {
							$html .= ' <span class="tcg-account-portal__line-details">';
							$html .= $this->esc_html( implode( ' - ', $details ) );
							$html .= '</span>';
						}

						$html .= '</li>';
					}
					$html .= '</ul>';
				}

				if ( '' !== (string) ( $order['view_url'] ?? '' ) ) {
					$html .= '<p><a class="tcg-account-portal__text-link" href="' . $this->esc_url( (string) $order['view_url'] ) . '">';
					$html .= $this->esc_html( 'View order' );
					$html .= '</a></p>';
				}

				$html .= '</article>';
			}

			$html .= '</div>';
		}

		$html .= '</section>';
		$html .= '</div>';
		$html .= '</div>';

		return $html;
	}

	/**
	 * @param array<string, mixed>|null $customer Platform customer row.
	 * @return array<string, mixed>
	 */
	private function present_customer( ?array $customer ): array {
		if ( null === $customer ) {
			return array(
				'display_name' => '',
				'status'       => 'unlinked',
			);
		}

		return array(
			'customer_id'  => $this->positive_int( $customer['customer_id'] ?? null ),
			'public_id'    => $this->nullable_string( $customer['public_id'] ?? null ),
			'display_name' => $this->clean_string( $customer['display_name'] ?? '' ),
			'status'       => $this->clean_string( $customer['status'] ?? 'active' ),
		);
	}

	/**
	 * @param array<string, mixed> $entry Ledger row.
	 * @return array<string, mixed>
	 */
	private function present_ledger_entry( array $entry, string $fallback_currency ): array {
		$amount = $this->money( $entry['amount'] ?? '0.0000' );

		return array(
			'public_id'     => $this->nullable_string( $entry['public_id'] ?? null ),
			'entry_type'    => $this->clean_string( $entry['entry_type'] ?? '' ),
			'label'         => $this->entry_label( $entry['entry_type'] ?? '' ),
			'amount'        => $amount,
			'currency'      => $this->currency( $entry['currency'] ?? $fallback_currency ),
			'direction'     => str_starts_with( $amount, '-' ) ? 'debit' : 'credit',
			'balance_after' => $this->money( $entry['balance_after'] ?? '0.0000' ),
			'order_id'      => $this->nullable_positive_int( $entry['order_id'] ?? null ),
			'reason'        => $this->nullable_string( $entry['reason'] ?? null ),
			'created_at'    => $this->nullable_string( $entry['created_at'] ?? null ),
		);
	}

	/**
	 * @param array<string, mixed> $order Order snapshot.
	 * @return array<string, mixed>
	 */
	private function present_order( array $order, string $fallback_currency ): array {
		$currency = $this->currency( $order['currency'] ?? $fallback_currency );

		return array(
			'order_id'     => $this->positive_int( $order['order_id'] ?? null ),
			'order_number' => $this->clean_string( $order['order_number'] ?? $order['order_id'] ?? '' ),
			'status'       => $this->clean_string( $order['status'] ?? '' ),
			'status_label' => $this->clean_string( $order['status_label'] ?? $order['status'] ?? '' ),
			'created_at'   => $this->nullable_string( $order['created_at'] ?? null ),
			'total'        => $this->money( $order['total'] ?? '0.0000' ),
			'currency'     => $currency,
			'item_count'   => $this->nonnegative_int( $order['item_count'] ?? 0 ),
			'view_url'     => $this->nullable_string( $order['view_url'] ?? null ),
			'lines'        => array_map(
				fn ( array $line ): array => $this->present_order_line( $line, $currency ),
				is_array( $order['lines'] ?? null ) ? $order['lines'] : array()
			),
		);
	}

	/**
	 * @param array<string, mixed> $line Order line snapshot.
	 * @return array<string, mixed>
	 */
	private function present_order_line( array $line, string $currency ): array {
		$condition = strtoupper( $this->clean_string( $line['condition_code'] ?? '' ) );

		return array(
			'name'            => $this->clean_string( $line['card_name'] ?? $line['name'] ?? '' ),
			'quantity'        => max( 1, $this->nonnegative_int( $line['quantity'] ?? 1 ) ),
			'total'           => $this->money( $line['total'] ?? '0.0000' ),
			'currency'        => $this->currency( $line['currency'] ?? $currency ),
			'is_serialized'   => (bool) ( $line['is_serialized'] ?? false ),
			'inventory_id'    => $this->nullable_positive_int( $line['inventory_id'] ?? null ),
			'condition_code'  => '' === $condition ? null : $condition,
			'condition_label' => $this->condition_label( $condition ),
			'set_name'        => $this->nullable_string( $line['set_name'] ?? null ),
			'card_number'     => $this->nullable_string( $line['card_number'] ?? null ),
		);
	}

	/**
	 * @param mixed $branding Client-safe branding payload.
	 * @return array<string, string>
	 */
	private function present_branding( mixed $branding ): array {
		$branding = is_array( $branding ) ? $branding : array();
		$company  = is_array( $branding['company'] ?? null ) ? $branding['company'] : array();

		$name       = $this->clean_string( $company['name'] ?? 'The Pug' );
		$short_name = $this->clean_string( $company['short_name'] ?? 'The Pug' );

		return array(
			'name'        => '' === $name ? 'The Pug' : $name,
			'short_name'  => '' === $short_name ? 'The Pug' : $short_name,
			'headline'    => ( '' === $short_name ? 'The Pug' : $short_name ) . ' Collector Vault',
			'logo_url'    => $this->nullable_string( $company['logo_url'] ?? null ) ?? '',
			'support_url' => $this->nullable_string( $company['support_url'] ?? null ) ?? '',
		);
	}

	/**
	 * @param mixed                $links Submitted links.
	 * @param array<string,string> $branding Presented branding.
	 * @return array<string, string|null>
	 */
	private function present_links( mixed $links, array $branding ): array {
		$links = is_array( $links ) ? $links : array();

		return array(
			'shop_url'    => $this->nullable_url( $links['shop_url'] ?? null ),
			'orders_url'  => $this->nullable_url( $links['orders_url'] ?? null ),
			'support_url' => $this->nullable_url( $links['support_url'] ?? $branding['support_url'] ?? null ),
		);
	}

	/**
	 * @param array<string, mixed>       $context Runtime flags.
	 * @param list<array<string, mixed>> $orders WooCommerce order snapshots.
	 * @return list<string>
	 */
	private function notices( ?array $customer, array $orders, array $context ): array {
		$notices = array();

		if ( null === $customer ) {
			$notices[] = 'customer_record_not_linked';
		}

		if ( ! (bool) ( $context['woocommerce_orders_available'] ?? true ) ) {
			$notices[] = 'woocommerce_orders_unavailable';
		}

		if ( array() === $orders ) {
			$notices[] = 'no_purchase_history';
		}

		return $notices;
	}

	private function entry_label( mixed $entry_type ): string {
		return match ( $this->clean_string( $entry_type ) ) {
			'buylist_credit'      => 'Buylist credit',
			'purchase_redemption' => 'Store credit used',
			'refund_credit'       => 'Refund credit',
			'manual_add'          => 'Credit adjustment',
			'manual_subtract'     => 'Credit adjustment',
			'correction'          => 'Correction',
			'void'                => 'Voided credit activity',
			'transfer_in'         => 'Credit transfer',
			'transfer_out'        => 'Credit transfer',
			default               => 'Store credit activity',
		};
	}

	private function condition_label( string $condition ): ?string {
		if ( '' === $condition ) {
			return null;
		}

		return match ( $condition ) {
			'NM'    => 'Near Mint',
			'LP'    => 'Lightly Played',
			'MP'    => 'Moderately Played',
			'HP'    => 'Heavily Played',
			'DMG'   => 'Damaged',
			default => $condition,
		};
	}

	/**
	 * @param array<string,mixed> $customer Presented customer row.
	 */
	private function welcome_message( array $customer ): string {
		$name = $this->clean_string( $customer['display_name'] ?? '' );

		if ( '' === $name ) {
			return 'Your account snapshot is ready.';
		}

		return 'Welcome back, ' . $name . '.';
	}

	/**
	 * @param array<string,string> $brand Presented branding.
	 */
	private function brand_mark_html( array $brand ): string {
		$logo_url = $this->nullable_url( $brand['logo_url'] ?? null );

		if ( null !== $logo_url ) {
			return '<img class="tcg-account-portal__logo" src="' . $this->esc_url( $logo_url ) . '" alt="' . $this->esc_attr( (string) ( $brand['name'] ?? 'Store' ) ) . '" />';
		}

		$initials = $this->initials( (string) ( $brand['short_name'] ?? $brand['name'] ?? 'The Pug' ) );

		return '<span class="tcg-account-portal__mark" aria-hidden="true">' . $this->esc_html( $initials ) . '</span>';
	}

	private function action_link_html( mixed $url, string $label, string $class_name ): string {
		$url = $this->nullable_url( $url );

		if ( null === $url ) {
			return '';
		}

		return '<a class="' . $this->esc_attr( $class_name ) . '" href="' . $this->esc_url( $url ) . '">' . $this->esc_html( $label ) . '</a>';
	}

	private function empty_state_html( string $message ): string {
		return '<div class="tcg-account-portal__empty"><span aria-hidden="true">--</span><p>' . $this->esc_html( $message ) . '</p></div>';
	}

	private function initials( string $value ): string {
		$parts    = array_filter( explode( ' ', $this->clean_string( $value ) ) );
		$initials = '';

		foreach ( $parts as $part ) {
			$initials .= strtoupper( substr( $part, 0, 1 ) );

			if ( strlen( $initials ) >= 2 ) {
				break;
			}
		}

		return '' === $initials ? 'TP' : $initials;
	}

	private function display_money( mixed $amount, mixed $currency ): string {
		return $this->money( $amount ) . ' ' . $this->currency( $currency );
	}

	private function money( mixed $value ): string {
		$value = $this->clean_string( $value );

		if ( 1 !== preg_match( '/^-?\d+(?:\.\d+)?$/', $value ) ) {
			return '0.00';
		}

		return number_format( (float) $value, 2, '.', '' );
	}

	private function currency( mixed $value ): string {
		$value = strtoupper( $this->clean_string( $value ) );

		return 1 === preg_match( '/^[A-Z]{3}$/', $value ) ? $value : 'USD';
	}

	private function positive_int( mixed $value ): int {
		return max( 0, (int) $value );
	}

	private function nullable_positive_int( mixed $value ): ?int {
		if ( null === $value || '' === $value ) {
			return null;
		}

		$value = (int) $value;

		return $value > 0 ? $value : null;
	}

	private function nonnegative_int( mixed $value ): int {
		return max( 0, (int) $value );
	}

	private function clean_string( mixed $value ): string {
		return trim( preg_replace( '/\s+/', ' ', (string) $value ) ?? '' );
	}

	private function nullable_string( mixed $value ): ?string {
		$value = $this->clean_string( $value ?? '' );

		return '' === $value ? null : $value;
	}

	private function nullable_url( mixed $value ): ?string {
		$value = $this->clean_string( $value ?? '' );

		if ( '' === $value || false === filter_var( $value, FILTER_VALIDATE_URL ) ) {
			return null;
		}

		return $value;
	}

	private function esc_attr( mixed $value ): string {
		$value = (string) $value;

		if ( function_exists( 'esc_attr' ) ) {
			return esc_attr( $value );
		}

		return htmlspecialchars( $value, ENT_QUOTES, 'UTF-8' );
	}

	private function esc_html( mixed $value ): string {
		$value = (string) $value;

		if ( function_exists( 'esc_html' ) ) {
			return esc_html( $value );
		}

		return htmlspecialchars( $value, ENT_QUOTES, 'UTF-8' );
	}

	private function esc_url( mixed $value ): string {
		$value = (string) $value;

		if ( function_exists( 'esc_url' ) ) {
			return esc_url( $value );
		}

		return htmlspecialchars( $value, ENT_QUOTES, 'UTF-8' );
	}
}
