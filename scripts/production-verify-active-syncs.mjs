import { execFileSync } from "node:child_process"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))

const checks = [
  {
    name: "production_reference_search",
    command: ["npm.cmd", ["run", "production:verify-reference-search"]],
  },
  {
    name: "production_public_shortcodes",
    command: ["npm.cmd", ["run", "production:verify-public-shortcodes"]],
  },
  {
    name: "production_scrydex_catalog",
    command: ["npm.cmd", ["run", "production:verify-scrydex-catalog"]],
  },
  {
    name: "local_sync_inventory_push",
    env: {
      PUG_PROD_CONFIRM_LOCAL_SYNC_INVENTORY_SMOKE: "run-production-local-sync-inventory-smoke",
    },
    command: ["npm.cmd", ["run", "production:local-sync-inventory-smoke"]],
  },
  {
    name: "local_sync_square_sale",
    env: {
      PUG_PROD_CONFIRM_LOCAL_SYNC_SQUARE_SALE_SMOKE: "run-production-local-sync-square-sale-smoke",
    },
    command: ["npm.cmd", ["run", "production:local-sync-square-sale-smoke"]],
  },
  {
    name: "local_sync_customer_credit_event_kiosk_workflows",
    env: {
      PUG_PROD_CONFIRM_LOCAL_SYNC_WORKFLOWS_SMOKE: "run-production-local-sync-workflows-smoke",
    },
    command: ["npm.cmd", ["run", "production:local-sync-workflows-smoke"]],
  },
  {
    name: "local_pickup_fulfillment",
    env: {
      PUG_PROD_CONFIRM_LOCAL_PICKUP_FULFILLMENT_SMOKE: "run-production-local-pickup-fulfillment-smoke",
    },
    command: ["npm.cmd", ["run", "production:local-pickup-fulfillment-smoke"]],
  },
]

const results = []

for (const check of checks) {
  const startedAt = new Date().toISOString()
  try {
    execFileSync(check.command[0], check.command[1], {
      cwd: root,
      stdio: "inherit",
      shell: process.platform === "win32" && check.command[0].toLowerCase().endsWith(".cmd"),
      env: {
        ...process.env,
        ...(check.env ?? {}),
      },
    })
    results.push({ name: check.name, status: "passed", startedAt, finishedAt: new Date().toISOString() })
  } catch (error) {
    results.push({
      name: check.name,
      status: "failed",
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode: error.status ?? null,
    })
  }
}

const failed = results.filter((result) => result.status !== "passed")

console.log(
  JSON.stringify(
    {
      action: "production_active_syncs_verified",
      status: failed.length === 0 ? "ok" : "failed",
      results,
      allActiveSyncsWorking: failed.length === 0,
      verifiedSyncs: [
        "scrydex_reference_catalog",
        "public_shop_shortcodes",
        "local_inventory_push",
        "woocommerce_product_projection_square_sale",
        "customer_credit_push",
        "customer_upsert_push",
        "event_registration_checkin_push",
        "kiosk_order_push",
        "local_pickup_fulfillment",
      ],
    },
    null,
    2,
  ),
)

if (failed.length > 0) {
  process.exit(1)
}
