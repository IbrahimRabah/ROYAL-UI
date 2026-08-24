import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';

import { OrderExportFilter } from '../../../../../core/models';
import { FulfillmentStatus } from '../../../../../core/enums/fulfillment-status';
import { PaymentStatus } from '../../../../../core/enums/payment-status';
import { GovernorateResponse } from '../../../../../core/models';
import { GeoApiService } from '../../../../../core/services/api/geo-api.service';

@Component({
  selector: 'app-export-filters-form',
  templateUrl: './export-filters-form.component.html',
  styleUrl: './export-filters-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExportFiltersFormComponent implements OnInit {
  private readonly geoApi = inject(GeoApiService);

  @Output() readonly filtersChange = new EventEmitter<OrderExportFilter>();

  readonly FulfillmentStatus = FulfillmentStatus;
  readonly fulfillmentOptions = Object.values(FulfillmentStatus);
  readonly PaymentStatus = PaymentStatus;
  readonly paymentOptions = Object.values(PaymentStatus);
  readonly governorates = signal<GovernorateResponse[]>([]);

  readonly dateFromDate = signal<Date | null>(null);
  readonly dateToDate = signal<Date | null>(null);
  readonly fulfillmentStatus = signal<FulfillmentStatus | null>(null);
  readonly paymentStatus = signal<PaymentStatus | null>(null);
  readonly governorateId = signal<number | null>(null);
  readonly excludeCancelled = signal(true);

  ngOnInit(): void {
    this.geoApi.getGovernorates().subscribe({
      next: (list) => this.governorates.set(list),
      error: () => this.governorates.set([]),
    });
    this.emit();
  }

  onDateFromChange(date: Date | null): void {
    this.dateFromDate.set(date);
    this.emit();
  }

  onDateToChange(date: Date | null): void {
    this.dateToDate.set(date);
    this.emit();
  }

  onFulfillmentChange(value: FulfillmentStatus | null): void {
    this.fulfillmentStatus.set(value);
    this.emit();
  }

  onPaymentChange(value: PaymentStatus | null): void {
    this.paymentStatus.set(value);
    this.emit();
  }

  onGovernorateChange(value: number | null): void {
    this.governorateId.set(value);
    this.emit();
  }

  toggleExcludeCancelled(): void {
    this.excludeCancelled.set(!this.excludeCancelled());
    this.emit();
  }

  private emit(): void {
    this.filtersChange.emit({
      dateFrom: toIsoDate(this.dateFromDate()) ?? undefined,
      dateTo: toIsoDate(this.dateToDate()) ?? undefined,
      fulfillmentStatus: this.fulfillmentStatus() ?? undefined,
      paymentStatus: this.paymentStatus() ?? undefined,
      governorateId: this.governorateId() ?? undefined,
      excludeCancelled: this.excludeCancelled(),
    });
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
