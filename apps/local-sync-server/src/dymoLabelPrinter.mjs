import { Agent, request as httpsRequest } from "node:https"

const DEFAULT_DYMO_PRINTING_URL = "https://127.0.0.1:41951/DYMO/DLS/Printing"
const DYMO_30336_LABEL_NAME = "30336 Small Multipurpose Labels"
const DYMO_30336_XML_LABEL_NAME = "Small30336"
const httpsAgent = new Agent({ rejectUnauthorized: false })

export async function getConnectedDymoPrinters(options = {}) {
  const serviceBaseUrl = cleanServiceBaseUrl(options.serviceBaseUrl)
  const printersResult = await requestDymoService(serviceBaseUrl, "GET", "GetPrinters")

  if (printersResult.status !== "ok") {
    return printersResult
  }

  const printers = parseDymoPrinters(printersResult.body)
  const connectedPrinters = printers.filter((printer) => printer.is_connected)

  return {
    status: "ok",
    action: "dymo_printers_detected",
    service_base_url: serviceBaseUrl,
    printer_count: printers.length,
    connected_printer_count: connectedPrinters.length,
    printers,
    preferred_printer:
      connectedPrinters.find((printer) => printer.name.toLowerCase().includes("550 turbo")) ??
      connectedPrinters[0] ??
      printers[0] ??
      null,
    credentials_synced_to_client: false,
    raw_credentials_returned: false,
  }
}

export async function printDymoInventoryLabel(input = {}, options = {}) {
  const serviceBaseUrl = cleanServiceBaseUrl(options.serviceBaseUrl)
  const printersResult = await getConnectedDymoPrinters({ serviceBaseUrl })

  if (printersResult.status !== "ok") {
    return printersResult
  }

  const requestedPrinterName = cleanLabelText(input.printer_name ?? input.printerName, "", 120)
  const printer =
    printersResult.printers.find(
      (candidate) => requestedPrinterName && candidate.name.toLowerCase() === requestedPrinterName.toLowerCase(),
    ) ??
    printersResult.preferred_printer

  if (!printer || !printer.is_connected) {
    return blocked(
      "dymo_printer_not_connected",
      "DYMO Connect is running, but no connected LabelWriter printer was reported.",
      {
        action: "dymo_label_print",
        service_base_url: serviceBaseUrl,
        printer_count: printersResult.printer_count,
        connected_printer_count: printersResult.connected_printer_count,
        credentials_synced_to_client: false,
        raw_credentials_returned: false,
      },
    )
  }

  const label = cleanDymoLabelInput(input)
  const labelXml = buildDymo30336LabelXml(label)
  const printParamsXml = createLabelWriterPrintParamsXml({
    copies: input.copies,
    jobTitle: `${label.card_name} ${label.scan_code}`,
  })
  const printResult = await requestDymoService(serviceBaseUrl, "POST", "PrintLabel", {
    printerName: printer.name,
    printParamsXml,
    labelXml,
    labelSetXml: "",
  })

  if (printResult.status !== "ok") {
    return printResult
  }

  return {
    status: "ok",
    action: "dymo_label_printed",
    label_stock: DYMO_30336_LABEL_NAME,
    label_size: "1 in x 2 1/8 in",
    printer_name: printer.name,
    barcode_format: "Code128Auto",
    scan_code: label.scan_code,
    card_name: label.card_name,
    set_code: label.set_code,
    condition: label.condition,
    direct_print_performed: true,
    browser_print_dialog_required: false,
    requested_by_user_id: cleanLabelText(options.requestedByUserId, "", 80),
    requested_by_user_name: cleanLabelText(options.requestedByUserName, "", 120),
    credentials_synced_to_client: false,
    raw_credentials_returned: false,
  }
}

