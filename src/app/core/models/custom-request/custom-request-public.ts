/**
 * Public POST /custom-requests. Without a product the form offers CUSTOM_WORK and MADE_TO_ORDER
 * (SIZE_VARIANT needs a productId, so it is only sent from a product page). Optional fields are omitted when empty.
 */
export interface CustomRequestCreateRequest {
  type: 'CUSTOM_WORK' | 'MADE_TO_ORDER' | 'SIZE_VARIANT';
  /** A product id (not a variant). The server validates it; PRODUCT_NOT_FOUND if draft/archived/unknown. */
  productId?: number;
  contactName: string;
  phone: string;
  governorateId: number;
  email?: string;
  area?: string;
  streetAddress?: string;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  quantity?: number;
  notes?: string;
}

export interface CustomRequestCreated {
  id: number;
  /** Shown exactly as returned (e.g. REQ-2026-000001) — never rebuilt client-side. */
  requestNumber: string;
  status: string;
  attachmentToken?: string | null;
  attachmentTokenExpiresAt?: string | null;
  createdAt: string;
}

export interface CustomRequestAttachmentResponse {
  id: number;
  url: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}
