import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { CheckoutAddressInput, GovernorateResponse } from '../../../../core/models';
import { getFieldErrorKey } from '../../../../shared/utils/field-error-key.util';
import { FormIssue, collectFormIssues } from '../../../../shared/utils/form-issues.util';
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
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() governorates: GovernorateResponse[] = [];

  /** The governorates in the shape the select needs; a closed (not served) one is listed but cannot be chosen. */
  /** Optional details (area, building, floor, apartment, landmark, second phone) start collapsed. */
  readonly showMore = signal(false);

  options: { id: number; name: string; served: boolean; disabled: boolean }[] = [];
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
    this.form.valueChanges.subscribe(() => {
      this.revealFilledExtras();
      this.emit();
    });
    this.form.statusChanges.subscribe(() => this.emit());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['governorates']) {
      this.options = this.governorates.map((gov) => ({ id: gov.id, name: gov.name, served: gov.served, disabled: !gov.served }));
    }
    if (changes['governorates'] && this.governorates.length) {
      this.form.controls.governorateId.updateValueAndValidity({ emitEvent: false });
    }
  }

  fieldError(name: FieldName): string | null {
    return getFieldErrorKey(this.form.get(name));
  }

  toggleMore(): void {
    this.showMore.update((open) => !open);
  }

  /** Something typed or auto-filled into a collapsed field must not stay hidden. */
  private revealFilledExtras(): void {
    if (this.showMore()) return;
    const raw = this.form.getRawValue();
    if (raw.area || raw.building || raw.floor || raw.apartment || raw.altPhone || raw.landmark) {
      this.showMore.set(true);
    }
  }

  touchAll(): void {
    this.form.markAllAsTouched();
    this.cdr.markForCheck();
  }

  /** The invalid fields, top to bottom (call after touchAll). */
  invalidFields(): FormIssue[] {
    if (this.form.get('altPhone')?.invalid) this.showMore.set(true); // the field to fix must be on screen
    return collectFormIssues([
      { id: 'gaf-recipient', labelKey: 'account.addressForm.recipientNameLabel', control: this.form.get('recipientName') },
      { id: 'gaf-governorate', labelKey: 'account.addressForm.governorateLabel', control: this.form.get('governorateId') },
      { id: 'gaf-street', labelKey: 'account.addressForm.streetLabel', control: this.form.get('streetAddress') },
      { id: 'gaf-alt-phone', labelKey: 'account.addressForm.altPhoneLabel', control: this.form.get('altPhone') },
    ]);
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