export function buildDymo30336LabelXml(input = {}) {
  const label = cleanDymoLabelInput(input)

  return `<?xml version="1.0" encoding="utf-8"?>
<DesktopLabel Version="1">
  <DYMOLabel Version="4">
    <Description>The Pug inventory label</Description>
    <Orientation>Landscape</Orientation>
    <LabelName>${escapeXml(DYMO_30336_XML_LABEL_NAME)}</LabelName>
    <InitialLength>0</InitialLength>
    <BorderStyle>SolidLine</BorderStyle>
    <DYMORect>
      <DYMOPoint>
        <X>0.045</X>
        <Y>0.035</Y>
      </DYMOPoint>
      <Size>
        <Width>2.035</Width>
        <Height>0.93</Height>
      </Size>
    </DYMORect>
    <BorderColor>
      <SolidColorBrush>
        <Color A="1" R="0" G="0" B="0"></Color>
      </SolidColorBrush>
    </BorderColor>
    <BorderThickness>0</BorderThickness>
    <Show_Border>False</Show_Border>
    <HasFixedLength>False</HasFixedLength>
    <FixedLengthValue>0</FixedLengthValue>
    <DynamicLayoutManager>
      <RotationBehavior>ClearObjects</RotationBehavior>
      <LabelObjects>
        ${textObjectXml({
          name: "CardName",
          text: label.card_name,
          x: "0.055",
          y: "0.035",
          width: "2.005",
          height: "0.205",
          fontSize: "9.5",
          isBold: true,
        })}
        ${textObjectXml({
          name: "SetCondition",
          text: `${label.set_code} ${label.condition}`.trim(),
          x: "0.055",
          y: "0.232",
          width: "2.005",
          height: "0.145",
          fontSize: "7.2",
          isBold: true,
        })}
        <BarcodeObject>
          <Name>InventoryBarcode</Name>
          ${brushesXml({ backgroundA: 1, fillA: 1 })}
          <Rotation>Rotation0</Rotation>
          <OutlineThickness>1</OutlineThickness>
          <IsOutlined>False</IsOutlined>
          <BorderStyle>SolidLine</BorderStyle>
          <Margin>
            <DYMOThickness Left="0" Top="0" Right="0" Bottom="0" />
          </Margin>
          <BarcodeFormat>Code128Auto</BarcodeFormat>
          <Data>
            <DataString>${escapeXml(label.scan_code)}</DataString>
          </Data>
          <HorizontalAlignment>Center</HorizontalAlignment>
          <VerticalAlignment>Middle</VerticalAlignment>
          <Size>AutoFit</Size>
          <TextPosition>Bottom</TextPosition>
          <FontInfo>
            <FontName>Arial</FontName>
            <FontSize>6.2</FontSize>
            <IsBold>True</IsBold>
            <IsItalic>False</IsItalic>
            <IsUnderline>False</IsUnderline>
            <FontBrush>
              <SolidColorBrush>
                <Color A="1" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </FontBrush>
          </FontInfo>
          <ObjectLayout>
            <DYMOPoint>
              <X>0.075</X>
              <Y>0.405</Y>
            </DYMOPoint>
            <Size>
              <Width>1.965</Width>
              <Height>0.515</Height>
            </Size>
          </ObjectLayout>
        </BarcodeObject>
      </LabelObjects>
    </DynamicLayoutManager>
  </DYMOLabel>
  <LabelApplication>The Pug Local App</LabelApplication>
  <DataTable>
    <Columns></Columns>
    <Rows></Rows>
  </DataTable>
</DesktopLabel>`
}

function textObjectXml({ name, text, x, y, width, height, fontSize, isBold }) {
  return `<TextObject>
          <Name>${escapeXml(name)}</Name>
          ${brushesXml({ backgroundA: 0, fillA: 0 })}
          <Rotation>Rotation0</Rotation>
          <OutlineThickness>1</OutlineThickness>
          <IsOutlined>False</IsOutlined>
          <BorderStyle>SolidLine</BorderStyle>
          <Margin>
            <DYMOThickness Left="0" Top="0" Right="0" Bottom="0" />
          </Margin>
          <HorizontalAlignment>Left</HorizontalAlignment>
          <VerticalAlignment>Middle</VerticalAlignment>
          <FitMode>AlwaysFit</FitMode>
          <IsVertical>False</IsVertical>
          <FormattedText>
            <FitMode>AlwaysFit</FitMode>
            <HorizontalAlignment>Left</HorizontalAlignment>
            <VerticalAlignment>Middle</VerticalAlignment>
            <IsVertical>False</IsVertical>
            <LineTextSpan>
              <TextSpan>
                <Text>${escapeXml(text)}</Text>
                <FontInfo>
                  <FontName>Arial</FontName>
                  <FontSize>${escapeXml(fontSize)}</FontSize>
                  <IsBold>${isBold ? "True" : "False"}</IsBold>
                  <IsItalic>False</IsItalic>
                  <IsUnderline>False</IsUnderline>
                  <FontBrush>
                    <SolidColorBrush>
                      <Color A="1" R="0" G="0" B="0"></Color>
                    </SolidColorBrush>
                  </FontBrush>
                </FontInfo>
              </TextSpan>
            </LineTextSpan>
          </FormattedText>
          <ObjectLayout>
            <DYMOPoint>
              <X>${escapeXml(x)}</X>
              <Y>${escapeXml(y)}</Y>
            </DYMOPoint>
            <Size>
              <Width>${escapeXml(width)}</Width>
              <Height>${escapeXml(height)}</Height>
            </Size>
          </ObjectLayout>
        </TextObject>`
}

function brushesXml({ backgroundA, fillA }) {
  return `<Brushes>
            <BackgroundBrush>
              <SolidColorBrush>
                <Color A="${backgroundA}" R="1" G="1" B="1"></Color>
              </SolidColorBrush>
            </BackgroundBrush>
            <BorderBrush>
              <SolidColorBrush>
                <Color A="1" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </BorderBrush>
            <StrokeBrush>
              <SolidColorBrush>
                <Color A="1" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </StrokeBrush>
            <FillBrush>
              <SolidColorBrush>
                <Color A="${fillA}" R="0" G="0" B="0"></Color>
              </SolidColorBrush>
            </FillBrush>
          </Brushes>`
}

