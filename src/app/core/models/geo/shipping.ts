import { Money } from '../common/money';

export interface ShippingQuoteRequest {
  governorateId: number;
  cartId?: number;
}

export interface ShippingQuoteResponse {
  governorateId: number;
  governorateName: string;
  zoneName: string;
  shippingCost: Money;
  baseCost: Money;
  codFee: Money;
  freeShippingApplied: boolean;
  freeShippingThreshold: Money;
  amountToFreeShipping: Money;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  orderSubtotal: Money;
  totalWeightGrams: number;
  estimatedTotal: Money;
}
export interface ShippingZoneResponse {
  zoneId: number;
  code: string;
  nameAr: string;
  nameEn: string;
  baseCost: Money | null;
  freeShippingOver: Money | null;
  codFee: Money | null;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  active: boolean;
  governorates: string[];
}

export interface ShippingRateRequest {
  zoneId: number;
  baseCost: Money;
  maxWeightGrams?: number | null;
  costPerExtraKg?: Money;
  freeShippingOver?: Money;
  codFee?: Money;
  deliveryDaysMin?: number;
  deliveryDaysMax?: number;
}
