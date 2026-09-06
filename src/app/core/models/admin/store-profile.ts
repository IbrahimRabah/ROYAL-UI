export interface StoreProfileResponse {
  legalName: string;
  legalNameEn: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxNumber: string | null;
  commercialRegister: string | null;
  website: string | null;
  invoiceFooterNote: string | null;
  missingFields: string[];
}

export interface StoreProfileUpdateRequest {
  legalName: string;
  legalNameEn?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxNumber?: string;
  commercialRegister?: string;
  website?: string;
  invoiceFooterNote?: string;
}