function createLabelWriterPrintParamsXml(input = {}) {
  const copies = boundedInt(input.copies, 1, 25, 1)
  const jobTitle = cleanLabelText(input.jobTitle, "The Pug inventory label", 80)

  return `<LabelWriterPrintParams><Copies>${copies}</Copies><JobTitle>${escapeXml(jobTitle)}</JobTitle><FlowDirection>LeftToRight</FlowDirection><PrintQuality>Text</PrintQuality></LabelWriterPrintParams>`
}

async function requestDymoService(serviceBaseUrl, method, action, fields = null) {
  const targetUrl = new URL(`${serviceBaseUrl.replace(/\/$/, "")}/${action}`)
  const body = fields ? new URLSearchParams(fields).toString() : ""

  return new Promise((resolve) => {
    const request = httpsRequest(
      targetUrl,
      {
        method,
        agent: httpsAgent,
        headers: body
          ? {
              "content-type": "application/x-www-form-urlencoded; charset=utf-8",
              "content-length": Buffer.byteLength(body),
            }
          : undefined,
        timeout: 6000,
      },
      (response) => {
        const chunks = []

        response.on("data", (chunk) => chunks.push(chunk))
        response.on("end", () => {
          const responseBody = Buffer.concat(chunks).toString("utf8")

          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            return resolve({
              status: "ok",
              body: responseBody,
            })
          }

          return resolve(blocked(
            "dymo_service_rejected_request",
            `DYMO Connect rejected the ${action} request.`,
            {
              action: "dymo_service_request",
              status_code: response.statusCode ?? 0,
              response_body_preview: responseBody.slice(0, 240),
              credentials_synced_to_client: false,
              raw_credentials_returned: false,
            },
          ))
        })
      },
    )

    request.on("timeout", () => {
      request.destroy(new Error("DYMO Connect request timed out."))
    })
    request.on("error", (error) => {
      resolve(blocked(
        "dymo_service_unavailable",
        "DYMO Connect local printing service is unavailable. Start DYMO Connect and confirm the printer is connected.",
        {
          action: "dymo_service_request",
          detail: error instanceof Error ? error.message : "Unknown DYMO service error.",
          credentials_synced_to_client: false,
          raw_credentials_returned: false,
        },
      ))
    })

    if (body) {
      request.write(body)
    }

    request.end()
  })
}

function parseDymoPrinters(xml) {
  return Array.from(String(xml ?? "").matchAll(/<LabelWriterPrinter>([\s\S]*?)<\/LabelWriterPrinter>/gi))
    .map((match) => match[1])
    .map((printerXml) => ({
      type: "LabelWriterPrinter",
      name: xmlValue(printerXml, "Name"),
      model_name: xmlValue(printerXml, "ModelName"),
      is_connected: xmlValue(printerXml, "IsConnected").toLowerCase() === "true",
      is_local: xmlValue(printerXml, "IsLocal").toLowerCase() === "true",
      is_twin_turbo: xmlValue(printerXml, "IsTwinTurbo").toLowerCase() === "true",
    }))
    .filter((printer) => printer.name)
}

function xmlValue(xml, tagName) {
  const match = String(xml ?? "").match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"))

  return match ? decodeXml(match[1]).trim() : ""
}

function cleanDymoLabelInput(input = {}) {
  const cardName = cleanLabelText(input.card_name ?? input.cardName, "Unknown card", 64)
  const setCode = cleanLabelText(input.set_code ?? input.setCode, "SET", 24).toUpperCase()
  const condition = cleanLabelText(input.condition, "Condition", 32)
  const scanCode = cleanScanCode(input.scan_code ?? input.scanCode ?? input.barcode ?? input.sku)

  return {
    card_name: cardName,
    set_code: setCode,
    condition,
    scan_code: scanCode,
  }
}

function cleanServiceBaseUrl(value) {
  const raw = String(value ?? process.env.PUG_DYMO_SERVICE_URL ?? DEFAULT_DYMO_PRINTING_URL).trim()

  try {
    const url = new URL(raw)

    if (url.protocol !== "https:") {
      return DEFAULT_DYMO_PRINTING_URL
    }

    url.pathname = url.pathname.replace(/\/+$/, "") || "/DYMO/DLS/Printing"
    url.search = ""
    url.hash = ""

    return url.toString().replace(/\/$/, "")
  } catch {
    return DEFAULT_DYMO_PRINTING_URL
  }
}

function cleanLabelText(value, fallback = "", maxLength = 80) {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  return (text || fallback).slice(0, maxLength)
}

function cleanScanCode(value) {
  const text = cleanLabelText(value, "PUG-0000", 80)
    .replace(/[^\x20-\x7e]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  return text || "PUG-0000"
}

function boundedInt(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(max, Math.max(min, parsed))
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function decodeXml(value) {
  return String(value ?? "")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
}

function blocked(code, message, extra = {}) {
  return {
    status: "blocked",
    code,
    message,
    ...extra,
  }
}
