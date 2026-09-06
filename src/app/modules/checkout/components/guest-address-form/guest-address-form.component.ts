import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { CheckoutAddressInput, GovernorateResponse } from '../../../../core/models';
import { getFieldErrorKey } from '../../../../shared/utils/field-error-key.util';
import { egyptianPhoneValidator } from '../../../../shared/validators/egyptian-phone.validator';

export type GuestAddressFields = Omit<CheckoutAddressInput, 'phone' | 'email'>;

export interface GuestAddressFormValue {
  fields: GuestAddressFields;
  customerNote?: string;
}

type FieldName = 'recipientName' | 'governorateId' | 'streetAddress' | 'altPhone';

@Component({
  selector: 'app-guest-address-form',
  templateUrl: './guest-address-form.component.html',
  styleUrl: './guest-address-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestAddressFormComponent implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() governorates: GovernorateResponse[] = [];
  @Output() readonly valueChange = new EventEmitter<{ value: GuestAddressFormValue; valid: boolean }>();

  readonly form = this.fb.nonNullable.group({
    recipientName: ['', Validators.required],
    governorateId: this.fb.control<number | null>(null, Validators.required),
    area: [''],
    streetAddress: ['', Validators.required],
    building: [''],
    floor: [''],
    apartment: [''],
    altPhone: ['', egyptianPhoneValidator()],
    landmark: [''],
    customerNote: [''],
  });

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => this.emit());
    this.form.statusChanges.subscribe(() => this.emit());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['governorates'] && this.governorates.length) {
      this.form.controls.governorateId.updateValueAndValidity({ emitEvent: false });
    }
  }

  fieldError(name: FieldName): string | null {
    return getFieldErrorKey(this.form.get(name));
  }

  touchAll(): void {
    this.form.markAllAsTouched();
  }

  flagGovernorateNotServed(): void {
    this.form.controls.governorateId.setErrors({ notServed: true });
    this.form.controls.governorateId.markAsTouched();
  }

  private emit(): void {
    const raw = this.form.getRawValue();
    const fields: GuestAddressFields = {
      recipientName: raw.recipientName,
      governorateId: raw.governorateId as number,
      area: raw.area || undefined,
      streetAddress: raw.streetAddress,
      building: raw.building || undefined,
      floor: raw.floor || undefined,
      apartment: raw.apartment || undefined,
      altPhone: raw.altPhone || undefined,
      landmark: raw.landmark || undefined,
    };
    this.valueChange.emit({
      value: { fields, customerNote: raw.customerNote || undefined },
      valid: this.form.valid,
    });
  }
}
