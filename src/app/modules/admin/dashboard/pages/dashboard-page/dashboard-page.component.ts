import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { DashboardResponse } from '../../../../../core/models';
import { FulfillmentStatus } from '../../../../../core/enums/fulfillment-status';
import { AdminDashboardApiService } from '../../../../../core/services/api/admin-dashboard-api.service';

const MONEY_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  style: 'currency',
  currency: 'EGP',
  currencyDisplay: 'code',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const TIME_FORMATTER = new Intl.DateTimeFormat('en-US-u-nu-latn', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

type AlertSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

const SEVERITY_TONE: Record<AlertSeverity, 'stop' | 'warn' | 'info'> = {
  HIGH: 'stop',
  MEDIUM: 'warn',
  LOW: 'info',
};

export type StatusTone = 'warn' | 'info' | 'violet' | 'blue' | 'ok' | 'stop';

export const STATUS_TONE: Partial<Record<FulfillmentStatus, StatusTone>> = {
  [FulfillmentStatus.PENDING]: 'warn',
  [FulfillmentStatus.CONFIRMED]: 'info',
  [FulfillmentStatus.PROCESSING]: 'violet',
  [FulfillmentStatus.SHIPPED]: 'blue',
  [FulfillmentStatus.OUT_FOR_DELIVERY]: 'blue',
  [FulfillmentStatus.DELIVERED]: 'ok',
  [FulfillmentStatus.DELIVERY_FAILED]: 'stop',
  [FulfillmentStatus.REFUSED_ON_DELIVERY]: 'stop',
  [FulfillmentStatus.CANCELLED]: 'stop',
  [FulfillmentStatus.RETURNED_TO_SELLER]: 'stop',
  [FulfillmentStatus.RETURNED]: 'stop',
  [FulfillmentStatus.PARTIALLY_RETURNED]: 'stop',
};

const ACTION_QUEUE_ICON: Partial<Record<FulfillmentStatus, string>> = {
  [FulfillmentStatus.PENDING]: 'pi-clock',
  [FulfillmentStatus.CONFIRMED]: 'pi-check-circle',
  [FulfillmentStatus.PROCESSING]: 'pi-refresh',
  [FulfillmentStatus.SHIPPED]: 'pi-send',
  [FulfillmentStatus.OUT_FOR_DELIVERY]: 'pi-truck',
  [FulfillmentStatus.DELIVERY_FAILED]: 'pi-exclamation-triangle',
  [FulfillmentStatus.REFUSED_ON_DELIVERY]: 'pi-times-circle',
  [FulfillmentStatus.RETURNED_TO_SELLER]: 'pi-replay',
  [FulfillmentStatus.CANCELLED]: 'pi-ban',
  [FulfillmentStatus.RETURNED]: 'pi-replay',
  [FulfillmentStatus.PARTIALLY_RETURNED]: 'pi-replay',
};

@Component({
  selector: 'app-dashboard-page',
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
  private readonly dashboardApi = inject(AdminDashboardApiService);

  readonly data = signal<DashboardResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  constructor() {
    this.fetch();
  }

  refresh(): void {
    this.fetch();
  }

  formattedUpdatedAt(iso: string): string {
    return TIME_FORMATTER.format(new Date(iso));
  }

  formatMoney(value: number | string): string {
    return MONEY_FORMATTER.format(typeof value === 'number' ? value : parseFloat(value));
  }

  actionQueueTone(status: FulfillmentStatus): StatusTone {
    return STATUS_TONE[status] ?? 'info';
  }

  actionQueueIcon(status: FulfillmentStatus): string {
    return ACTION_QUEUE_ICON[status] ?? 'pi-circle';
  }

  severityTone(severity: AlertSeverity): 'stop' | 'warn' | 'info' {
    return SEVERITY_TONE[severity];
  }

  alertPath(actionPath: string): string {
    return actionPath.split('?')[0];
  }

  alertQueryParams(actionPath: string): Record<string, string> {
    const queryString = actionPath.split('?')[1];
    return queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {};
  }

  totalActionQueueCount(dashboard: DashboardResponse): number {
    return dashboard.actionQueues.reduce((sum, queue) => sum + queue.count, 0);
  }

  distributionPercent(dashboard: DashboardResponse, count: number): number {
    const total = this.totalActionQueueCount(dashboard);
    return total > 0 ? (count / total) * 100 : 0;
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set(false);
    this.dashboardApi.get().subscribe({
      next: (dashboard) => {
        this.data.set(dashboard);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
