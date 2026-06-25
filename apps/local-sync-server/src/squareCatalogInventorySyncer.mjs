const DEFAULT_SQUARE_API_VERSION = "2026-05-20"
const SQUARE_PRODUCTION_BASE_URL = "https://connect.squareup.com"
const SQUARE_SANDBOX_BASE_URL = "https://connect.squareupsandbox.com"
const DEFAULT_SQUARE_POS_SINGLES_GAME_CATEGORIES = ["MTG", "Lorcana", "Riftbound", "Pokemon"]

export function createSquareCatalogInventorySyncer(options = {}) {
  const accessToken = cleanSecret(options.accessToken)
  const configuredLocationId = cleanExternalId(options.locationId)
  const environment = cleanEnvironment(options.environment)
  const apiVersion = cleanApiVersion(options.apiVersion)
  const baseUrl = cleanBaseUrl(options.baseUrl) || squareBaseUrl(environment)
  const fetcher = typeof options.fetcher === "function" ? options.fetcher : globalThis.fetch
  const timeoutMs = boundedInt(options.timeoutMs, 2_000, 120_000, 20_000)
  const imageSyncEnabled = options.imageSyncEnabled !== false
  const categoryCache = new Map()

  function status() {
    return {
      configured: Boolean(accessToken && configuredLocationId && typeof fetcher === "function"),
      environment,
      location_id_configured: Boolean(configuredLocationId),
      access_token_configured: Boolean(accessToken),
      api_version: apiVersion,
      write_scope: "catalog_item_variation_category_image_and_physical_inventory_count",
      category_sync_enabled: true,
      default_pos_singles_layout_enabled: true,
      default_pos_singles_categories: ["Singles", ...DEFAULT_SQUARE_POS_SINGLES_GAME_CATEGORIES],
      image_sync_enabled: imageSyncEnabled,
      payment_capture_supported: false,
      payment_capture_authority: "square_pos_or_square_terminal",
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function ensureDefaultSquarePosCategories() {
    const currentStatus = status()

    if (!currentStatus.configured) {
      return skipped(
        "square_catalog_inventory_syncer_unconfigured",
        "Square POS category layout seed skipped because Square catalog inventory sync is not configured.",
        currentStatus,
      )
    }

    const root = await ensureCatalogCategory("Singles")

    if (root.status !== "ok") {
      return root
    }

    const categories = [
      {
        id: root.category_id,
        name: "Singles",
        parent_id: "",
        created: root.created === true,
      },
    ]

    for (const gameCategoryName of DEFAULT_SQUARE_POS_SINGLES_GAME_CATEGORIES) {
      const child = await ensureCatalogCategory(gameCategoryName, root.category_id)

      if (child.status !== "ok") {
        return child
      }

      categories.push({
        id: child.category_id,
        name: gameCategoryName,
        parent_id: root.category_id,
        created: child.created === true,
      })
    }

    return {
      status: "ok",
      code: "square_pos_singles_layout_ready",
      root_category_id: root.category_id,
      categories,
      category_count: categories.length,
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function syncInventoryItem({ operation, item } = {}) {
    const currentStatus = status()

    if (!currentStatus.configured) {
      return skipped(
        "square_catalog_inventory_syncer_unconfigured",
        "Square catalog inventory sync is not configured on this LAN server.",
        currentStatus,
      )
    }

    const plan = buildSquareSyncPlan(operation, item, configuredLocationId)

    if (plan.status !== "ok") {
      return plan
    }

    let catalog = null

    if (plan.square_catalog_variation_id) {
      catalog = await upsertExistingVariation(plan)
    }

    if (!catalog || catalog.status === "not_found") {
      const existing = await findVariationBySku(plan.sku)
      if (existing.status === "ok" && existing.variation_id) {
        catalog = await upsertExistingVariation({
          ...plan,
          square_catalog_item_id: existing.item_id,
          square_catalog_variation_id: existing.variation_id,
          existing_variation_version: existing.version,
        })
      } else if (existing.status === "blocked") {
        return existing
      }
    }

    if (!catalog || catalog.status === "not_found") {
      catalog = await createCatalogItemVariation(plan)
    }

    if (catalog.status !== "ok") {
      return catalog
    }

    const image = await maybeAttachCatalogImage({
      ...plan,
      square_catalog_item_id: catalog.square_catalog_item_id,
      square_catalog_variation_id: catalog.square_catalog_variation_id,
      item_created: catalog.item_created === true,
    })

    if (image.status === "blocked") {
      return image
    }

    const inventory = await setInventoryPhysicalCount({
      ...plan,
      square_catalog_item_id: catalog.square_catalog_item_id,
      square_catalog_variation_id: catalog.square_catalog_variation_id,
    })

    if (inventory.status !== "ok") {
      return inventory
    }

    return {
      status: "ok",
      code: "square_catalog_inventory_synced",
      square_catalog_item_id: catalog.square_catalog_item_id,
      square_catalog_variation_id: catalog.square_catalog_variation_id,
      square_location_id: plan.square_location_id,
      sku: plan.sku,
      quantity_on_hand: plan.square_quantity,
      catalog_http_status: catalog.http_status,
      inventory_http_status: inventory.http_status,
      square_category_ids: plan.square_category_ids,
      square_image_id: image.square_image_id ?? "",
      image_sync_status: image.status,
      image_sync_code: image.code,
      item_created: catalog.item_created === true,
      variation_reused: catalog.variation_reused === true,
      inventory_count_returned: inventory.inventory_count_returned,
      payment_capture_supported: false,
      payment_capture_authority: "square_pos_or_square_terminal",
      credentials_synced_to_client: false,
      raw_credentials_returned: false,
    }
  }

  async function createCatalogItemVariation(plan) {
    const categories = await ensureCatalogCategories(plan)

    if (categories.status !== "ok") {
      return categories
    }

    plan.square_category_ids = categories.square_category_ids
    plan.square_categories = categories.square_categories

    const body = {
      idempotency_key: `${plan.idempotency_key}:catalog:create`,
      batches: [
        {
          objects: [
            {
              type: "ITEM",
              id: "#pug_catalog_item",
              present_at_all_locations: false,
              present_at_location_ids: [plan.square_location_id],
              item_data: {
                name: plan.item_name,
                description: plan.description,
                abbreviation: plan.abbreviation,
                product_type: "REGULAR",
                categories: plan.square_categories,
                variations: [
                  {
                    type: "ITEM_VARIATION",
                    id: "#pug_catalog_variation",
                    present_at_all_locations: false,
                    present_at_location_ids: [plan.square_location_id],
                    item_variation_data: {
                      item_id: "#pug_catalog_item",
                      name: plan.variation_name,
                      sku: plan.sku,
                      pricing_type: "FIXED_PRICING",
                      price_money: {
                        amount: plan.price_minor_units,
                        currency: plan.currency,
                      },
                      track_inventory: true,
                      sellable: true,
                      stockable: true,
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    }
    const result = await squareRequest("/v2/catalog/batch-upsert", { method: "POST", body })

    if (result.status !== "ok") {
      return result
    }

    const ids = extractCatalogIds(result.payload, plan.sku)

    if (!ids.variationId) {
      return blocked("square_catalog_variation_missing", "Square accepted the catalog batch but did not return a variation ID.")
    }

    return {
      status: "ok",
      code: "square_catalog_item_variation_created",
      http_status: result.http_status,
      square_catalog_item_id: ids.itemId,
      square_catalog_variation_id: ids.variationId,
      item_created: true,
      variation_reused: false,
    }
  }

  async function upsertExistingVariation(plan) {
    const current = plan.existing_variation_version
      ? {
          status: "ok",
          square_catalog_item_id: plan.square_catalog_item_id,
          square_catalog_variation_id: plan.square_catalog_variation_id,
          variation_version: plan.existing_variation_version,
        }
      : await retrieveVariation(plan.square_catalog_variation_id)

    if (current.status !== "ok") {
      return current
    }

    if (!current.variation_version || !current.square_catalog_item_id) {
      return { status: "not_found" }
    }

    const body = {
      idempotency_key: `${plan.idempotency_key}:catalog:update`,
      batches: [
        {
          objects: [
            {
              type: "ITEM_VARIATION",
              id: current.square_catalog_variation_id,
              version: current.variation_version,
              present_at_all_locations: false,
              present_at_location_ids: [plan.square_location_id],
              item_variation_data: {
                item_id: current.square_catalog_item_id,
                name: plan.variation_name,
                sku: plan.sku,
                pricing_type: "FIXED_PRICING",
                price_money: {
                  amount: plan.price_minor_units,
                  currency: plan.currency,
                },
                track_inventory: true,
                sellable: true,
                stockable: true,
              },
            },
          ],
        },
      ],
    }
    const result = await squareRequest("/v2/catalog/batch-upsert", { method: "POST", body })

    if (result.status !== "ok") {
      return result
    }

    return {
      status: "ok",
      code: "square_catalog_item_variation_updated",
      http_status: result.http_status,
      square_catalog_item_id: current.square_catalog_item_id,
      square_catalog_variation_id: current.square_catalog_variation_id,
      item_created: false,
      variation_reused: true,
    }
  }

  async function ensureCatalogCategories(plan) {
    const hierarchy = squareCategoryHierarchy(plan)
    const categories = []
    let parentCategoryId = ""

    for (const [index, name] of hierarchy.entries()) {
      const category = await ensureCatalogCategory(name, parentCategoryId, index)

      if (category.status !== "ok") {
        return category
      }

      parentCategoryId = category.category_id
      categories.push({ id: category.category_id })
    }

    return {
      status: "ok",
      code: "square_categories_ready",
      square_category_ids: categories.map((category) => category.id),
      square_categories: categories,
    }
  }

  async function ensureCatalogCategory(name, parentCategoryId = "", ordinal = 0) {
    const safeName = cleanText(name)
    const safeParentCategoryId = cleanExternalId(parentCategoryId)
    const cacheKey = `${safeParentCategoryId || "root"}:${safeName.toLowerCase()}`

    if (categoryCache.has(cacheKey)) {
      return categoryCache.get(cacheKey)
    }

    const search = await squareRequest("/v2/catalog/search", {
      method: "POST",
      body: {
        object_types: ["CATEGORY"],
        query: {
          exact_query: {
            attribute_name: "name",
            attribute_value: safeName,
          },
        },
        limit: 100,
      },
    })

    if (search.status !== "ok") {
      return search
    }

    const existing = (Array.isArray(search.payload?.objects) ? search.payload.objects : []).find((object) => {
      if (object?.type !== "CATEGORY") {
        return false
      }

      const categoryName = cleanText(object?.category_data?.name)
      const categoryType = cleanText(object?.category_data?.category_type || "REGULAR_CATEGORY")
      const parentId = cleanExternalId(object?.category_data?.parent_category?.id)

      return (
        categoryName.toLowerCase() === safeName.toLowerCase() &&
        categoryType === "REGULAR_CATEGORY" &&
        parentId === safeParentCategoryId
      )
    })

    if (existing?.id) {
      const category = {
        status: "ok",
        code: "square_category_reused",
        category_id: cleanExternalId(existing.id),
        category_name: safeName,
        created: false,
        moved: false,
      }
      categoryCache.set(cacheKey, category)
      return category
    }

    const reusableDifferentParent = safeParentCategoryId
      ? (Array.isArray(search.payload?.objects) ? search.payload.objects : []).find((object) => {
          if (object?.type !== "CATEGORY") {
            return false
          }

          const categoryName = cleanText(object?.category_data?.name)
          const categoryType = cleanText(object?.category_data?.category_type || "REGULAR_CATEGORY")

          return categoryName.toLowerCase() === safeName.toLowerCase() && categoryType === "REGULAR_CATEGORY"
        })
      : null

    if (reusableDifferentParent?.id) {
      const moved = await moveCatalogCategoryToParent(reusableDifferentParent, safeName, safeParentCategoryId)

      if (moved.status !== "ok") {
        return moved
      }

      categoryCache.set(cacheKey, moved)
      return moved
    }

    const categoryClientId = `#pug_category_${ordinal}_${safeName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`
    const create = await squareRequest("/v2/catalog/batch-upsert", {
      method: "POST",
      body: {
        idempotency_key: `${cleanIdempotencyKey(`category-${safeParentCategoryId || "root"}-${safeName}`)}:${Date.now()}`,
        batches: [
          {
            objects: [
              {
                type: "CATEGORY",
                id: categoryClientId,
                category_data: {
                  name: safeName,
                  category_type: "REGULAR_CATEGORY",
                  ...(safeParentCategoryId ? { parent_category: { id: safeParentCategoryId } } : {}),
                },
              },
            ],
          },
        ],
      },
    })

    if (create.status !== "ok") {
      return create
    }

    const categoryId = cleanExternalId(
      (Array.isArray(create.payload?.id_mappings)
        ? create.payload.id_mappings.find((row) => row?.client_object_id === categoryClientId)?.object_id
        : "") || "",
    )

    if (!categoryId) {
      return blocked("square_category_id_missing", "Square accepted the category request but did not return a category ID.")
    }

    const category = {
      status: "ok",
      code: "square_category_created",
      category_id: categoryId,
      category_name: safeName,
      created: true,
    }
    categoryCache.set(cacheKey, category)
    return category
  }

  async function moveCatalogCategoryToParent(categoryObject, categoryName, parentCategoryId) {
    const categoryId = cleanExternalId(categoryObject?.id)
    const version = positiveInt(categoryObject?.version)
    const safeParentCategoryId = cleanExternalId(parentCategoryId)

    if (!categoryId || !version || !safeParentCategoryId) {
      return blocked(
        "square_category_reparent_blocked",
        "Square category exists but could not be moved under Singles because its ID, version, or parent category was missing.",
      )
    }

    const update = await squareRequest("/v2/catalog/batch-upsert", {
      method: "POST",
      body: {
        idempotency_key: `${cleanIdempotencyKey(`category-move-${safeParentCategoryId}-${categoryId}`)}:${Date.now()}`,
        batches: [
          {
            objects: [
              {
                type: "CATEGORY",
                id: categoryId,
                version,
                category_data: {
                  name: categoryName,
                  category_type: "REGULAR_CATEGORY",
                  parent_category: { id: safeParentCategoryId },
                },
              },
            ],
          },
        ],
      },
    })

    if (update.status !== "ok") {
      return update
    }

    return {
      status: "ok",
      code: "square_category_moved_under_singles",
      category_id: categoryId,
      category_name: categoryName,
      created: false,
      moved: true,
    }
  }

  async function maybeAttachCatalogImage(plan) {
    if (!imageSyncEnabled) {
      return skipped("square_image_sync_disabled", "Square image sync is disabled for this LAN server.")
    }

    if (plan.item_created !== true) {
      return skipped("square_image_sync_existing_item_skipped", "Existing Square item image upload skipped to avoid duplicates.")
    }

    if (!plan.image_url) {
      return skipped("square_image_url_missing", "No inventory image URL was available for Square image upload.")
    }

    const image = await fetchImageForSquare(plan.image_url)

    if (image.status !== "ok") {
      return image
    }

    return createCatalogImage({
      square_catalog_item_id: plan.square_catalog_item_id,
      idempotency_key: `${plan.idempotency_key}:image`,
      image_name: `${plan.item_name} image`,
      image_caption: `${plan.item_name} ${plan.variation_name}`,
      image,
    })
  }

  async function fetchImageForSquare(imageUrl) {
    const safeImageUrl = cleanHttpUrl(imageUrl)

    if (!safeImageUrl) {
      return skipped("square_image_url_invalid", "The inventory image URL is not a valid http(s) URL.")
    }

    try {
      const response = await fetcher(safeImageUrl, {
        method: "GET",
        headers: {
          accept: "image/png,image/jpeg,image/gif;q=0.9,*/*;q=0.1",
        },
      })

      if (!response?.ok) {
        return skipped("square_image_download_failed", "Square image sync skipped because the card image could not be downloaded.", {
          http_status: Number(response?.status ?? 0),
        })
      }

      const contentType = cleanImageContentType(response.headers?.get?.("content-type"))
      const bytes = await response.arrayBuffer()

      if (!contentType || !bytes || bytes.byteLength <= 0) {
        return skipped("square_image_download_invalid", "Square image sync skipped because the card image was not a supported PNG, JPEG, or GIF.")
      }

      if (bytes.byteLength > 15 * 1024 * 1024) {
        return skipped("square_image_too_large", "Square image sync skipped because the image is larger than 15MB.")
      }

      return {
        status: "ok",
        bytes,
        content_type: contentType,
        file_name: squareImageFileName(safeImageUrl, contentType),
      }
    } catch (error) {
      return skipped("square_image_download_unavailable", "Square image sync skipped because the image request failed.", {
        message: error instanceof Error ? error.message : "Image request failed.",
      })
    }
  }

  async function createCatalogImage({ square_catalog_item_id, idempotency_key, image_name, image_caption, image }) {
    const form = new FormData()
    form.append(
      "request",
      new Blob(
        [
          JSON.stringify({
            idempotency_key,
            object_id: square_catalog_item_id,
            is_primary: true,
            image: {
              type: "IMAGE",
              id: "#pug_catalog_image",
              image_data: {
                name: image_name,
                caption: image_caption,
              },
            },
          }),
        ],
        { type: "application/json" },
      ),
    )
    form.append("image_file", new Blob([image.bytes], { type: image.content_type }), image.file_name)

    const result = await squareMultipartRequest("/v2/catalog/images", { method: "POST", body: form })

    if (result.status !== "ok") {
      return result
    }

    return {
      status: "ok",
      code: "square_catalog_image_attached",
      http_status: result.http_status,
      square_image_id: cleanExternalId(result.payload?.image?.id),
    }
  }

  async function retrieveVariation(variationId) {
    const safeVariationId = cleanExternalId(variationId)

    if (!safeVariationId) {
      return { status: "not_found" }
    }

    const result = await squareRequest(
      `/v2/catalog/object/${encodeURIComponent(safeVariationId)}?include_related_objects=true`,
      { method: "GET" },
      { allowNotFound: true },
    )

    if (result.status === "not_found") {
      return result
    }

    if (result.status !== "ok") {
      return result
    }

    const object = result.payload?.object && typeof result.payload.object === "object" ? result.payload.object : null

    if (!object || object.type !== "ITEM_VARIATION") {
      return { status: "not_found" }
    }

    return {
      status: "ok",
      square_catalog_item_id: cleanExternalId(object.item_variation_data?.item_id),
      square_catalog_variation_id: cleanExternalId(object.id),
      variation_version: positiveInt(object.version),
    }
  }

  async function findVariationBySku(sku) {
    const safeSku = cleanSku(sku)

    if (!safeSku) {
      return { status: "not_found" }
    }

    const body = {
      object_types: ["ITEM_VARIATION"],
      query: {
        exact_query: {
          attribute_name: "sku",
          attribute_value: safeSku,
        },
      },
      limit: 10,
    }
    const result = await squareRequest("/v2/catalog/search", { method: "POST", body })

    if (result.status !== "ok") {
      return result
    }

    const object = (Array.isArray(result.payload?.objects) ? result.payload.objects : []).find(
      (candidate) =>
        candidate?.type === "ITEM_VARIATION" &&
        cleanSku(candidate?.item_variation_data?.sku) === safeSku,
    )

    if (!object) {
      return { status: "not_found" }
    }

    return {
      status: "ok",
      item_id: cleanExternalId(object.item_variation_data?.item_id),
      variation_id: cleanExternalId(object.id),
      version: positiveInt(object.version),
    }
  }

  async function setInventoryPhysicalCount(plan) {
    const body = {
      idempotency_key: `${plan.idempotency_key}:inventory:${plan.square_catalog_variation_id}:${plan.square_quantity}`,
      ignore_unchanged_counts: false,
      changes: [
        {
          type: "PHYSICAL_COUNT",
          physical_count: {
            catalog_object_id: plan.square_catalog_variation_id,
            location_id: plan.square_location_id,
            quantity: String(plan.square_quantity),
            state: "IN_STOCK",
            occurred_at: new Date().toISOString(),
          },
        },
      ],
    }
    const result = await squareRequest("/v2/inventory/changes/batch-create", { method: "POST", body })

    if (result.status !== "ok") {
      return result
    }

    return {
      status: "ok",
      code: "square_inventory_physical_count_set",
      http_status: result.http_status,
      inventory_count_returned: Array.isArray(result.payload?.counts) ? result.payload.counts.length : 0,
    }
  }

  async function squareRequest(pathname, { method = "GET", body = null } = {}, requestOptions = {}) {
    const endpoint = new URL(`${baseUrl}${pathname}`)
    const controller = typeof AbortController === "function" ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      const response = await fetcher(endpoint, {
        method,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
          "square-version": apiVersion,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller?.signal,
      })
      const payload = await safeJson(response)

      if (response.status === 404 && requestOptions.allowNotFound === true) {
        return { status: "not_found", http_status: 404, payload }
      }

      if (!response?.ok) {
        return blocked("square_catalog_inventory_request_failed", "Square rejected the catalog/inventory request.", {
          http_status: Number(response?.status ?? 0),
          endpoint: secretSafeEndpoint(endpoint),
          errors: publicSquareErrors(payload),
        })
      }

      return {
        status: "ok",
        http_status: Number(response.status ?? 200),
        payload,
      }
    } catch (error) {
      return blocked("square_catalog_inventory_request_unavailable", "Square catalog/inventory request unavailable.", {
        message: error instanceof Error ? error.message : "Square request failed.",
        endpoint: secretSafeEndpoint(endpoint),
      })
    } finally {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }

  async function squareMultipartRequest(pathname, { method = "POST", body = null } = {}) {
    const endpoint = new URL(`${baseUrl}${pathname}`)
    const controller = typeof AbortController === "function" ? new AbortController() : null
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      const response = await fetcher(endpoint, {
        method,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${accessToken}`,
          "square-version": apiVersion,
        },
        body: body ?? undefined,
        signal: controller?.signal,
      })
      const payload = await safeJson(response)

      if (!response?.ok) {
        return skipped("square_catalog_image_request_failed", "Square rejected the image upload request.", {
          http_status: Number(response?.status ?? 0),
          endpoint: secretSafeEndpoint(endpoint),
          errors: publicSquareErrors(payload),
        })
      }

      return {
        status: "ok",
        http_status: Number(response.status ?? 200),
        payload,
      }
    } catch (error) {
      return skipped("square_catalog_image_request_unavailable", "Square catalog image request unavailable.", {
        message: error instanceof Error ? error.message : "Square image request failed.",
        endpoint: secretSafeEndpoint(endpoint),
      })
    } finally {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }

  return {
    configured: status().configured,
    status,
    ensureDefaultSquarePosCategories,
    syncInventoryItem,
  }
}

function buildSquareSyncPlan(operation, item, locationId) {
  const publicId = cleanExternalId(item?.public_id ?? operation?.entity_id)
  const rowVersion = positiveInt(item?.row_version) ?? 1
  const sku = cleanSku(item?.barcode ?? item?.sku)
  const cardName = cleanText(item?.card_name)
  const setLabel = cleanText(item?.set_code) || cleanText(item?.set_name)
  const cardNumber = cleanText(item?.printed_number) || cleanText(item?.card_number)
  const itemName = cleanText(
    [gameLabel(item?.game), cardName, setLabel ? `(${setLabel}${cardNumber ? ` ${cardNumber}` : ""})` : ""]
      .filter(Boolean)
      .join(" "),
  )
  const rawOrGraded = cleanRawOrGraded(item?.raw_or_graded)
  const condition = cleanText(item?.condition) || "RAW"
  const gradeLabel = rawOrGraded === "graded"
    ? [cleanText(item?.grading_company), cleanText(item?.grade)].filter(Boolean).join(" ")
    : ""
  const variationName = cleanText(
    [gradeLabel || condition, cleanText(item?.variant), cleanText(item?.finish)].filter(Boolean).join(" / "),
  ) || "Default"
  const priceMinorUnits = boundedMinorUnits(item?.price_minor_units)
  const currency = cleanCurrency(item?.currency)
  const quantityOnHand = inventoryQuantityOnHand(item)
  const status = cleanInventoryStatus(item?.status)
  const posVisibility = cleanVisibility(item?.pos_visibility)
  const squareQuantity = status === "available" && posVisibility === "visible" ? quantityOnHand : 0
  const squareCatalogItemId = cleanExternalId(item?.square_catalog_item_id)
  const squareCatalogVariationId = cleanExternalId(item?.square_catalog_variation_id)
  const imageUrl = cleanHttpUrl(item?.image_url)

  if (!publicId) {
    return blocked("square_inventory_public_id_required", "A local inventory ID is required before Square sync.")
  }

  if (!sku) {
    return blocked("square_inventory_sku_required", "A barcode/SKU is required before Square sync.")
  }

  if (!cardName) {
    return blocked("square_inventory_card_name_required", "A card name is required before Square sync.")
  }

  if (priceMinorUnits <= 0) {
    return blocked("square_inventory_price_required", "A positive sale price is required before Square sync.")
  }

  if (posVisibility !== "visible" && !squareCatalogItemId && !squareCatalogVariationId) {
    return skipped(
      "square_pos_visibility_hidden",
      "This inventory row is hidden from POS and has no existing Square mapping, so Square sync was skipped.",
    )
  }

  const operationId = cleanExternalId(operation?.operation_id)
  const idempotencySeed = cleanIdempotencyKey(operationId || `inventory-${publicId}-v${rowVersion}`)

  return {
    status: "ok",
    idempotency_key: idempotencySeed,
    public_id: publicId,
    item_name: itemName,
    variation_name: variationName,
    description: cleanText(
      [
        item?.set_name,
        item?.printed_number || item?.card_number,
        rawOrGraded === "graded" ? gradeLabel : condition,
        `The Pug inventory ${publicId}`,
      ]
        .filter(Boolean)
        .join(" | "),
    ),
    abbreviation: squareAbbreviation(item?.game, rawOrGraded),
    raw_or_graded: rawOrGraded,
    game: item?.game,
    image_url: imageUrl,
    sku,
    price_minor_units: priceMinorUnits,
    currency,
    square_quantity: squareQuantity,
    square_location_id: locationId,
    square_catalog_item_id: squareCatalogItemId,
    square_catalog_variation_id: squareCatalogVariationId,
  }
}

function squareCategoryHierarchy(plan) {
  const root = plan.raw_or_graded === "graded" ? "Graded" : "Singles"
  const game = squareGameCategoryLabel(plan.game)
  return [...new Set([root, game].filter(Boolean))]
}

function squareGameCategoryLabel(game) {
  const normalized = String(game ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "")

  if (["magic", "mtg", "magicthegathering"].includes(normalized)) {
    return "MTG"
  }

  if (["pokemon", "pokmon"].includes(normalized)) {
    return "Pokemon"
  }

  if (["lorcana", "disneylorcana"].includes(normalized)) {
    return "Lorcana"
  }

  if (["onepiece", "op"].includes(normalized)) {
    return "One Piece"
  }

  if (["riftbound"].includes(normalized)) {
    return "Riftbound"
  }

  if (["gundam"].includes(normalized)) {
    return "Gundam"
  }

  if (["yugioh", "ygo", "yugio"].includes(normalized)) {
    return "Yu-Gi-Oh"
  }

  return "Other Cards"
}

function extractCatalogIds(payload, sku) {
  const mappings = Array.isArray(payload?.id_mappings) ? payload.id_mappings : []
  const objects = Array.isArray(payload?.objects) ? payload.objects : []
  const itemId = cleanExternalId(mappings.find((row) => row?.client_object_id === "#pug_catalog_item")?.object_id)
  let variationId = cleanExternalId(
    mappings.find((row) => row?.client_object_id === "#pug_catalog_variation")?.object_id,
  )

  if (!variationId) {
    for (const object of objects) {
      const variations = Array.isArray(object?.item_data?.variations) ? object.item_data.variations : []
      const matched = variations.find((variation) => cleanSku(variation?.item_variation_data?.sku) === sku)
      if (matched?.id) {
        variationId = cleanExternalId(matched.id)
        break
      }
    }
  }

  return { itemId, variationId }
}

async function safeJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

function skipped(code, message, extra = {}) {
  return {
    status: "skipped",
    code,
    message,
    ...extra,
    credentials_synced_to_client: false,
    raw_credentials_returned: false,
  }
}

function blocked(code, message, extra = {}) {
  return {
    status: "blocked",
    code,
    message,
    ...extra,
    credentials_synced_to_client: false,
    raw_credentials_returned: false,
  }
}

function publicSquareErrors(payload = {}) {
  return (Array.isArray(payload?.errors) ? payload.errors : []).map((error) => ({
    category: String(error?.category ?? ""),
    code: String(error?.code ?? ""),
    detail: String(error?.detail ?? ""),
    field: String(error?.field ?? ""),
  }))
}

function secretSafeEndpoint(endpoint) {
  const safe = new URL(endpoint.toString())
  safe.searchParams.delete("token")
  safe.searchParams.delete("key")
  safe.searchParams.delete("api_key")
  return safe.toString()
}

function squareBaseUrl(environment) {
  return environment === "production" ? SQUARE_PRODUCTION_BASE_URL : SQUARE_SANDBOX_BASE_URL
}

function cleanEnvironment(value) {
  const text = String(value ?? "").trim().toLowerCase()
  return text === "production" || text === "prod" || text === "live" ? "production" : "sandbox"
}

function cleanApiVersion(value) {
  const text = String(value ?? "").trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : DEFAULT_SQUARE_API_VERSION
}

function cleanBaseUrl(value) {
  try {
    const url = new URL(String(value ?? "").trim())
    return url.protocol === "https:" ? url.origin : ""
  } catch {
    return ""
  }
}

function cleanHttpUrl(value) {
  try {
    const url = new URL(String(value ?? "").trim())
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : ""
  } catch {
    return ""
  }
}

function cleanImageContentType(value) {
  const text = String(value ?? "").split(";")[0].trim().toLowerCase()

  if (["image/jpeg", "image/pjpeg", "image/png", "image/gif"].includes(text)) {
    return text
  }

  return ""
}

function squareImageFileName(imageUrl, contentType) {
  let baseName = "pug-card-image"

  try {
    const parsed = new URL(imageUrl)
    const lastSegment = parsed.pathname.split("/").filter(Boolean).pop()
    if (lastSegment) {
      baseName = lastSegment.replace(/\.[^.]+$/, "")
    }
  } catch {
    // Fall through to default.
  }

  const extension =
    contentType === "image/png"
      ? "png"
      : contentType === "image/gif"
        ? "gif"
        : "jpg"

  return `${baseName.replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 80) || "pug-card-image"}.${extension}`
}

function cleanSecret(value) {
  return String(value ?? "").trim()
}

function cleanExternalId(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^\w:./#-]/g, "")
    .slice(0, 220)
}

function cleanIdempotencyKey(value) {
  return cleanExternalId(value).replace(/^#/, "").slice(0, 120) || `pug-square-${Date.now()}`
}

function cleanText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 255)
}

function cleanSku(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9._:-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 128)
}

function cleanRawOrGraded(value) {
  const text = String(value ?? "").trim().toLowerCase()
  return text === "graded" ? "graded" : "raw"
}

function cleanInventoryStatus(value) {
  const status = String(value ?? "").trim().toLowerCase()
  return ["available", "reserved", "sold", "conflict", "pending_intake", "return_review", "damaged", "removed"].includes(status)
    ? status
    : "pending_intake"
}

function cleanVisibility(value) {
  const text = String(value ?? "").trim().toLowerCase()
  return ["hidden", "visible", "staff_only"].includes(text) ? text : "visible"
}

function boundedMinorUnits(value) {
  const parsed = Number.parseInt(String(value ?? "0"), 10)
  return Number.isFinite(parsed) ? Math.max(0, Math.min(99_999_999, parsed)) : 0
}

function boundedInt(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback
}

function positiveInt(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function inventoryQuantityOnHand(item = {}) {
  const parsed = Number.parseInt(String(item?.quantity_on_hand ?? item?.quantity ?? 0), 10)
  return Number.isFinite(parsed) ? Math.max(0, Math.min(999999, parsed)) : 0
}

function cleanCurrency(value) {
  const text = String(value ?? "").trim().toUpperCase()
  return /^[A-Z]{3}$/.test(text) ? text : "USD"
}

function squareAbbreviation(game, rawOrGraded) {
  const prefix = gameAbbreviation(game)
  return `${prefix}${rawOrGraded === "graded" ? "G" : ""}`.slice(0, 24)
}

function gameLabel(value) {
  switch (cleanGame(value)) {
    case "magic":
      return "MTG"
    case "pokemon":
      return "Pokemon"
    case "lorcana":
      return "Lorcana"
    case "onepiece":
      return "One Piece"
    case "riftbound":
      return "Riftbound"
    default:
      return "Card"
  }
}

function gameAbbreviation(value) {
  switch (cleanGame(value)) {
    case "magic":
      return "MTG"
    case "pokemon":
      return "PKM"
    case "lorcana":
      return "LOR"
    case "onepiece":
      return "OP"
    case "riftbound":
      return "RFT"
    default:
      return "PUG"
  }
}

function cleanGame(value) {
  const text = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "")
  if (["mtg", "magic", "magicthegathering"].includes(text)) return "magic"
  if (["pokemon", "pkm"].includes(text)) return "pokemon"
  if (["lorcana"].includes(text)) return "lorcana"
  if (["onepiece", "onepiecetcg"].includes(text)) return "onepiece"
  if (["riftbound"].includes(text)) return "riftbound"
  return text || "other"
}
