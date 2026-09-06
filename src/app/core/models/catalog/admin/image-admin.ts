export interface AdminImageResponse {
  id: number;
  key: string;
  url: string;
  thumbUrl: string | null;
  altTextAr: string;
  altTextEn: string;
  main: boolean;
  displayOrder: number;
  variantId: number | null;
}

export interface ImageUpdateRequest {
  variantId?: number | null;
  altTextAr?: string | null;
  altTextEn?: string | null;
  main?: boolean;
  displayOrder?: number;
}
