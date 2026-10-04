import { Money } from '../common/money';
import { ShippingSizeClass } from '../../enums/shipping-size-class';

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

/** The price of ONE unit of a size class in a zone. */
export interface ShippingZoneRate {
  sizeClass: ShippingSizeClass;
  unitCost: Money;
}

export interface ShippingZoneResponse {
  zoneId: number;
  code: string;
  nameAr: string;
  nameEn: string;
  /** Empty when the zone has no active rate yet; may also hold only some sizes. */
  rates: ShippingZoneRate[];
  /** Per-order cap. Absent/null = no cap. */
  maxShippingCost?: Money | null;
  codFee?: Money | null;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  active: boolean;
  governorates: string[];
}

/** Sets (creates or replaces) the price of ONE (zone, size) pair. */
export interface ShippingRateRequest {
  zoneId: number;
  sizeClass: ShippingSizeClass;
  /** Cost of one unit of this size, >= 0 (0 = free). */
  baseCost: Money;
  /** Zone-wide: written to every size row of the zone when sent. */
  codFee?: Money;
  deliveryDaysMin?: number;
  deliveryDaysMax?: number;
}

export interface MaxShippingCostRequest {
  /** null removes the cap. */
  maxShippingCost: Money | null;
}

export interface AdminGovernorateResponse {
  id: number;
  code: string;
  nameAr: string;
  nameEn: string;
  zoneId?: number | null;
  zoneCode?: string | null;
  served: boolean;
}

export interface AssignGovernorateZoneRequest {
  zoneId: number;
}
