# Storefront Theme Or Blocks

This folder holds the customer storefront theme and related storefront assets.

`pug-arcade-commerce-v2` is the imported The Pug WooCommerce theme from the
secondary Pug Card Website workspace. It is designed around the production shop
structure:

- `Shop Singles` uses `[tcg_inventory_search]` with search, game, and
  set/expansion filters backed by the trading-card inventory database.
- `Shop Sealed Products` uses the WooCommerce `sealed-products` product
  category.
- `Shop Accessories` uses the WooCommerce `accessories` product category.

Inventory created through the local app remains sourced from the WordPress
plugin and can automatically publish visible card singles into WooCommerce.
