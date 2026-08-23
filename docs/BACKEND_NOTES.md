# Backend Notes

Known gaps between the frontend and the current API contract, and requested
backend changes. Not authoritative — the API contract
(`__VELORA_API_Contract_last.txt`) always wins on what the backend actually
does today.

1. **`ProductSummaryResponse` has no secondary/hover image.** The product
   card (`vl-product-card`) is ready to crossfade to a `hoverImageUrl` on
   hover/focus (markup + CSS already in place, commented out) as soon as the
   field exists on `GET /products` (and `/products/featured`,
   `/products/new-arrivals`, `/products/{id}/related`).

2. **Category banner/new-arrivals images are bound to fixed frontend slugs,
   not served by the API.** `CategoryDetailResponse.bannerUrl` exists on the
   contract but isn't used — the product listing page (`/products`) instead
   builds a local asset path client-side from the category's own slug:
   `assets/images/products/{parentSlug}/{scopeSlug}/banner.png` (and
   `new-arrivals.png` for the promo banner), where `parentSlug` is the
   top-level category's slug and `scopeSlug` is the child's slug or
   `all-{parentSlug}` for the parent/no-category view. A category added from
   the admin panel will render with no banner (hidden gracefully, never a
   broken `<img>`) until a matching image folder is added under
   `src/assets/images/products/` and the app is rebuilt. The proper fix is to
   actually serve `bannerUrl`/`imageUrl` from the category record — the
   backend already returns these fields, the frontend just isn't using them
   for this page yet, by design, until image management moves server-side.

3. **RESOLVED — `productCount` added to `CategoryNode`.** The product listing
   page's "Category" filter (radio rows with a count) and the child-category
   strip used to derive counts by firing one `GET /products?categoryId={id}&
   size=1` per candidate category and reading `totalElements` (N extra
   requests per page load, N = sibling/child count, typically 2-4). Categories
   now return `productCount` directly, so `product-list-page` reads
   `node.productCount` and the whole `categoryCounts`/`loadCategoryCounts()`
   workaround (signal, effect, `forkJoin` fan-out) has been removed.
   Field-name note: at the time this was wired, the local contract snapshot
   (`__VELORA_API_Contract_last.txt`) still showed no `productCount` on
   `CategoryNode`/`CategoryDetailResponse` in its example JSON — only on
   attribute values (`/products/{slug}` `variantOptions`, `/categories/filters`
   facets). Wired under the assumption the backend used the same field name
   already established for that analogous case, since that's also the exact
   name this doc requested. Worth a quick contract-doc refresh so this isn't
   re-flagged next audit.

