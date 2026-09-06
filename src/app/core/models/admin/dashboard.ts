import { Money } from '../common/money';
import { FulfillmentStatus } from '../../enums/fulfillment-status';

export interface DashboardSales {
  revenueToday: Money;
  ordersToday: number;
  revenueThisWeek: Money;
  ordersThisWeek: number;
  revenueThisMonth: Money;
  ordersThisMonth: number;
  averageOrderValue: Money;
}

export interface DashboardCodPosition {
  orderCount: number;
  amount: Money;
  oldestDays: number;
}

export interface DashboardActionQueueItem {
  status: FulfillmentStatus;
  label: string;
  count: number;
}

export interface DashboardStaleOrder {
  orderId: number;
  orderNumber: string;
  status: FulfillmentStatus;
  statusLabel: string;
  customerName: string;
  grandTotal: Money;
  hoursWaiting: number;
}

export interface DashboardLowStockItem {
  variantId: number;
  sku: string;
  productName: string;
  qtyOnHand: number;
  qtyReserved: number;
  available: number;
  minStockLevel: number;
}

export interface DashboardTopProduct {
  sku: string;
  productName: string;
  unitsSold: number;
  revenue: Money;
}

export interface DashboardDeliveryHealth {
  delivered: number;
  failed: number;
  refused: number;
  returnedToSeller: number;
  cancelled: number;
  successRatePercent: string;
}

export interface DashboardCustomerStats {
  total: number;
  newThisMonth: number;
  guestOrdersThisMonth: number;
  repeatCustomers: number;
}

export interface DashboardCatalogStats {
  activeProducts: number;
  draftProducts: number;
  activeVariants: number;
  outOfStockVariants: number;
}

export interface DashboardAlert {
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  message: string;
  actionPath: string;
}

export interface DashboardResponse {
  sales: DashboardSales;
  codPosition: DashboardCodPosition;
  actionQueues: DashboardActionQueueItem[];
  staleOrders: DashboardStaleOrder[];
  lowStock: DashboardLowStockItem[];
  stuckReservations: number;
  topProducts: DashboardTopProduct[];
  deliveryHealth: DashboardDeliveryHealth;
  customers: DashboardCustomerStats;
  catalog: DashboardCatalogStats;
  alerts: DashboardAlert[];
  generatedAt: string;
}
