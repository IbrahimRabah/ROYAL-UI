import { Money } from '../common/money';

export interface GovernorateResponse {
  id: number;
  code: string;
  name: string;
  zoneName: string | null;
  shippingCost: Money | null;
  deliveryDaysMin: number | null;
  deliveryDaysMax: number | null;
  served: boolean;
}
