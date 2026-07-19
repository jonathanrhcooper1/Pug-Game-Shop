const DEFAULT_SCRYDEX_VISION_BASE_URL = "https://api.scrydex.com"
const DEFAULT_SCRYDEX_VISION_TIMEOUT_MS = 15000
const MAX_SCRYDEX_VISION_IMAGE_BYTES = 20 * 1024 * 1024
const SUPPORTED_SCRYDEX_VISION_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

export function createScryDexVisionIdentifier(options = {}) {
  const apiKey = cleanSecret(options.apiKey)
  const teamId = cleanSecret(options.teamId)
  const baseUrl = cleanBaseUrl(options.baseUrl)
  const timeoutMs = boundedTimeoutMs(options.timeoutMs)
  const fetchImpl = options.fetchImpl ?? fetch

  const configured = Boolean(apiKey && teamId && typeof fetchImpl === "function")

  return {
    configured,
    status: () => ({
      provider: "scrydex_vision",
      configured,
      status: configured ? "ready" : "not_configured",
      detail: configured
        ? "ScryDex Vision file identification is configured on this LAN server."
        : "Set SCRYDEX_VISION_API_KEY and SCRYDEX_VISION_TEAM_ID, or the matching ScryDex fallback env vars, on the LAN server.",
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }),
    identifyCardImage: async (input = {}) => {
      if (!configured) {
        return blocked(
          "scrydex_vision_not_configured",
          "ScryDex Vision is not configured on this LAN server.",
        )
      }

      const image = decodeImagePayload(input)

      if (image.status !== "ok") {
        return image
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const formData = new FormData()
        const file = new Blob([image.bytes], { type: image.mime_type })
        const extension = image.mime_type === "image/png" ? "png" : image.mime_type === "image/webp" ? "webp" : "jpg"

        formData.append("image", file, `pug-live-card-scan.${extension}`)

        const games = cleanGames(input.games ?? input.game)

        if (games) {
          formData.append("games", games)
        }

        const response = await fetchImpl(`${baseUrl}/vision/v1/cards/identify`, {
          method: "POST",
          headers: {
            "X-Api-Key": apiKey,
            "X-Team-ID": teamId,
          },
          body: formData,
          signal: controller.signal,
        })
        const body = await parseJsonResponse(response)

        if (!response.ok) {
          return {
            ...blocked(
              "scrydex_vision_request_failed",
              body?.message || body?.error || `ScryDex Vision returned HTTP ${response.status}.`,
            ),
            http_status: response.status,
            provider_error_code: cleanPublicString(body?.code || body?.error_code || ""),
          }
        }

        const normalized = normalizeVisionResponse(body)

        return {
          status: "ok",
          action: "scrydex_vision_card_identified",
          code: "scrydex_vision_card_identified",
          analysis: normalized.analysis,
          matches: normalized.matches,
          match_count: normalized.matches.length,
          top_query: buildVisionSearchQuery(normalized.matches[0], normalized.analysis),
          game: normalized.analysis.game || cleanGames(input.game).split(",")[0] || "",
          image_size_bytes: image.bytes.length,
          image_mime_type: image.mime_type,
          provider: "scrydex_vision",
          credentials_synced_to_client: false,
          raw_credentials_returned: false,
        }
      } catch (error) {
        return blocked(
          error?.name === "AbortError" ? "scrydex_vision_timeout" : "scrydex_vision_request_error",
          error?.name === "AbortError"
            ? "ScryDex Vision timed out. Try scanning again with the card filling the guide."
            : `ScryDex Vision request failed: ${error instanceof Error ? error.message : "Unknown error."}`,
        )
      } finally {
        clearTimeout(timeout)
      }
    },
  }
}

function decodeImagePayload(input) {
  const explicitMimeType = cleanMimeType(input.mime_type ?? input.mimeType)
  let mimeType = explicitMimeType
  let base64 = String(input.image_base64 ?? input.imageBase64 ?? "").trim()
  const dataUrl = String(input.image_data_url ?? input.imageDataUrl ?? "").trim()

  if (!base64 && dataUrl) {
    const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/i)

    if (!match) {
      return blocked("scrydex_vision_image_invalid", "Live scan image payload was not a valid image data URL.")
    }

    mimeType = cleanMimeType(match[1])
    base64 = match[2]
  }

  if (!base64) {
    return blocked("scrydex_vision_image_required", "Capture a card image before running ScryDex Vision.")
  }

  if (!SUPPORTED_SCRYDEX_VISION_MIME_TYPES.has(mimeType)) {
    return blocked("scrydex_vision_image_type_invalid", "ScryDex Vision accepts JPEG, PNG, or WebP images.")
  }

  let bytes

  try {
    bytes = Buffer.from(base64.replace(/\s+/g, ""), "base64")
  } catch {
    return blocked("scrydex_vision_image_invalid", "Live scan image payload could not be decoded.")
  }

  if (!bytes.length) {
    return blocked("scrydex_vision_image_empty", "Live scan image was empty. Try scanning again.")
  }

  if (bytes.length > MAX_SCRYDEX_VISION_IMAGE_BYTES) {
    return blocked("scrydex_vision_image_too_large", "ScryDex Vision images must be 20MB or smaller.")
  }

  return {
    status: "ok",
    bytes,
    mime_type: mimeType,
  }
}

async function parseJsonResponse(response) {
  const text = await response.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 300) }
  }
}

