import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { Money, ShippingZoneResponse, money } from '../../../../../core/models';
import { AdminShippingApiService } from '../../../../../core/services/api/admin-shipping-api.service';
import { ToastService } from '../../../../../core/services/toast.service';

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

@Component({
  selector: 'app-zones-page',
  templateUrl: './zones-page.component.html',
  styleUrl: './zones-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZonesPageComponent {
  private readonly shippingApi = inject(AdminShippingApiService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly zones = signal<ShippingZoneResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly editingZone = signal<ShippingZoneResponse | null>(null);

  constructor() {
    this.fetch();
  }

  retry(): void {
    this.fetch();
  }

  formatAmount(value: Money | null): string {
    return value === null ? '' : NUMBER_FORMATTER.format(money(value));
  }

  openEdit(zone: ShippingZoneResponse): void {
    this.editingZone.set(zone);
  }

  onDialogClosed(): void {
    this.editingZone.set(null);
  }

  onSaved(): void {
    this.editingZone.set(null);
    this.toast.success(this.translate.instant('toast.shipping.rateUpdated'));
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set(false);
    this.shippingApi.getZones().subscribe({
      next: (zones) => {
        this.zones.set(zones);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
