import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';

import { ShippingRateRequest, ShippingZoneResponse, money } from '../../../../../core/models';
import { AdminShippingApiService } from '../../../../../core/services/api/admin-shipping-api.service';
import { DialogPortalBase } from '../../../../../shared/base/dialog-portal.base';

@Component({
  selector: 'app-rates-form',
  templateUrl: './rates-form.component.html',
  styleUrl: './rates-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RatesFormComponent extends DialogPortalBase implements OnChanges {
  private readonly shippingApi = inject(AdminShippingApiService);

  @Input() zone: ShippingZoneResponse | null = null;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  readonly baseCost = signal<number | null>(null);
  readonly freeShippingOver = signal<number | null>(null);
  readonly codFee = signal<number | null>(null);
  readonly deliveryDaysMin = signal<number | null>(null);
  readonly deliveryDaysMax = signal<number | null>(null);
  readonly maxWeightGrams = signal<number | null>(null);
  readonly costPerExtraKg = signal<number | null>(null);

  readonly saving = signal(false);
  readonly confirmStep = signal(false);

  get open(): boolean {
    return this.zone !== null;
  }

  get canSubmit(): boolean {
    return this.baseCost() !== null && this.baseCost()! >= 0;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('zone' in changes)) {
      return;
    }
    if (this.open && this.zone) {
      this.baseCost.set(this.zone.baseCost !== null ? money(this.zone.baseCost) : null);
      this.freeShippingOver.set(this.zone.freeShippingOver !== null ? money(this.zone.freeShippingOver) : null);
      this.codFee.set(this.zone.codFee !== null ? money(this.zone.codFee) : null);
      this.deliveryDaysMin.set(this.zone.deliveryDaysMin || null);
      this.deliveryDaysMax.set(this.zone.deliveryDaysMax || null);
      this.maxWeightGrams.set(null);
      this.costPerExtraKg.set(null);
      this.saving.set(false);
      this.confirmStep.set(false);
      this.onOpen();
    } else {
      this.onClose();
    }
  }

  cancel(): void {
    if (this.saving()) {
      return;
    }
    this.closed.emit();
  }

  goToConfirm(): void {
    if (this.saving() || !this.canSubmit) {
      return;
    }
    this.confirmStep.set(true);
  }

  backToEdit(): void {
    if (this.saving()) {
      return;
    }
    this.confirmStep.set(false);
  }

  confirmSave(): void {
    if (this.saving() || !this.zone || !this.canSubmit) {
      return;
    }
    this.doSubmit();
  }

  private doSubmit(): void {
    if (!this.zone) {
      return;
    }
    this.saving.set(true);

    const body: ShippingRateRequest = {
      zoneId: this.zone.zoneId,
      baseCost: this.baseCost()!,
      freeShippingOver: this.freeShippingOver() ?? undefined,
      codFee: this.codFee() ?? undefined,
      deliveryDaysMin: this.deliveryDaysMin() ?? undefined,
      deliveryDaysMax: this.deliveryDaysMax() ?? undefined,
      maxWeightGrams: this.maxWeightGrams() ?? undefined,
      costPerExtraKg: this.costPerExtraKg() ?? undefined,
    };

    this.shippingApi.setRate(body).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }
}
