import { ChangeDetectionStrategy, Component, Input, OnChanges, computed, inject, signal } from '@angular/core';

import { ShippingSizeClass } from '../../../../core/enums/shipping-size-class';
import { DeliveryOptionResponse } from '../../../../core/models';
import { ShippingApiService } from '../../../../core/services/api/shipping-api.service';

const STORAGE_KEY = 'royal.delivery.governorate';

/** "Delivery to [governorate]: cost and days" under the price. Shipping is free only where the zone cost is 0. */
@Component({
  selector: 'app-delivery-estimate',
  templateUrl: './delivery-estimate.component.html',
  styleUrl: './delivery-estimate.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DeliveryEstimateComponent implements OnChanges {
  private readonly api = inject(ShippingApiService);

  @Input() sizeClass: ShippingSizeClass | null = null;

  readonly options = signal<DeliveryOptionResponse[]>([]);
  readonly selectedId = signal<number | null>(this.remembered());
  readonly failed = signal(false);

  readonly selected = computed(() => this.options().find((o) => o.id === this.selectedId()) ?? null);

  ngOnChanges(): void {
    this.api.deliveryOptions(this.sizeClass).subscribe({
      next: (list) => {
        this.options.set(list);
        this.failed.set(false);
      },
      error: () => this.failed.set(true),
    });
  }

  select(value: number | null): void {
    const id = value ?? null;
    this.selectedId.set(id);
    try {
      if (id == null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      // storage can be blocked; the choice just is not remembered
    }
  }

  private remembered(): number | null {
    try {
      const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
      return raw ? Number(raw) : null;
    } catch {
      return null;
    }
  }
}
