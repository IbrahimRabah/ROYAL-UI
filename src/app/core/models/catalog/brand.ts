// logoUrl nullable — confirmed by GET /admin/brands example ("retired-brand" -> logoUrl: null).
// Storefront shape only (GET /brands). GET /admin/brands returns a different shape
// (BrandAdminResponse, catalog/admin/brand-admin.ts) — nameAr/nameEn instead of a single
// already-translated `name`, plus `active`. Do not reuse between the two.
export interface BrandResponse {
  id: number;
  slug: string;
  name: string;
  logoUrl: string | null;
}
