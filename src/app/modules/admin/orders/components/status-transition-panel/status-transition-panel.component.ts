import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  PLATFORM_ID,
  Renderer2,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { OrderResponse } from '../../../../../core/models';
import { FulfillmentStatus } from '../../../../../core/enums/fulfillment-status';
import { Language } from '../../../../../core/enums/language';
import {
  CONSEQUENCE_STATUSES,
  FULFILLMENT_STATUS_LABELS_AR,
  FULFILLMENT_STATUS_LABELS_EN,
  FULFILLMENT_STATUS_TONE,
  FULFILLMENT_TRANSITIONS,
  NOTE_REQUIRED_STATUSES,
  StatusTone,
} from '../../../../../core/constants/order-status.constants';
import { AdminOrderApiService } from '../../../../../core/services/api/admin-order-api.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { handleAdminMutationError } from '../../../../../shared/utils/admin-mutation-error.util';

const NOTE_MAX_LENGTH = 255;

const TRANSITION_ICON: Partial<Record<FulfillmentStatus, string>> = {
  [FulfillmentStatus.CONFIRMED]: 'pi-check-circle',
  [FulfillmentStatus.PROCESSING]: 'pi-cog',
  [FulfillmentStatus.SHIPPED]: 'pi-send',
  [FulfillmentStatus.OUT_FOR_DELIVERY]: 'pi-truck',
  [FulfillmentStatus.DELIVERED]: 'pi-check-square',
  [FulfillmentStatus.DELIVERY_FAILED]: 'pi-exclamation-triangle',
  [FulfillmentStatus.REFUSED_ON_DELIVERY]: 'pi-times-circle',
  [FulfillmentStatus.RETURNED_TO_SELLER]: 'pi-replay',
  [FulfillmentStatus.CANCELLED]: 'pi-ban',
  [FulfillmentStatus.RETURNED]: 'pi-replay',
  [FulfillmentStatus.PARTIALLY_RETURNED]: 'pi-replay',
};

const CONSEQUENCE_COPY: Partial<Record<FulfillmentStatus, string>> = {
  [FulfillmentStatus.SHIPPED]: 'admin.orders.detail.consequence.shipped',
  [FulfillmentStatus.DELIVERED]: 'admin.orders.detail.consequence.delivered',
};

@Component({
  selector: 'app-status-transition-panel',
  templateUrl: './status-transition-panel.component.html',
  styleUrl: './status-transition-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusTransitionPanelComponent implements AfterViewInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly orderApi = inject(AdminOrderApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  @Input({ required: true }) order!: OrderResponse;
  @Output() readonly changed = new EventEmitter<void>();

  @ViewChild('dialogRoot') private readonly dialogRootRef?: ElementRef<HTMLElement>;
  @ViewChild('dialogPanel') private readonly dialogPanelRef?: ElementRef<HTMLElement>;

  readonly noteMaxLength = NOTE_MAX_LENGTH;

  readonly confirmDialogOpen = signal(false);
  readonly cancelOrderId = signal<number | null>(null);

  readonly pendingStatus = signal<FulfillmentStatus | null>(null);
  readonly note = signal('');
  readonly saving = signal(false);
  readonly firingStatus = signal<FulfillmentStatus | null>(null);
  readonly panelError = signal<string | null>(null);

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId) && this.dialogRootRef) {
      this.renderer.appendChild(document.body, this.dialogRootRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId) || !this.dialogRootRef) {
      return;
    }
    const node = this.dialogRootRef.nativeElement;
    if (node.parentNode) {
      this.renderer.removeChild(node.parentNode, node);
    }
  }

  get transitions(): readonly FulfillmentStatus[] {
    return FULFILLMENT_TRANSITIONS[this.order.fulfillmentStatus] ?? [];
  }

  get pendingKind(): 'reason' | 'consequence' | null {
    const status = this.pendingStatus();
    if (!status) return null;
    return NOTE_REQUIRED_STATUSES.includes(status) ? 'reason' : 'consequence';
  }

  statusLabel(status: FulfillmentStatus): string {
    const labels = this.languageStore.lang() === Language.AR ? FULFILLMENT_STATUS_LABELS_AR : FULFILLMENT_STATUS_LABELS_EN;
    return labels[status];
  }

  statusTone(status: FulfillmentStatus): StatusTone {
    return FULFILLMENT_STATUS_TONE[status];
  }

  transitionIcon(status: FulfillmentStatus): string {
    return TRANSITION_ICON[status] ?? 'pi-arrow-right';
  }

  isConsequence(status: FulfillmentStatus): boolean {
    return CONSEQUENCE_STATUSES.includes(status);
  }

  consequenceCopyKey(status: FulfillmentStatus): string {
    return CONSEQUENCE_COPY[status] ?? '';
  }

  onTransitionClick(status: FulfillmentStatus): void {
    if (this.saving() || this.firingStatus() !== null) {
      return;
    }
    if (status === FulfillmentStatus.CONFIRMED && this.order.fulfillmentStatus === FulfillmentStatus.PENDING) {
      this.confirmDialogOpen.set(true);
      return;
    }
    if (status === FulfillmentStatus.CANCELLED) {
      this.cancelOrderId.set(this.order.id);
      return;
    }
    if (NOTE_REQUIRED_STATUSES.includes(status) || CONSEQUENCE_STATUSES.includes(status)) {
      this.pendingStatus.set(status);
      this.note.set('');
      this.saving.set(false);
      this.panelError.set(null);
      if (isPlatformBrowser(this.platformId)) {
        setTimeout(() => this.dialogPanelRef?.nativeElement.focus());
      }
      return;
    }
    this.fire(status, undefined);
  }

  closePendingDialog(): void {
    if (this.saving()) {
      return;
    }
    this.pendingStatus.set(null);
  }

  submitPendingDialog(): void {
    const status = this.pendingStatus();
    if (!status || this.saving()) {
      return;
    }
    const noteValue = this.note().trim();
    if (this.pendingKind === 'reason' && !noteValue) {
      return;
    }
    this.fire(status, noteValue || undefined, () => this.pendingStatus.set(null));
  }

  onConfirmed(): void {
    this.confirmDialogOpen.set(false);
    this.changed.emit();
  }

  onCancelled(): void {
    this.cancelOrderId.set(null);
    this.changed.emit();
  }

  onChildConflict(): void {
    this.changed.emit();
  }

  private fire(status: FulfillmentStatus, note: string | undefined, onDone?: () => void): void {
    const isDirectFire = onDone === undefined;
    this.saving.set(true);
    this.panelError.set(null);
    if (isDirectFire) {
      this.firingStatus.set(status);
    }
    const lang = this.languageStore.lang() === Language.AR ? Language.AR : Language.EN;

    this.orderApi.setFulfillment(this.order.id, { status, note }).subscribe({
      next: () => {
        this.saving.set(false);
        this.firingStatus.set(null);
        onDone?.();
        this.toast.success(this.translate.instant('toast.orders.statusChanged', { status: this.statusLabel(status) }));
        this.changed.emit();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.firingStatus.set(null);
        const result = handleAdminMutationError(err, this.toast, lang);
        if (result.isConflict) {
          this.panelError.set(result.message);
          this.changed.emit();
        } else if (result.fieldError) {
          this.panelError.set(result.fieldError);
        }
      },
    });
  }
}
