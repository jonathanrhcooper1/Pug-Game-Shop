# Payments And POS

## Boundaries

- Payment providers authorize, capture, refund, and report fees.
- POS providers record in-store transactions.
- The plugin owns exact serialized item status.
- No adapter may infer that provider quantity stock is equivalent to serialized
  card availability.

## Payment Provider Interface

```text
authorizePayment()
capturePayment()
refundPayment()
voidPayment()
getFees()
supportsTokenization()
supportsStoreCreditCombinedPayment()
supportsInPersonPayment()
supportsOnlinePayment()
capabilityCheck()
```

Online payment should normally use maintained WooCommerce gateway extensions.
The platform observes Woo order/payment lifecycle events and stores only
provider transaction references and masked metadata. It never stores card data.

## POS Provider Interface

```text
searchItemByBarcode()
pushInventoryItem()
updateInventoryStatus()
markItemSold()
syncSale()
pullTransaction()
reconcileInventory()
supportsWebhooks()
supportsOfflineMode()
capabilityCheck()
```

## Square Strategy

Official Square documentation supports Catalog, Orders, Inventory, and webhooks,
including POS-originated orders. That permits reconciliation, but does not prove
that a Square POS line item will always carry the store's unique serialized
barcode in a recoverable field.

Launch modes:

1. `scan_gate` (default): staff scans the exact store barcode in the TCG staff
   app before/during Square checkout. The plugin creates a pending POS sale and
   later reconciles the Square transaction.
2. `catalog_mirror` (optional): each serialized item is projected to a Square
   variation only after scale, workflow, and field-mapping tests pass.
3. `reconciliation_only`: ingest Square orders/webhooks and flag any line that
   cannot be deterministically mapped to one inventory item.

Square webhook event IDs and external order/payment IDs are idempotency keys.
Refunds do not automatically return a card to `available`; the configured
default is `pending_review`.

## GoDaddy Payments

The public GoDaddy developer portal reviewed on June 6, 2026 states that the
general GoDaddy API is not a payment gateway. Therefore GoDaddy Payments is
treated as a WooCommerce gateway/plugin integration until product-specific,
documented APIs are configured and verified.

## Stripe And Helcim

Adapters remain optional. Stripe documents Terminal offline payment behavior,
but adopting it would require a separate hardware/account proof-of-concept.
Helcim documents online Payment API operations. Neither is marked configured
until credentials, account features, WooCommerce compatibility, and required
in-person hardware are verified.

## Store Credit With Payment

Store credit is applied before the external payment amount is finalized:

1. Lock customer credit projection.
2. Create a pending redemption authorization tied to the Woo/POS cart.
3. Charge the remainder through the external provider.
4. Post the immutable redemption when payment succeeds.
5. Release pending authorization on failure/cancel.

Provider support for split tender is not required because store credit is an
internal tender reduction, but gateway totals and refund behavior must be tested.

## Fee Comparison

Fee assumptions are effective-dated configuration:

- Provider and channel.
- Percentage fee.
- Fixed fee.
- Monthly/platform/device fees.
- Chargeback and non-Square Orders API fees where relevant.
- Source note and last verified date.

Reports are estimates, not accounting statements. No current rate is hardcoded.

## Reconciliation

Daily reconciliation compares:

- Plugin sold/refunded items.
- Woo orders and payment transactions.
- POS orders/payments.
- Provider inventory projections, if enabled.

Mismatches create durable exceptions; they never silently modify exact inventory.

## Sources

- https://developer.squareup.com/docs/catalog-api/what-it-does
- https://developer.squareup.com/docs/orders-api/what-it-does
- https://developer.squareup.com/docs/inventory-api/webhooks
- https://developer.godaddy.com/getstarted
- https://docs.stripe.com/terminal/features/operate-offline/overview
- https://devdocs.helcim.com/docs/payment-api
- https://developer.woocommerce.com/docs/woocommerce-payment-gateway-api/
