import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, signal } from '@angular/core';

import { GovernorateResponse } from '../../../../../core/models';
import { PaymentStatus } from '../../../../../core/enums/payment-status';
import { Language } from '../../../../../core/enums/language';
import { PAYMENT_STATUS_LABELS_AR, PAYMENT_STATUS_LABELS_EN } from '../../../../../core/constants/order-status.constants';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';

export interface OrderListFilters {
  dateFrom: string | null;
  dateTo: string | null;
  governorateId: number | null;
  paymentStatus: PaymentStatus | null;
}

export const EMPTY_ORDER_FILTERS: OrderListFilters = {
  dateFrom: null,
  dateTo: null,
  governorateId: null,
  paymentStatus: null,
};

@Component({
  selector: 'app-order-filters-bar',
  templateUrl: './order-filters-bar.component.html',
  styleUrl: './order-filters-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderFiltersBarComponent implements OnChanges {
  private readonly languageStore = inject(LanguageStoreService);

  @Input() filters: OrderListFilters = EMPTY_ORDER_FILTERS;
  @Input() governorates: GovernorateResponse[] = [];

  @Output() readonly apply = new EventEmitter<OrderListFilters>();
  @Output() readonly clear = new EventEmitter<void>();

  readonly filtersOpen = signal(false);
  readonly dateFrom = signal<Date | null>(null);
  readonly dateTo = signal<Date | null>(null);
  readonly governorateId = signal<number | null>(null);
  readonly paymentStatus = signal<PaymentStatus | null>(null);

  readonly paymentStatusOptions = computed(() => {
    const labels = this.languageStore.lang() === Language.AR ? PAYMENT_STATUS_LABELS_AR : PAYMENT_STATUS_LABELS_EN;
    return Object.values(PaymentStatus).map((status) => ({ status, label: labels[status] }));
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (!('filters' in changes)) {
      return;
    }
    this.dateFrom.set(this.filters.dateFrom ? new Date(this.filters.dateFrom) : null);
    this.dateTo.set(this.filters.dateTo ? new Date(this.filters.dateTo) : null);
    this.governorateId.set(this.filters.governorateId);
    this.paymentStatus.set(this.filters.paymentStatus);
  }

  submit(): void {
    this.apply.emit({
      dateFrom: toIsoDate(this.dateFrom()),
      dateTo: toIsoDate(this.dateTo()),
      governorateId: this.governorateId(),
      paymentStatus: this.paymentStatus(),
    });
  }

  clearAll(): void {
    this.dateFrom.set(null);
    this.dateTo.set(null);
    this.governorateId.set(null);
    this.paymentStatus.set(null);
    this.clear.emit();
  }
}

function toIsoDate(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
