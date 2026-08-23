import { environment } from '../../../environments/environment';

// Contract: "all paths below are relative to the API root ... every path already
// includes the /api/v1 prefix" — environment.apiUrl is that root (origin only).
const BASE = `${environment.apiUrl}/api/v1`;

// One function per distinct URL. Several contract endpoints share a URL and differ
// only by HTTP method (e.g. GET/DELETE /cart, PATCH/DELETE /cart/items/{itemId}) —
// those are intentionally covered by a single function below.
export const API_ROUTES = {
  // Identity & Authentication — 10 endpoints
  auth: {
    register: () => `${BASE}/auth/register`,
    login: () => `${BASE}/auth/login`,
    refresh: () => `${BASE}/auth/refresh`,
    logout: () => `${BASE}/auth/logout`,
    logoutAll: () => `${BASE}/auth/logout-all`,
    me: () => `${BASE}/auth/me`,
    sendOtp: () => `${BASE}/auth/otp/send`,
    verifyOtp: () => `${BASE}/auth/otp/verify`,
    forgotPassword: () => `${BASE}/auth/password/forgot`,
    resetPassword: () => `${BASE}/auth/password/reset`,
  },

  // Catalog — storefront — 10 endpoints
  catalog: {
    products: () => `${BASE}/products`,
    productBySlug: (slug: string) => `${BASE}/products/${slug}`,
    relatedProducts: (productId: number) => `${BASE}/products/${productId}/related`,
    featuredProducts: () => `${BASE}/products/featured`,
    newArrivals: () => `${BASE}/products/new-arrivals`,
    variantAvailability: (variantId: number) => `${BASE}/variants/${variantId}/availability`,
    brands: () => `${BASE}/brands`,
    categoryTree: () => `${BASE}/categories/tree`,
    categoryBySlug: (slug: string) => `${BASE}/categories/${slug}`,
    categoryFilters: () => `${BASE}/categories/filters`,
  },

  // Cart & Checkout (customer-facing) — 7 endpoints
  cart: {
    guestToken: () => `${BASE}/cart/guest-token`,
    // GET (fetch) and DELETE (clear) both use this path.
    cart: () => `${BASE}/cart`,
    items: () => `${BASE}/cart/items`,
    // PATCH (update quantity) and DELETE (remove line) both use this path.
    item: (itemId: number) => `${BASE}/cart/items/${itemId}`,
    merge: () => `${BASE}/cart/merge`,
  },

  // Orders — customer — 5 endpoints
  orders: {
    place: () => `${BASE}/orders`,
    myOrders: () => `${BASE}/me/orders`,
    myOrderByNumber: (orderNumber: string) => `${BASE}/me/orders/${orderNumber}`,
    cancelMyOrder: (orderNumber: string) => `${BASE}/me/orders/${orderNumber}/cancel`,
    myInvoicePdf: (invoiceNumber: string) => `${BASE}/me/invoices/${invoiceNumber}/pdf`,
  },

  // Customers & Addresses (customer-facing) — 5 endpoints
  addresses: {
    // GET (list) and POST (create) both use this path.
    addresses: () => `${BASE}/me/addresses`,
    // PUT (update) and DELETE (remove) both use this path.
    address: (addressId: number) => `${BASE}/me/addresses/${addressId}`,
    setDefault: (addressId: number) => `${BASE}/me/addresses/${addressId}/default`,
  },

  // Shipping & Geography (customer-facing) — 2 endpoints
  geo: {
    governorates: () => `${BASE}/geo/governorates`,
  },
  shipping: {
    quote: () => `${BASE}/shipping/quote`,
  },

  // Admin — 58 endpoints
  admin: {
    dashboard: () => `${BASE}/admin/dashboard`,

    // Catalog — admin — products (12 endpoints)
    products: {
      // GET (list) and POST (create) both use this path.
      products: () => `${BASE}/admin/products`,
      // GET (one) and PUT (update) both use this path.
      product: (productId: number) => `${BASE}/admin/products/${productId}`,
      publish: (productId: number) => `${BASE}/admin/products/${productId}/publish`,
      unpublish: (productId: number) => `${BASE}/admin/products/${productId}/unpublish`,
      archive: (productId: number) => `${BASE}/admin/products/${productId}/archive`,
      duplicate: (productId: number) => `${BASE}/admin/products/${productId}/duplicate`,
      // GET (list) and POST (upload) both use this path.
      images: (productId: number) => `${BASE}/admin/products/${productId}/images`,
      // PUT (update) and DELETE (remove) both use this path.
      image: (productId: number, imageId: number) => `${BASE}/admin/products/${productId}/images/${imageId}`,
    },

    // Catalog — admin — variants (4 endpoints)
    variants: {
      // GET (list) and POST (bulk create/update) both use this path.
      byProduct: (productId: number) => `${BASE}/admin/products/${productId}/variants`,
      preview: (productId: number) => `${BASE}/admin/products/${productId}/variants/preview`,
      variant: (variantId: number) => `${BASE}/admin/variants/${variantId}`,
    },

    // Catalog — admin — taxonomy: categories, brands, attributes (9 endpoints)
    categories: {
      // GET (list) and POST (create) both use this path.
      categories: () => `${BASE}/admin/categories`,
      category: (categoryId: number) => `${BASE}/admin/categories/${categoryId}`,
    },
    brands: {
      // GET (list) and POST (create) both use this path.
      brands: () => `${BASE}/admin/brands`,
      brand: (brandId: number) => `${BASE}/admin/brands/${brandId}`,
    },
    attributes: {
      // GET (list) and POST (create) both use this path.
      attributes: () => `${BASE}/admin/attributes`,
      attribute: (attributeId: number) => `${BASE}/admin/attributes/${attributeId}`,
    },

    // Inventory — admin (6 endpoints)
    inventory: {
      // Full paginated list — q/lowStockOnly/outOfStockOnly/categoryId/sort/page/size.
      list: () => `${BASE}/admin/inventory`,
      position: (variantId: number) => `${BASE}/admin/inventory/${variantId}`,
      lowStock: () => `${BASE}/admin/inventory/low-stock`,
      receive: (variantId: number) => `${BASE}/admin/inventory/${variantId}/receive`,
      adjust: (variantId: number) => `${BASE}/admin/inventory/${variantId}/adjust`,
      movements: () => `${BASE}/admin/inventory/movements`,
    },

    // Orders — admin (6 endpoints)
    orders: {
      orders: () => `${BASE}/admin/orders`,
      order: (orderId: number) => `${BASE}/admin/orders/${orderId}`,
      confirm: (orderId: number) => `${BASE}/admin/orders/${orderId}/confirm`,
      fulfillmentStatus: (orderId: number) => `${BASE}/admin/orders/${orderId}/fulfillment-status`,
      paymentStatus: (orderId: number) => `${BASE}/admin/orders/${orderId}/payment-status`,
      cancel: (orderId: number) => `${BASE}/admin/orders/${orderId}/cancel`,
    },

    // Customers — admin (2 endpoints)
    customers: {
      customers: () => `${BASE}/admin/customers`,
      customer: (customerId: number) => `${BASE}/admin/customers/${customerId}`,
    },

    // Invoices — admin (6 endpoints)
    invoices: {
      invoices: () => `${BASE}/admin/invoices`,
      invoice: (invoiceId: number) => `${BASE}/admin/invoices/${invoiceId}`,
      pdf: (invoiceId: number) => `${BASE}/admin/invoices/${invoiceId}/pdf`,
      issue: (orderId: number) => `${BASE}/admin/invoices/issue/${orderId}`,
      cancel: (invoiceId: number) => `${BASE}/admin/invoices/${invoiceId}/cancel`,
      uninvoiced: () => `${BASE}/admin/invoices/reconciliation/uninvoiced`,
    },

    // Shipping & Geography — admin (2 endpoints)
    shipping: {
      zones: () => `${BASE}/admin/shipping/zones`,
      rates: () => `${BASE}/admin/shipping/rates`,
    },

    // Audit Log — admin (2 endpoints)
    audit: {
      audit: () => `${BASE}/admin/audit`,
      byEntity: (entityType: string, entityId: string) => `${BASE}/admin/audit/${entityType}/${entityId}`,
    },

    // Export — admin (2 endpoints)
    exports: {
      accounting: () => `${BASE}/admin/exports/orders/accounting`,
      pickingList: () => `${BASE}/admin/exports/orders/picking-list`,
    },

    // Store Profile — admin (2 endpoints, both this path)
    settings: {
      storeProfile: () => `${BASE}/admin/settings/store-profile`,
    },

    // Remittance (COD Settlement) — admin (5 endpoints)
    remittances: {
      outstanding: () => `${BASE}/admin/remittances/outstanding`,
      // GET (list) and POST (create) both use this path.
      remittances: () => `${BASE}/admin/remittances`,
      remittance: (remittanceId: number) => `${BASE}/admin/remittances/${remittanceId}`,
      cancel: (remittanceId: number) => `${BASE}/admin/remittances/${remittanceId}/cancel`,
    },
  },

  // Health Check — 1 endpoint
  system: {
    ping: () => `${BASE}/ping`,
  },
} as const;
