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

		return array(
			'resource'         => 'customer_account_portal',
			'customer_linked'  => null !== $customer,
			'customer'         => $this->present_customer( $customer ),
			'store_credit'     => array(
				'available'      => null !== $customer,
				'balance'        => $this->money( $customer['credit_balance'] ?? '0.0000' ),
				'currency'       => $currency,
				'version'        => $this->nonnegative_int( $customer['credit_version'] ?? 0 ),
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
		$credit = is_array( $portal['store_credit'] ?? null ) ? $portal['store_credit'] : array();
		$orders = is_array( $portal['purchase_history']['orders'] ?? null )
			? $portal['purchase_history']['orders']
			: array();

		$html  = '<div class="tcg-account-portal">';
		$html .= '<section class="tcg-account-portal__section tcg-account-portal__credit">';
		$html .= '<h2>' . $this->esc_html( 'Store Credit' ) . '</h2>';

		if ( ! (bool) ( $portal['customer_linked'] ?? false ) ) {
			$html .= '<p class="tcg-account-portal__notice">';
			$html .= $this->esc_html( 'We could not match this website login to a store customer record yet.' );
			$html .= '</p>';
		}

		$html .= '<p class="tcg-account-portal__balance">';
		$html .= '<strong>' . $this->esc_html( $this->display_money( $credit['balance'] ?? '0.0000', $credit['currency'] ?? 'USD' ) ) . '</strong>';
		$html .= '</p>';

		$ledger_entries = is_array( $credit['ledger_entries'] ?? null ) ? $credit['ledger_entries'] : array();
		if ( array() === $ledger_entries ) {
			$html .= '<p>' . $this->esc_html( 'No store credit activity is available yet.' ) . '</p>';
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
				$html .= '<td>' . $this->esc_html( $entry['label'] ?? '' ) . '</td>';
				$html .= '<td>' . $this->esc_html( $this->display_money( $entry['amount'] ?? '0.0000', $entry['currency'] ?? 'USD' ) ) . '</td>';
				$html .= '<td>' . $this->esc_html( $this->display_money( $entry['balance_after'] ?? '0.0000', $entry['currency'] ?? 'USD' ) ) . '</td>';
				$html .= '</tr>';
			}

			$html .= '</tbody></table>';
		}

		$html .= '</section>';
		$html .= '<section class="tcg-account-portal__section tcg-account-portal__orders">';
		$html .= '<h2>' . $this->esc_html( 'Card Purchase History' ) . '</h2>';

		if ( array() === $orders ) {
			$html .= '<p>' . $this->esc_html( 'No card purchase history is available yet.' ) . '</p>';
		} else {
			$html .= '<div class="tcg-account-portal__order-list">';

			foreach ( $orders as $order ) {
				if ( ! is_array( $order ) ) {
					continue;
				}

				$html .= '<article class="tcg-account-portal__order">';
				$html .= '<h3>' . $this->esc_html( 'Order ' . (string) ( $order['order_number'] ?? '' ) ) . '</h3>';
				$html .= '<p>';
				$html .= $this->esc_html( (string) ( $order['created_at'] ?? '' ) );
				$html .= ' - ';
				$html .= $this->esc_html( (string) ( $order['status_label'] ?? '' ) );
				$html .= ' - ';
				$html .= $this->esc_html( $this->display_money( $order['total'] ?? '0.0000', $order['currency'] ?? 'USD' ) );
				$html .= '</p>';

				$lines = is_array( $order['lines'] ?? null ) ? $order['lines'] : array();
				if ( array() !== $lines ) {
					$html .= '<ul>';
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
						$html .= $this->esc_html( (string) ( $line['name'] ?? '' ) );
						$html .= ' x' . $this->esc_html( (string) ( $line['quantity'] ?? 1 ) );

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
					$html .= '<p><a class="button" href="' . $this->esc_url( (string) $order['view_url'] ) . '">';
					$html .= $this->esc_html( 'View order' );
					$html .= '</a></p>';
				}

				$html .= '</article>';
			}

			$html .= '</div>';
		}

		$html .= '</section>';
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

	private function display_money( mixed $amount, mixed $currency ): string {
		return $this->money( $amount ) . ' ' . $this->currency( $currency );
	}

	private function money( mixed $value ): string {
		$value = $this->clean_string( $value );

		if ( 1 !== preg_match( '/^-?\d+(?:\.\d+)?$/', $value ) ) {
			return '0.0000';
		}

		return number_format( (float) $value, 4, '.', '' );
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
