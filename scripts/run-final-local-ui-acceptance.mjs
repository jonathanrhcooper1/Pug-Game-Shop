import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

import { chromium } from "@playwright/test"

const baseUrl = process.env.PUG_UI_BASE_URL || "http://127.0.0.1:1420"
const checkoutBaseUrl = process.env.PUG_CHECKOUT_UI_BASE_URL || "http://127.0.0.1:1421"
const outputDirectory = resolve(process.env.PUG_UI_EVIDENCE_DIR || "evidence/final-20260718/ui")
const pin = process.env.PUG_UI_TEST_PIN || "1420"
const browser = await chromium.launch({ headless: true })
const findings = []
const screenshots = []
let fatalError = ""

mkdirSync(outputDirectory, { recursive: true })

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const employee = await desktop.newPage()
  observePage(employee, "employee-desktop")
  await employee.goto(`${baseUrl}/`, { waitUntil: "networkidle" })
  await capture(employee, "01-login-desktop.png")
  await login(employee)
  await expectText(employee, "Store Operations")
  await verifyResponsiveBounds(employee, "employee-desktop-inventory")
  await capture(employee, "03-inventory-desktop.png")

  const employeeSections = [
    ["Trade-Ins", "04-trade-ins-desktop.png"],
    ["ScryDex", "05-scrydex-desktop.png"],
    ["Price Review", "06-price-review-desktop.png"],
    ["Status", "07-status-desktop.png"],
    ["Fulfillment", "08-fulfillment-desktop.png"],
    ["Queue", "09-queue-desktop.png"],
    ["Events", "10-events-desktop.png"],
    ["Reports", "11-reports-desktop.png"],
    ["Conflicts", "12-conflicts-desktop.png"],
    ["Customers", "13-customers-desktop.png"],
    ["Settings", "14-settings-desktop.png"],
  ]

  for (const [section, screenshot] of employeeSections) {
    await employee.getByRole("button", { name: section, exact: true }).click()
    await employee.waitForTimeout(250)
    await expectText(employee, section === "Fulfillment" ? "Shared order fulfillment" : section)
    await verifyResponsiveBounds(employee, `employee-desktop-${slug(section)}`)
    await capture(employee, screenshot)

    if (section === "Queue") {
      const reviewButton = employee.getByRole("button", { name: /Review Deliveries/i })
      if (await reviewButton.isVisible()) {
        await reviewButton.click()
        await employee.waitForTimeout(250)
        await expectText(employee, "connector delivery")
        const diagnostics = employee.getByLabel("Connector delivery diagnostics")
        await diagnostics.scrollIntoViewIfNeeded()
        await capture(employee, "09b-connector-delivery-diagnostics.png")
      }
    }
  }

  await employee.getByRole("button", { name: "Inventory", exact: true }).click()
  const inventoryIntake = employee.getByRole("button", { name: "Inventory Intake", exact: true })
  if (await inventoryIntake.isVisible()) {
    await inventoryIntake.click()
    await expectText(employee, "Card Catalog Lookup")
    await capture(employee, "15-inventory-intake-desktop.png")
  }

  const kiosk = await desktop.newPage()
  observePage(kiosk, "kiosk-desktop")
  await kiosk.goto(`${baseUrl}/?mode=kiosk`, { waitUntil: "networkidle" })
  await expectText(kiosk, "Find cards in stock")
  await verifyResponsiveBounds(kiosk, "kiosk-desktop")
  await capture(kiosk, "16-kiosk-catalog-desktop.png")
  const kioskAdd = kiosk.getByRole("button", { name: "Add", exact: true }).first()
  if (await kioskAdd.isVisible()) {
    await kioskAdd.click()
    await kiosk.getByLabel("First name").fill("Visual")
    await kiosk.getByLabel("Last name").fill("Test")
    await capture(kiosk, "17-kiosk-cart-desktop.png")
    const send = kiosk.getByRole("button", { name: "Send to Counter", exact: true })
    if (await send.isEnabled()) {
      await send.click()
      await expectText(kiosk, "Pickup order sent")
      await capture(kiosk, "18-kiosk-order-sent-desktop.png")
    }
  }

  const checkout = await desktop.newPage()
  observePage(checkout, "checkout-desktop")
  await checkout.goto(`${checkoutBaseUrl}/`, { waitUntil: "networkidle" })
  await login(checkout)
  await expectText(checkout, "Sale Completion")
  for (const mode of ["Customer Sale", "Guest Sale", "Pay with Card", "Pay with Cash", "Split Cash/Card"]) {
    const button = checkout.getByRole("button", { name: mode, exact: true })
    if (!(await button.isVisible())) {
      findings.push({ severity: "error", surface: "checkout-desktop", message: `${mode} control is not visible.` })
      continue
    }
    await button.click()
    await checkout.waitForTimeout(120)
  }
  const barcodeInput = checkout.getByPlaceholder("Scan product label")
  const productSearch = checkout.getByPlaceholder("Card, set, condition, barcode")
  if (!(await barcodeInput.isVisible()) || !(await productSearch.isVisible())) {
    findings.push({ severity: "error", surface: "checkout-desktop", message: "Checkout scan or product-search control is not visible." })
  } else {
    await productSearch.fill("Pikachu")
    await checkout.waitForTimeout(250)
  }
  await verifyResponsiveBounds(checkout, "checkout-desktop")
  await capture(checkout, "19-checkout-desktop.png")

  await desktop.close()

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
  const mobileEmployee = await mobile.newPage()
  observePage(mobileEmployee, "employee-mobile")
  await mobileEmployee.goto(`${baseUrl}/`, { waitUntil: "networkidle" })
  await login(mobileEmployee)
  await verifyResponsiveBounds(mobileEmployee, "employee-mobile-inventory")
  await capture(mobileEmployee, "20-inventory-mobile.png")
  await mobileEmployee.getByRole("button", { name: "Trade-Ins", exact: true }).click()
  await expectText(mobileEmployee, "Trade-In Counter")
  await verifyResponsiveBounds(mobileEmployee, "employee-mobile-trade")
  await capture(mobileEmployee, "21-trade-in-mobile.png")

  const mobileKiosk = await mobile.newPage()
  observePage(mobileKiosk, "kiosk-mobile")
  await mobileKiosk.goto(`${baseUrl}/?mode=kiosk`, { waitUntil: "networkidle" })
  await expectText(mobileKiosk, "Find cards in stock")
  await verifyResponsiveBounds(mobileKiosk, "kiosk-mobile")
  await capture(mobileKiosk, "22-kiosk-mobile.png")
  await mobile.close()
} catch (error) {
  fatalError = error instanceof Error ? error.message : String(error)
  findings.push({ severity: "error", surface: "acceptance-runner", message: fatalError })
} finally {
  await browser.close()
}

