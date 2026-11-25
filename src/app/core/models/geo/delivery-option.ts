import { ShippingSizeClass } from '../../enums/shipping-size-class';
import { Money } from '../common/money';

/** One served governorate on the product page: what shipping costs there and how long it takes. */
export interface DeliveryOptionResponse {
  id: number;
  code: string;
  name: string;
  zoneName: string;
  /** Echo of the `sizeClass` that was asked for; absent when it was not sent. */
  sizeClass?: ShippingSizeClass;
  /** Base fee per unit for that size, capped by the zone; excludes quantity, COD fee and assembly. */
  shippingCost: Money | null;
  free: boolean;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
}