4. **RESOLVED — `GET /categories/filters` no longer duplicates attribute
   values.** Previously every `AttributeGroupResponse.values` row came back
   repeated with an identical `id` (a cartesian-product-from-a-join-without-
   `DISTINCT` bug). Confirmed fixed. The client-side dedupe added as a
   workaround (`CatalogApiService.getFilters()` deduping `brands` and every
   attribute group's `values` by `id`) is now redundant but left in place as
   a harmless safety net — a no-op against a clean response, cheap insurance
   if the bug ever regresses.

5. **RESOLVED — STRAP_TYPE filtering works.** Root cause was deeper than
   first diagnosed: STRAP_TYPE is a specification attribute (not
   variant-defining), stored on `product_attribute_value`, but the filter
   query only searched the variant table — so no variant ever matched
   regardless of data. Both the filter (`GET /products?attributeValueIds=`)
   and the facet (`GET /categories/filters`) are fixed.

6. **RESOLVED — `ProductAdminResponse` now returns `translations[]`.** Previously
   `GET`/`PUT /admin/products/{id}` only returned `nameAr`/`nameEn`, with no
   `shortDescription`/`description`/`metaTitle`/`metaDescription` per locale —
   editing an existing product's name risked silently wiping those fields on
   save, since `PUT` fully replaces the translation set. The backend now
   returns `translations[]` on the response, one object per locale, in the
   same shape as the request (`locale`, `name`, `shortDescription`,
   `description`, `metaTitle`, `metaDescription`). `product-form-page` reads
   it directly with no reshaping; the read-only-field warning that used to
   sit above the Details tab's language panels has been removed.

   **Standing constraint — this is a full replace, not a patch.** Two rules
   apply globally, not just to this endpoint:
   - Null fields are **omitted from the response JSON entirely** — a field
     with no value is a missing key, never an explicit `null`. Treat a
     missing key as `''` when populating a form; it is not an error or a
     schema gap.
   - `PUT` replaces each locale's translation object wholesale. Every save
     must send all six fields for every locale present, including ones the
     operator never touched — anything omitted is wiped to `null` server-side.
     `product-form-page.buildRequest()` always sends all six keys (defaulting
     blanks to `''`, never omitting a key) for exactly this reason.

7. **RESOLVED — `invoiceNumber` added to `OrderResponse`.** Verified by the
   backend with a real order: `null` while `SHIPPED`, populated once
   `DELIVERED` (e.g. `"VLR-INV-2026-000031"`). `order-details-page`
   (customer-facing) now renders the Invoice section — `<app-invoice-
   download-button>` — only `*ngIf="o.invoiceNumber"`, so it stays hidden
   until an invoice actually exists; the button component itself was already
   built and functional, it just had no caller before this.

8. **Attributes not scoped to categories — deferred, not a bug.** No change:
   `GET /admin/attributes` still returns every variant-defining attribute
   regardless of product, so an operator generating variants for a watch is
   offered perfume volumes and vice versa (nonsensical SKUs like a 100ml
   watch remain possible). Confirmed there is no Attribute↔Category link
   anywhere in the schema — adding one is a data-modeling decision being
   deferred deliberately, not an oversight. The obvious-looking quick fix
   (only offer attributes that already have data in that category) was
   considered and rejected: it has a fatal cold-start problem — the first
   product ever added to a new category would find zero attributes on offer,
   since none exist there yet. Frontend workaround stays as-is until a real
   link exists: `product-variants-tab`'s "Add variants" picker groups values
   by attribute with clear headings and shows a `--warn`-tinted note telling
   the operator to select only what actually applies — no client-side
   guessing at which attribute belongs to which category.

9. **RESOLVED — `ProductAdminResponse` now returns `specifications`.**
   `GET /admin/products/{id}` echoes back what was saved, same shape as the
   request (`attributeId`/`attributeValueId`/`valueText`), confirmed on a
   real product (`10167`). Per the API's global omit-null convention,
   `attributeValueId`/`valueText` are omitted entirely when null rather than
   sent as an explicit null (e.g. `{ "attributeId": 10051,
   "attributeValueId": 53 }` — no `valueText` key at all). `product-form-page`
   now normalizes both keys to `null` when absent before handing rows to
   `product-specs-tab` — see item 12, which was the actual frontend gap this
   surfaced (the model didn't declare the field and the tab never read it,
   so the newly-available data still weren't reaching the UI).

10. **`product-specs-tab` now branches on `dataType` — was the actual cause of
    the 409 `DUPLICATE_VALUE` errors on `LIST` attributes.** Every spec row
    used to render a free-text input regardless of `dataType`, so saving a
    `LIST` attribute (e.g. `STRAP_TYPE`, id `10051`, values `53`/`54`/`55`)
    sent `valueText: "معدن"` instead of `attributeValueId: 53` — the backend
    tried to create a new value with that name and rejected the duplicate.
    Fixed: `LIST` attributes render a `p-select` of that attribute's
    `values[]` and send `attributeValueId` with `valueText: null`;
    `TEXT`/`NUMBER`/`BOOLEAN` render the free-text input and send `valueText`
    with `attributeValueId: null`. Verified against a mocked backend with the
    real confirmed shapes (`STRAP_TYPE`/`LIST`/values 53–55,
    `MATERIAL`/`TEXT`) — the outgoing `PUT` body for a `STRAP_TYPE = Metal`
    row is `{"attributeId":10051,"attributeValueId":53,"valueText":null}`, as
    specified.

11. **RESOLVED — the suspected `TEXT`-spec inner-join bug did not
    materialize; both `LIST` and `TEXT` specs come back from the storefront.**
    Confirmed directly: `GET /products/velora-chrono-classic` returns
    `"specifications": [{ "code": "STRAP_TYPE", ..., "value": "Metal" },
    { "code": "MATERIAL", ..., "value": "fsfds" }]` — `MATERIAL` (`TEXT`,
    null `attributeValueId`) is present alongside `STRAP_TYPE` (`LIST`), so
    whatever the earlier concern was, it isn't dropping null-attributeValueId
    rows. `product-tabs`/`product-specs-table` (storefront) render both
    correctly — see the PDP two-tab-bar task. The one remaining gap was
    entirely frontend: the admin Specifications tab wasn't reading the
    saved specs back in at all — see item 12.

12. **RESOLVED — the admin Specifications tab now pre-populates from the
    saved product, instead of always starting empty.** Two compounding gaps,
    both frontend: `ProductAdminResponse` (core/models) didn't declare
    `specifications` even after the backend started returning it (item 9),
    and `product-specs-tab` never read `product.specifications` into its
    `rows` state to begin with — rows only ever grew via the operator's own
    "Add specification" clicks. A product with real saved specs (confirmed
    on `10167`: `STRAP_TYPE = Metal`, `MATERIAL = "fsfds"`) still showed the
    tab's empty state. Fixed by declaring the field and seeding
    `product-form-page`'s `specRows` signal from
    `p.specifications` on fetch (normalizing the omitted-when-null keys per
    the convention above). Two related follow-ups landed in the same pass:
    the "Add specification" dropdown already excluded attributes present in
    `rows`, so it now correctly excludes already-set attributes too (that
    exclusion was silently inert while `rows` always started empty) — it's
    now disabled with an inline note when none remain; and the tab's own
    independent "Save specifications" button was removed, since
    specifications ride the same full-replace `PUT` as the Details form —
    `specRows` was lifted into `product-form-page` and the single top-level
    Save now sends both in one request. Verified against a mocked backend
    with the exact reported payload: both rows render pre-filled, the add
    dropdown is disabled with the note, only one Save button exists, and
    clicking it PUTs `specifications` correctly alongside the rest of the
    body.
