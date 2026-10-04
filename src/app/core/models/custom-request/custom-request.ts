export type CustomRequestType = 'SIZE_VARIANT' | 'MADE_TO_ORDER' | 'CUSTOM_WORK';

/** CONVERTED exists in the contract but is refused for now — never offered. */
export type CustomRequestStatus = 'NEW' | 'CONTACTED' | 'QUOTED' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED';

export const CUSTOM_REQUEST_TYPES: CustomRequestType[] = ['SIZE_VARIANT', 'MADE_TO_ORDER', 'CUSTOM_WORK'];
export const CUSTOM_REQUEST_PIPELINE: CustomRequestStatus[] = ['NEW', 'CONTACTED', 'QUOTED', 'ACCEPTED', 'REJECTED'];

export interface CustomRequestSummary {
  id: number;
  requestNumber: string;
  type: CustomRequestType;
  status: CustomRequestStatus;
  contactName: string;
  /** Local format, for display. */
  phone: string;
  governorateName?: string | null;
  quantity: number;
  quotedAmount?: number | string | null;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomRequestProductRef {
  id: number;
  slug: string;
  name: string;
  fulfillmentType: string;
}

export interface CustomRequestAttachment {
  id: number;
  url: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface CustomRequestDetail {
  id: number;
  requestNumber: string;
  type: CustomRequestType;
  status: CustomRequestStatus;
  product?: CustomRequestProductRef | null;
  customerId?: number | null;
  contactName: string;
  phone: string;
  altPhone?: string | null;
  email?: string | null;
  governorateId: number;
  governorateName?: string | null;
  /** false = we don't deliver there right now. Worked out on every read. */
  governorateServed: boolean;
  area?: string | null;
  streetAddress?: string | null;
  widthCm?: number | null;
  heightCm?: number | null;
  depthCm?: number | null;
  quantity: number;
  notes?: string | null;
  attachments: CustomRequestAttachment[];
  /** Only the LATEST quote / note — earlier ones live in the audit log. */
  quotedAmount?: number | string | null;
  adminNote?: string | null;
  convertedOrderId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomRequestListFilter {
  status?: CustomRequestStatus;
  type?: CustomRequestType;
  governorateId?: number | null;
  q?: string;
  from?: string;
  to?: string;
}

export interface CustomRequestStatusRequest {
  status: CustomRequestStatus;
  /** Required for REJECTED. */
  note?: string;
}

export interface CustomRequestQuoteRequest {
  /** Tax-inclusive total for the whole request, all units. > 0, at most 100,000,000. */
  amount: number;
  note?: string;
}
