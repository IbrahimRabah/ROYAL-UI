// POST /admin/brands, PUT /admin/brands/{id}
export interface BrandUpsertRequest {
  slug?: string;
  nameAr: string;
  nameEn: string;
  logoUrl?: string | null;
  active?: boolean;
}

// GET /admin/brands — the real admin DTO, distinct from the storefront's BrandResponse
// (GET /brands): brands have no separate translation table, so nameAr/nameEn are two
// direct fields here, not a translations[] array like categories/products/attributes.
// No displayOrder either — brands sort by name, there's no such column.
export interface BrandAdminResponse {
  id: number;
  slug: string;
  nameAr: string;
  nameEn: string;
  logoUrl: string | null;
  active: boolean;
}
