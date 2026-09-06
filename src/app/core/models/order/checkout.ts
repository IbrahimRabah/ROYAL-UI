import { PaymentMethod } from '../../enums/payment-method';

export interface CheckoutAddressInput {
  recipientName: string;
  phone: string;
  altPhone?: string;
  email?: string;
  governorateId: number;
  area?: string;
  streetAddress: string;
  building?: string;
  floor?: string;
  apartment?: string;
  landmark?: string;
}

export interface PlaceOrderRequest {
  addressId?: number;
  address?: CheckoutAddressInput;
  paymentMethod?: PaymentMethod;
  customerNote?: string;
}