function normalizeVisionResponse(body) {
  const data = body?.data && typeof body.data === "object" ? body.data : body
  const analysis = normalizeVisionAnalysis(data?.analysis ?? body?.analysis ?? {})
  const rawMatches = firstArray(
    data?.matches,
    data?.cards,
    data?.results,
    body?.matches,
    body?.cards,
    body?.results,
  )

  return {
    analysis,
    matches: rawMatches.map((match, index) => normalizeVisionMatch(match, analysis, index)).filter(Boolean),
  }
}

function normalizeVisionAnalysis(value) {
  const gradedDetails = value?.graded_details ?? value?.gradedDetails ?? {}

  return {
    type: cleanPublicString(value?.type),
    game: cleanGame(value?.game),
    language_code: cleanPublicString(value?.language_code ?? value?.languageCode).toUpperCase(),
    graded_details: {
      company: cleanPublicString(gradedDetails?.company),
      grade_code: cleanPublicString(gradedDetails?.grade_code ?? gradedDetails?.gradeCode),
      grade_label: cleanPublicString(gradedDetails?.grade_label ?? gradedDetails?.gradeLabel),
      grade_number: cleanPublicString(gradedDetails?.grade_number ?? gradedDetails?.gradeNumber),
      year: cleanPublicString(gradedDetails?.year),
      cert: cleanPublicString(gradedDetails?.cert ?? gradedDetails?.certification_number),
    },
  }
}

function normalizeVisionMatch(match, analysis, index) {
  const card = match?.card && typeof match.card === "object" ? match.card : match

  if (!card || typeof card !== "object") {
    return null
  }

  const expansion = card.expansion ?? card.set ?? match?.expansion ?? match?.set ?? {}
  const images = Array.isArray(card.images) ? card.images : []
  const frontImage = images.find((image) => image?.type === "front") ?? images[0] ?? {}
  const game = cleanGame(card.game ?? card.game_key ?? analysis.game)
  const name = cleanPublicString(card.card_name ?? card.name ?? card.cardName)
  const setName = cleanPublicString(expansion.name ?? card.set_name ?? card.setName)

  if (!name && !setName) {
    return null
  }

  return {
    rank: index + 1,
    score: Number.isFinite(Number(match?.score)) ? Number(match.score) : null,
    variant: cleanPublicString(match?.variant ?? card.variant ?? card.finish),
    provider_card_id: cleanPublicString(card.id ?? card.provider_card_id ?? card.providerCardId),
    game,
    card_name: name,
    set_name: setName,
    set_code: cleanPublicString(expansion.code ?? expansion.id ?? card.set_code ?? card.setCode),
    card_number: cleanPublicString(card.number ?? card.card_number ?? card.cardNumber),
    printed_number: cleanPublicString(card.printedNumber ?? card.printed_number ?? card.printedNumberDisplay),
    image_url: cleanPublicString(frontImage.large ?? frontImage.medium ?? frontImage.small ?? card.image_url ?? card.imageUrl),
  }
}

function buildVisionSearchQuery(match, analysis) {
  const name = cleanPublicString(match?.card_name)
  const setName = cleanPublicString(match?.set_name)
  const setCode = cleanPublicString(match?.set_code)
  const number = cleanPublicString(match?.printed_number || match?.card_number)
  const fallback = cleanPublicString(analysis?.graded_details?.cert)

  return [name, setName || setCode, number].filter(Boolean).join(" ").trim() || fallback
}

function firstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value
    }
  }

  return []
}

function cleanGames(value) {
  const values = Array.isArray(value) ? value : String(value ?? "").split(",")
  const games = values.map(cleanGame).filter(Boolean)

  return Array.from(new Set(games)).join(",")
}

function cleanGame(value) {
  const game = String(value ?? "").trim().toLowerCase()
  const aliases = {
    magic: "magicthegathering",
    mtg: "magicthegathering",
    "magic-the-gathering": "magicthegathering",
    one_piece: "onepiece",
    "one-piece": "onepiece",
    "one-piece-card-game": "onepiece",
  }
  const normalized = aliases[game] ?? game

  return ["pokemon", "magicthegathering", "lorcana", "onepiece", "riftbound", "gundam"].includes(normalized)
    ? normalized
    : ""
}

function cleanMimeType(value) {
  const mimeType = String(value ?? "").trim().toLowerCase()

  if (mimeType === "image/jpg") {
    return "image/jpeg"
  }

  return mimeType
}

function cleanSecret(value) {
  return String(value ?? "").trim()
}

function cleanPublicString(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 300)
}

function cleanBaseUrl(value) {
  const raw = String(value ?? DEFAULT_SCRYDEX_VISION_BASE_URL).trim() || DEFAULT_SCRYDEX_VISION_BASE_URL

  try {
    const url = new URL(raw)
    url.pathname = url.pathname.replace(/\/+$/, "")
    url.search = ""
    url.hash = ""

    return url.toString().replace(/\/$/, "")
  } catch {
    return DEFAULT_SCRYDEX_VISION_BASE_URL
  }
}

function boundedTimeoutMs(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)

  if (!Number.isFinite(parsed)) {
    return DEFAULT_SCRYDEX_VISION_TIMEOUT_MS
  }

  return Math.min(60000, Math.max(3000, parsed))
}

function blocked(code, message, extra = {}) {
  return {
    status: "blocked",
    code,
    message,
    credentials_synced_to_client: false,
    raw_credentials_returned: false,
    ...extra,
  }
}
