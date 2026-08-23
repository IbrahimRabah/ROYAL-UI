// Page sizes, limits and other numeric config pulled from the API contract —
// no service should hardcode a page size or limit, it must read it from here.
export const APP_CONFIG = {
  pagination: {
    // GET /products, /products/{id}/related is a fixed limit of 8, not paginated (see relatedProducts below)
    products: { size: 24, maxSize: 60 },
    // GET /products/featured, /products/new-arrivals
    featuredProducts: { size: 12, maxSize: 60 },
    newArrivals: { size: 12, maxSize: 60 },
    // GET /admin/products
    adminProducts: { size: 20 },
    // GET /me/orders
    myOrders: { size: 10 },
    // GET /admin/orders
    adminOrders: { size: 20 },
    // GET /admin/customers
    adminCustomers: { size: 25 },
    // GET /admin/invoices
    invoices: { size: 20 },
    // GET /admin/inventory
    inventory: { size: 20 },
    // GET /admin/remittances
    remittances: { size: 20 },
    // GET /admin/inventory/movements
    inventoryMovements: { size: 50 },
    // GET /admin/audit, /admin/audit/{entityType}/{entityId}
    audit: { size: 50 },
  },

  cart: {
    // POST /cart already at 50 distinct lines -> 400 VALIDATION_FAILED
    maxLines: 50,
    // POST /cart/items, PATCH /cart/items/{itemId}
    minQuantityPerLine: 1,
    maxQuantityPerLine: 99,
  },

  addresses: {
    // POST /me/addresses already has 10 saved addresses -> 400 VALIDATION_FAILED
    maxSaved: 10,
  },

  productImages: {
    // POST /admin/products/{id}/images already has 20 images -> 400 VALIDATION_FAILED
    maxCount: 20,
    maxSizeBytes: 5 * 1024 * 1024,
  },

  relatedProducts: {
    // GET /products/{id}/related — fixed internal limit, not paginated
    limit: 8,
  },

  variantPreview: {
    // POST /admin/products/{productId}/variants/preview — capped combinations
    maxCombinations: 200,
  },

  otp: {
    // POST /auth/otp/verify — code is exactly 6 digits
    codeLength: 6,
    // 400 OTP_EXPIRED after this many minutes
    expiryMinutes: 10,
    // 429 OTP_TOO_MANY_ATTEMPTS at 5+ requests/hour for the same destination
    maxRequestsPerHour: 5,
  },

  auth: {
    // POST /auth/register, /auth/password/reset — password length bounds
    passwordMinLength: 8,
    passwordMaxLength: 72,
    // Documented default from AuthResponse.expiresIn — always read the real value from
    // the response; this is only a fallback for UI session-timeout hints.
    defaultAccessTokenExpiresInSeconds: 1800,
  },

  exports: {
    // GET /admin/exports/orders/accounting
    accountingMaxRows: 5000,
    // GET /admin/exports/orders/picking-list
    pickingListMaxOrders: 300,
  },

  priceFilter: {
    // GET /categories/filters always returns minPrice/maxPrice = null (not implemented
    // server-side) — these bounds are the fixed client-side fallback per the build plan.
    min: 0,
    max: 50000,
  },

  contact: {
    // Not a contract endpoint — direct customer-support details used on the About and
    // Contact pages. There is no contact-form endpoint, so these are the only channels.
    whatsappUrl: 'https://wa.me/201090386165',
    phone: '01090386165',
    email: 'ibrahimrabah25@gmail.com',
  },
} as const;
