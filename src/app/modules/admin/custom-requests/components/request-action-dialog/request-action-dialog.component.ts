import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import { DialogPortalBase } from '../../../../../shared/base/dialog-portal.base';

export type RequestActionMode = 'contacted' | 'quote' | 'reject' | 'complete';

export interface RequestActionPayload {
  amount?: number;
  note?: string;
}

const NOTE_MAX_LENGTH = 1000;
const AMOUNT_MAX = 100_000_000;

/**
 * The amount input is numeric, so its value is number | null (null when empty or cleared) — never a
 * string. Strictly greater than zero, because the API rejects zero.
 */
export const quoteAmountValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value: unknown = control.value;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= AMOUNT_MAX
    ? null
    : { amount: true };
};

/** A textarea can hold null once cleared, so guard before reading it as text. */
export const notBlankValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value: unknown = control.value;
  return typeof value === 'string' && value.trim().length > 0 ? null : { required: true };
};

export const REJECTION_REASONS = ['outOfScope', 'notServed', 'noResponse', 'tooSmall'] as const;

/**
 * Collects the input for one pipeline step. The parent performs the call, so it controls
 * `saving` and `errorMessage` (409s are answered inline there).
 */
@Component({
  selector: 'app-request-action-dialog',
  templateUrl: './request-action-dialog.component.html',
  styleUrl: './request-action-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestActionDialogComponent extends DialogPortalBase implements OnChanges {
  private readonly translate = inject(TranslateService);

  @Input() mode: RequestActionMode | null = null;
  @Input() requestNumber = '';
  @Input() initialAmount: number | null = null;
  @Input() saving = false;
  @Input() errorMessage: string | null = null;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly submitted = new EventEmitter<RequestActionPayload>();

  readonly amountControl = new FormControl<number | null>(null, quoteAmountValidator);
  readonly noteControl = new FormControl<string | null>('');
  readonly touched = signal(false);

  readonly noteMaxLength = NOTE_MAX_LENGTH;
  readonly reasons = REJECTION_REASONS;

  get open(): boolean {
    return this.mode !== null;
  }

  get amountValid(): boolean {
    return this.amountControl.valid;
  }

  get noteValid(): boolean {
    return this.noteControl.valid;
  }

  get noteLength(): number {
    return this.noteControl.value?.length ?? 0;
  }

  get canSubmit(): boolean {
    return this.mode === 'quote' ? this.amountControl.valid : this.noteControl.valid;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('mode' in changes)) return;
    if (this.open) {
      this.noteControl.setValidators(this.mode === 'reject' ? notBlankValidator : null);
      this.noteControl.setValue('');
      this.amountControl.setValue(this.mode === 'quote' && this.initialAmount != null ? this.initialAmount : null);
      this.touched.set(false);
      this.onOpen();
    } else {
      this.onClose();
    }
  }

  cancel(): void {
    if (this.saving) return;
    this.closed.emit();
  }

  pickReason(reason: string): void {
    const text = this.translate.instant('admin.customRequests.reasons.' + reason);
    this.noteControl.setValue(text);
  }

  submit(): void {
    this.touched.set(true);
    if (this.saving || !this.canSubmit) return;
    const raw = this.noteControl.value;
    const note = typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
    this.submitted.emit(this.mode === 'quote' ? { amount: this.amountControl.value as number, note } : { note });
  }
}
