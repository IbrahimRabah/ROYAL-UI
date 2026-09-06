export const APP_CONFIG = {
  pagination: {
    products: { size: 24, maxSize: 60 },
    featuredProducts: { size: 12, maxSize: 60 },
    newArrivals: { size: 12, maxSize: 60 },
    adminProducts: { size: 20 },
    myOrders: { size: 10 },
    adminOrders: { size: 20 },
    adminCustomers: { size: 25 },
    invoices: { size: 20 },
    inventory: { size: 20 },
    remittances: { size: 20 },
    inventoryMovements: { size: 50 },
    audit: { size: 50 },
  },

  cart: {
    maxLines: 50,
    minQuantityPerLine: 1,
    maxQuantityPerLine: 99,
  },

  addresses: {
    maxSaved: 10,
  },

  productImages: {
    maxCount: 20,
    maxSizeBytes: 5 * 1024 * 1024,
  },

  relatedProducts: {
    limit: 8,
  },

  variantPreview: {
    maxCombinations: 200,
  },

  otp: {
    codeLength: 6,
    expiryMinutes: 10,
    maxRequestsPerHour: 5,
  },

  auth: {
    passwordMinLength: 8,
    passwordMaxLength: 72,
    defaultAccessTokenExpiresInSeconds: 1800,
  },

  exports: {
    accountingMaxRows: 5000,
    pickingListMaxOrders: 300,
  },

  priceFilter: {
    min: 0,
    max: 50000,
  },

  contact: {
    whatsappUrl: 'https://wa.me/201090386165',
    phone: '01090386165',
    email: 'ibrahimrabah25@gmail.com',
  },
} as const;
