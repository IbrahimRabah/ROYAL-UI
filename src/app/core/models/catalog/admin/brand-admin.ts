export interface BrandUpsertRequest {
  slug?: string;
  nameAr: string;
  nameEn: string;
  logoUrl?: string | null;
  active?: boolean;
}
export interface BrandAdminResponse {
  id: number;
  slug: string;
  nameAr: string;
  nameEn: string;
  logoUrl: string | null;
  active: boolean;
}
