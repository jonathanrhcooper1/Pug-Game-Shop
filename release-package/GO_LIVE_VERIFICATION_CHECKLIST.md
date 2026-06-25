# The Pug Go-Live Verification Checklist

Print this page and check each item after the live inventory CSV is imported.

## Website

- [ ] Open the home page and confirm the header/menu looks correct.
- [ ] Open Singles and confirm imported cards appear with images, prices, and condition choices.
- [ ] Open Graded Cards and confirm graded cards appear separately from singles.
- [ ] Open Sealed, Accessories, Events, Buying, and Contact pages.
- [ ] Search for a known imported card by name.
- [ ] Filter singles by game and set/expansion.
- [ ] Open a product page and confirm the image, condition selector, price, and add-to-cart button work.
- [ ] Add a card to cart and confirm the cart shows the product image.
- [ ] Confirm local pickup is available where expected.
- [ ] Submit one test event registration and confirm the registration email arrives with event details and The Pug address.

## Employee App

- [ ] Open `http://127.0.0.1:1420/`.
- [ ] Log in with the employee/manager PIN.
- [ ] Confirm the app does not show staging wording.
- [ ] Confirm the status screen shows the website/LAN server online.
- [ ] Confirm sync queue shows 0 before starting live entry.
- [ ] Search ScryDex/reference catalog for a known card.
- [ ] Add one card to inventory from the app and confirm it automatically appears on the website.
- [ ] Add the same card/set in a different condition and confirm the website keeps one product with condition options.
- [ ] Print or preview a Dymo label for one imported card.

## Kiosk And Fulfillment

- [ ] Open the customer kiosk screen.
- [ ] Confirm only in-stock cards appear.
- [ ] Add one card to the kiosk cart and submit a pickup request.
- [ ] Confirm the employee app plays or shows the new order notification.
- [ ] Open Order Fulfillment and pick the order.
- [ ] Mark the order ready for pickup.
- [ ] Complete the pickup and confirm it moves out of the active queue.

## Customer Credit And Checkout

- [ ] Search for an existing customer.
- [ ] Create a new customer if needed.
- [ ] Confirm customer credit balance and ledger history display.
- [ ] Run one local checkout as guest.
- [ ] Run one local checkout attached to a customer.
- [ ] Redeem local store credit and enter the Square receipt number.
- [ ] Confirm sold cards are removed from available website/app/kiosk inventory.

## Trade-In Flow

- [ ] Search/select a customer at the top of Trade-In.
- [ ] Add a raw single to the trade-in cart.
- [ ] Add a graded card to the trade-in cart.
- [ ] Set a per-card trade percentage from 0% to 100% in 5% increments.
- [ ] Enter a manual offer value for one item.
- [ ] Save a quote for later and reopen it from the customer profile.
- [ ] Reject a quote and confirm it remains recorded.
- [ ] Accept a quote and confirm store credit posts to the customer ledger.
- [ ] Convert accepted items to inventory and confirm employee attribution is visible in reports.

## Reports

- [ ] Open Reports as a manager.
- [ ] Confirm dashboard cards/charts load.
- [ ] Filter by date range.
- [ ] Compare employee intake vs sales.
- [ ] Compare online vs in-store sales.
- [ ] Export at least one CSV report.

## Final Safety

- [ ] Confirm ScryDex catalog status is usable.
- [ ] Confirm Square for WooCommerce is active/configured.
- [ ] Confirm the employee notification sound is enabled and can be tested.
- [ ] Confirm no pending LAN queue rows remain after test transactions.
- [ ] Confirm no open sync conflicts remain after test transactions.
- [ ] Confirm a database backup exists before importing the live CSV.
