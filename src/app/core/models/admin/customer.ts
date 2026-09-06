import { Money } from '../common/money';
import { FulfillmentStatus } from '../../enums/fulfillment-status';
import { PaymentStatus } from '../../enums/payment-status';
import { Language } from '../../enums/language';

export interface CustomerSummaryResponse {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  phoneVerified: boolean;
  orderCount: number;
  totalSpent: Money;
  lastOrderAt: string | null;
  registeredAt: string;
  status: string;
}

export interface CustomerPurchaseStats {
  totalOrders: number;
  deliveredOrders: number;
  failedOrders: number;
  cancelledOrders: number;
  totalSpent: Money;
  averageOrderValue: Money;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
}

export interface CustomerAddressSummary {
  id: number;
  label: string;
  recipientName: string;
  phone: string;
  governorate: string;
  formatted: string;
  isDefault: boolean;
}

export interface CustomerRecentOrder {
  id: number;
  orderNumber: string;
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;
  grandTotal: Money;
  itemCount: number;
  placedAt: string;
}

export interface CustomerDetailResponse {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  status: string;
  locale: Language;
  registeredAt: string;
  lastLoginAt: string | null;
  roles: string[];
  purchases: CustomerPurchaseStats;
  addresses: CustomerAddressSummary[];
  recentOrders: CustomerRecentOrder[];
}
