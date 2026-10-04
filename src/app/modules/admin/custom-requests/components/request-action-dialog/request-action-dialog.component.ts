import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { DialogPortalBase } from '../../../../../shared/base/dialog-portal.base';

export type RequestActionMode = 'contacted' | 'quote' | 'reject';

export interface RequestActionPayload {
  amount?: number;
  note?: string;
}

const NOTE_MAX_LENGTH = 1000;
const AMOUNT_MAX = 100_000_000;

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

  readonly note = signal('');
  readonly amount = signal('');
  readonly touched = signal(false);

  readonly noteMaxLength = NOTE_MAX_LENGTH;
  readonly reasons = REJECTION_REASONS;

  get open(): boolean {
    return this.mode !== null;
  }

  get amountValue(): number {
    return Number(this.amount());
  }

  get amountValid(): boolean {
    const value = this.amountValue;
    return this.amount().trim() !== '' && Number.isFinite(value) && value > 0 && value <= AMOUNT_MAX;
  }

  get noteValid(): boolean {
    return this.mode !== 'reject' || this.note().trim().length > 0;
  }

  get canSubmit(): boolean {
    if (this.mode === 'quote') return this.amountValid;
    return this.noteValid;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('mode' in changes)) return;
    if (this.open) {
      this.note.set('');
      this.amount.set(this.mode === 'quote' && this.initialAmount != null ? String(this.initialAmount) : '');
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
    this.note.set(text);
  }

  submit(): void {
    this.touched.set(true);
    if (this.saving || !this.canSubmit) return;
    const note = this.note().trim() || undefined;
    this.submitted.emit(this.mode === 'quote' ? { amount: this.amountValue, note } : { note });
  }
}
