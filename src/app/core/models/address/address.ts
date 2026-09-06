export interface AddressResponse {
  id: number;
  label: string;
  recipientName: string;
  phone: string;
  altPhone: string | null;
  governorateId: number;
  governorateName: string;
  area: string | null;
  streetAddress: string;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  landmark: string | null;
  isDefault: boolean;
  formatted: string;
}

export interface AddressUpsertRequest {
  label?: string;
  recipientName: string;
  phone: string;
  altPhone?: string;
  governorateId: number;
  area?: string;
  streetAddress: string;
  building?: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
  makeDefault?: boolean;
}
