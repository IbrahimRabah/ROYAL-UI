import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { getFieldErrorKey } from '../../../../shared/utils/field-error-key.util';
import { egyptianPhoneValidator } from '../../../../shared/validators/egyptian-phone.validator';
import { AuthStoreService } from '../../../../core/state/auth-store.service';

export interface ContactValue {
  phone: string;
  email?: string;
}

type FieldName = 'phone' | 'email';
@Component({
  selector: 'app-review-step',
  templateUrl: './review-step.component.html',
  styleUrl: './review-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewStepComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authStore = inject(AuthStoreService);

  @Output() readonly contactChange = new EventEmitter<{ value: ContactValue; valid: boolean }>();

  readonly form = this.fb.nonNullable.group({
    phone: ['', [Validators.required, egyptianPhoneValidator()]],
    email: ['', Validators.email],
  });

  ngOnInit(): void {
    const user = this.authStore.user();
    if (user) {
      this.form.patchValue({ phone: user.phone ?? '', email: user.email ?? '' }, { emitEvent: false });
    }

    this.emit();
    this.form.valueChanges.subscribe(() => this.emit());
    this.form.statusChanges.subscribe(() => this.emit());
  }

  fieldError(name: FieldName): string | null {
    return getFieldErrorKey(this.form.get(name));
  }

  touchAll(): void {
    this.form.markAllAsTouched();
  }

  private emit(): void {
    const raw = this.form.getRawValue();
    this.contactChange.emit({
      value: { phone: raw.phone, email: raw.email || undefined },
      valid: this.form.valid,
    });
  }
}