const report = {
  status: findings.some((finding) => finding.severity === "error") ? "failed" : "passed",
  generated_at_utc: new Date().toISOString(),
  base_url: baseUrl,
  screenshots,
  findings,
  fatal_error: fatalError,
  secrets_recorded: false,
}
writeFileSync(resolve(outputDirectory, "ui-acceptance.json"), `${JSON.stringify(report, null, 2)}\n`)

if (report.status !== "passed") {
  console.error(JSON.stringify(report, null, 2))
  process.exitCode = 1
} else {
  console.log(`PASS local UI acceptance (${screenshots.length} screenshots, ${findings.length} non-error finding(s))`)
}

async function login(page) {
  const pinInput = page.locator("#pug-employee-pin")
  if (!(await pinInput.isVisible().catch(() => false))) {
    return
  }
  await pinInput.fill(pin)
  await page.getByRole("button", { name: "Unlock App", exact: true }).click()
  await page.getByText("Store Operations", { exact: true }).waitFor({ state: "visible" })
}

async function expectText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: 8_000 })
}

async function capture(page, fileName) {
  const path = resolve(outputDirectory, fileName)
  await page.screenshot({ path, fullPage: false })
  screenshots.push(fileName)
}

async function verifyResponsiveBounds(page, surface) {
  const bounds = await page.evaluate(() => ({
    viewport_width: window.innerWidth,
    document_width: document.documentElement.scrollWidth,
    body_width: document.body.scrollWidth,
  }))
  const overflow = Math.max(bounds.document_width, bounds.body_width) - bounds.viewport_width
  if (overflow > 2) {
    findings.push({ severity: "error", surface, message: `Horizontal overflow is ${overflow}px.`, bounds })
  }
}

function observePage(page, surface) {
  page.on("pageerror", (error) => {
    findings.push({ severity: "error", surface, message: `Page error: ${error.message}` })
  })
  page.on("console", (message) => {
    if (message.type() === "error") {
      const location = message.location()?.url || ""
      findings.push({
        severity: "warning",
        surface,
        message: `Browser resource error: ${message.text()}${location ? ` (${location})` : ""}`,
      })
    }
  })
  page.on("response", (response) => {
    if (response.status() >= 400) {
      findings.push({
        severity: response.status() >= 500 ? "error" : "warning",
        surface,
        message: `${response.request().method()} ${response.url()} returned HTTP ${response.status()}.`,
      })
    }
  })
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText || "request failed"
    findings.push({ severity: "warning", surface, message: `${request.method()} ${request.url()}: ${failure}` })
  })
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}
