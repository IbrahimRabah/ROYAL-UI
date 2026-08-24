import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Money, OutstandingRemittanceOrder, OutstandingRemittanceResponse, money } from '../../../../../core/models';
import { AdminRemittanceApiService } from '../../../../../core/services/api/admin-remittance-api.service';

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  maximumFractionDigits: 0,
});

type HeaderTone = 'default' | 'warn' | 'stop';

@Component({
  selector: 'app-outstanding-page',
  templateUrl: './outstanding-page.component.html',
  styleUrl: './outstanding-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OutstandingPageComponent {
  private readonly remittanceApi = inject(AdminRemittanceApiService);
  private readonly router = inject(Router);

  readonly data = signal<OutstandingRemittanceResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly selected = signal<ReadonlySet<number>>(new Set());

  // Oldest first — the whole point of this screen is surfacing what's been sitting with
  // the courier longest.
  readonly sortedOrders = computed<OutstandingRemittanceOrder[]>(() => {
    const orders = this.data()?.orders ?? [];
    return [...orders].sort((a, b) => b.daysWaiting - a.daysWaiting);
  });

  readonly oldestDays = computed(() => {
    const orders = this.data()?.orders ?? [];
    return orders.length ? Math.max(...orders.map((o) => o.daysWaiting)) : 0;
  });

  readonly headerTone = computed<HeaderTone>(() => {
    const days = this.oldestDays();
    if (days > 14) return 'stop';
    if (days > 7) return 'warn';
    return 'default';
  });

  readonly allSelected = computed(() => {
    const orders = this.sortedOrders();
    return orders.length > 0 && orders.every((o) => this.selected().has(o.orderId));
  });

  readonly selectedOrders = computed(() => this.sortedOrders().filter((o) => this.selected().has(o.orderId)));
  readonly selectedCount = computed(() => this.selectedOrders().length);
  readonly selectedTotal = computed(() => this.selectedOrders().reduce((sum, o) => sum + money(o.amount), 0));

  constructor() {
    this.fetch();
  }

  retry(): void {
    this.fetch();
  }

  formatAmount(value: Money): string {
    return NUMBER_FORMATTER.format(money(value));
  }

  isSelected(orderId: number): boolean {
    return this.selected().has(orderId);
  }

  toggle(orderId: number): void {
    const next = new Set(this.selected());
    if (next.has(orderId)) {
      next.delete(orderId);
    } else {
      next.add(orderId);
    }
    this.selected.set(next);
  }

  toggleAll(): void {
    if (this.allSelected()) {
      this.selected.set(new Set());
    } else {
      this.selected.set(new Set(this.sortedOrders().map((o) => o.orderId)));
    }
  }

  recordRemittance(): void {
    if (!this.selectedCount()) {
      return;
    }
    this.router.navigate(['/admin/remittances/new'], { state: { selectedOrders: this.selectedOrders() } });
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set(false);
    this.selected.set(new Set());
    this.remittanceApi.outstanding().subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
