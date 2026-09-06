import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/api/v1`;

export const API_ROUTES = {
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

  cart: {
    guestToken: () => `${BASE}/cart/guest-token`,
    cart: () => `${BASE}/cart`,
    items: () => `${BASE}/cart/items`,
    item: (itemId: number) => `${BASE}/cart/items/${itemId}`,
    merge: () => `${BASE}/cart/merge`,
  },

  orders: {
    place: () => `${BASE}/orders`,
    myOrders: () => `${BASE}/me/orders`,
    myOrderByNumber: (orderNumber: string) => `${BASE}/me/orders/${orderNumber}`,
    cancelMyOrder: (orderNumber: string) => `${BASE}/me/orders/${orderNumber}/cancel`,
    myInvoicePdf: (invoiceNumber: string) => `${BASE}/me/invoices/${invoiceNumber}/pdf`,
  },

  addresses: {
    addresses: () => `${BASE}/me/addresses`,
    address: (addressId: number) => `${BASE}/me/addresses/${addressId}`,
    setDefault: (addressId: number) => `${BASE}/me/addresses/${addressId}/default`,
  },

  geo: {
    governorates: () => `${BASE}/geo/governorates`,
  },
  shipping: {
    quote: () => `${BASE}/shipping/quote`,
  },

  admin: {
    dashboard: () => `${BASE}/admin/dashboard`,

    products: {
      products: () => `${BASE}/admin/products`,
      product: (productId: number) => `${BASE}/admin/products/${productId}`,
      publish: (productId: number) => `${BASE}/admin/products/${productId}/publish`,
      unpublish: (productId: number) => `${BASE}/admin/products/${productId}/unpublish`,
      archive: (productId: number) => `${BASE}/admin/products/${productId}/archive`,
      duplicate: (productId: number) => `${BASE}/admin/products/${productId}/duplicate`,
      images: (productId: number) => `${BASE}/admin/products/${productId}/images`,
      image: (productId: number, imageId: number) => `${BASE}/admin/products/${productId}/images/${imageId}`,
    },

    variants: {
      byProduct: (productId: number) => `${BASE}/admin/products/${productId}/variants`,
      preview: (productId: number) => `${BASE}/admin/products/${productId}/variants/preview`,
      variant: (variantId: number) => `${BASE}/admin/variants/${variantId}`,
    },

    categories: {
      categories: () => `${BASE}/admin/categories`,
      category: (categoryId: number) => `${BASE}/admin/categories/${categoryId}`,
    },
    brands: {
      brands: () => `${BASE}/admin/brands`,
      brand: (brandId: number) => `${BASE}/admin/brands/${brandId}`,
    },
    attributes: {
      attributes: () => `${BASE}/admin/attributes`,
      attribute: (attributeId: number) => `${BASE}/admin/attributes/${attributeId}`,
    },

    inventory: {
      list: () => `${BASE}/admin/inventory`,
      position: (variantId: number) => `${BASE}/admin/inventory/${variantId}`,
      lowStock: () => `${BASE}/admin/inventory/low-stock`,
      receive: (variantId: number) => `${BASE}/admin/inventory/${variantId}/receive`,
      adjust: (variantId: number) => `${BASE}/admin/inventory/${variantId}/adjust`,
      movements: () => `${BASE}/admin/inventory/movements`,
    },

    orders: {
      orders: () => `${BASE}/admin/orders`,
      order: (orderId: number) => `${BASE}/admin/orders/${orderId}`,
      confirm: (orderId: number) => `${BASE}/admin/orders/${orderId}/confirm`,
      fulfillmentStatus: (orderId: number) => `${BASE}/admin/orders/${orderId}/fulfillment-status`,
      paymentStatus: (orderId: number) => `${BASE}/admin/orders/${orderId}/payment-status`,
      cancel: (orderId: number) => `${BASE}/admin/orders/${orderId}/cancel`,
    },

    customers: {
      customers: () => `${BASE}/admin/customers`,
      customer: (customerId: number) => `${BASE}/admin/customers/${customerId}`,
    },

    invoices: {
      invoices: () => `${BASE}/admin/invoices`,
      invoice: (invoiceId: number) => `${BASE}/admin/invoices/${invoiceId}`,
      pdf: (invoiceId: number) => `${BASE}/admin/invoices/${invoiceId}/pdf`,
      issue: (orderId: number) => `${BASE}/admin/invoices/issue/${orderId}`,
      cancel: (invoiceId: number) => `${BASE}/admin/invoices/${invoiceId}/cancel`,
      uninvoiced: () => `${BASE}/admin/invoices/reconciliation/uninvoiced`,
    },

    shipping: {
      zones: () => `${BASE}/admin/shipping/zones`,
      rates: () => `${BASE}/admin/shipping/rates`,
    },

    audit: {
      audit: () => `${BASE}/admin/audit`,
      byEntity: (entityType: string, entityId: string) => `${BASE}/admin/audit/${entityType}/${entityId}`,
    },

    exports: {
      accounting: () => `${BASE}/admin/exports/orders/accounting`,
      pickingList: () => `${BASE}/admin/exports/orders/picking-list`,
    },

    settings: {
      storeProfile: () => `${BASE}/admin/settings/store-profile`,
    },

    remittances: {
      outstanding: () => `${BASE}/admin/remittances/outstanding`,
      remittances: () => `${BASE}/admin/remittances`,
      remittance: (remittanceId: number) => `${BASE}/admin/remittances/${remittanceId}`,
      cancel: (remittanceId: number) => `${BASE}/admin/remittances/${remittanceId}/cancel`,
    },
  },

  system: {
    ping: () => `${BASE}/ping`,
  },
} as const;
