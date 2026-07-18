# ScryDex Pricing Mapping

The local middleman server treats ScryDex as a source feed and stores card, variant, image, and price data in SQLite. Intake, repricing, and Square sync should read from the local `reference_cards` rows instead of asking the public site to price an individual card at runtime.

## Card And Variant Selection

Cards are matched by game, card name, set name or set code, and card number when those fields are available. The selected display variant is chosen from the stored variant list using the requested finish or variant text, then by the first variant with an image, then by the first stored variant.

Variant price mapping follows this priority:

1. Match price points by `provider_variant_id`.
2. Match price points by `reference_variant_id`.
3. Fall back to the display variant index and split raw price points into variant groups when a condition repeats or when the condition ordering reverses.

That fallback supports provider payloads ordered either `NM, LP, MP, DM` or `DM, HP, MP, LP, NM`. It also handles older payloads where one variant ends at `DM` and the next variant starts at `NM`.

Display variants are normalized before returning to the intake UI. Duplicate labels such as two `normal` or two `foil` rows are merged, and set-code shaped values such as `EVE / EVE` are removed from the version dropdown.

## Currency And Conditions

If any matching raw or graded price points are in USD, the selector uses the USD points and ignores non-USD points for the same pricing decision. If no USD points exist, it falls back to the provider currency data.

Raw condition pricing first looks for the exact selected condition. If the exact condition is missing, the server uses the nearest available worse condition, or the nearest available better condition when there is no worse condition. If the provider's selected lower condition is priced above a better condition, the server caps the selected price to the lowest better-condition price. This prevents LP, MP, HP, or damaged pricing from exceeding NM or another better condition because of provider anomalies.

The selected reference price is rounded by the normal inventory pricing rules. The final sale price is still constrained by the system floor value, so ScryDex repricing can raise or update a price but cannot push an item below the configured floor.

## Square Sync

Square receives the local item variation price selected by the server. Existing catalog variations are updated inside their parent Square item object so price changes replace the current variation price instead of creating a detached duplicate variation. Tax application is handled in the Square catalog sync payload for active synced cards.
