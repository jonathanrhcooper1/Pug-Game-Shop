import assert from "node:assert/strict"

import { buildDymo30336LabelXml, printDymoInventoryLabel } from "../src/dymoLabelPrinter.mjs"

const blockedPrint = await printDymoInventoryLabel({
  card_name: "Scanner Limit Test",
  set_code: "TEST",
  condition: "NM",
  barcode: "PUG-07D72CB7-01",
})

assert.equal(blockedPrint.status, "blocked")
assert.equal(blockedPrint.code, "barcode_too_long_for_scanner")
assert.equal(blockedPrint.direct_print_performed, false)

const labelXml = buildDymo30336LabelXml({
  card_name: "Scanner Limit Test",
  set_code: "TEST",
  condition: "NM",
  barcode: "PUG-07D72CB7",
})

assert.ok(labelXml.includes("<DataString>PUG-07D72CB7</DataString>"))

console.log("PASS dymo label printer")
