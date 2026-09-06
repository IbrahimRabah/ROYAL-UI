import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { InvoiceResponse, Money, OrderResponse, money } from '../../../../../core/models';
import { FulfillmentStatus } from '../../../../../core/enums/fulfillment-status';
import { Language } from '../../../../../core/enums/language';
import {
  FULFILLMENT_STATUS_LABELS_AR,
  FULFILLMENT_STATUS_LABELS_EN,
  FULFILLMENT_STATUS_TONE,
  PAYMENT_STATUS_LABELS_AR,
  PAYMENT_STATUS_LABELS_EN,
  PAYMENT_STATUS_TONE,
  StatusTone,
} from '../../../../../core/constants/order-status.constants';
import { AdminOrderApiService } from '../../../../../core/services/api/admin-order-api.service';
import { AdminInvoiceApiService } from '../../../../../core/services/api/admin-invoice-api.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { downloadBlob } from '../../../../../core/services/file-download.util';

const MONEY_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  style: 'currency',
  currency: 'EGP',
  currencyDisplay: 'code',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US-u-nu-latn', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

@Component({
  selector: 'app-order-details-page',
  templateUrl: './order-details-page.component.html',
  styleUrl: './order-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly orderApi = inject(AdminOrderApiService);
  private readonly invoiceApi = inject(AdminInvoiceApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly order = signal<OrderResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly paymentDialogOpen = signal(false);

  readonly invoice = signal<InvoiceResponse | null>(null);
  readonly invoiceChecked = signal(false);
  readonly downloadingInvoice = signal(false);

  private readonly orderId = Number(this.route.snapshot.paramMap.get('id'));

  constructor() {
    this.fetch();
  }

  statusLabel(status: FulfillmentStatus): string {
    const labels = this.languageStore.lang() === Language.AR ? FULFILLMENT_STATUS_LABELS_AR : FULFILLMENT_STATUS_LABELS_EN;
    return labels[status];
  }

  statusTone(status: FulfillmentStatus): StatusTone {
    return FULFILLMENT_STATUS_TONE[status];
  }

  paymentStatusLabel(status: string): string {
    const labels = this.languageStore.lang() === Language.AR ? PAYMENT_STATUS_LABELS_AR : PAYMENT_STATUS_LABELS_EN;
    return (labels as Record<string, string>)[status] ?? status;
  }

  paymentStatusTone(status: string): StatusTone {
    return (PAYMENT_STATUS_TONE as Record<string, StatusTone>)[status] ?? 'info';
  }

  formatMoney(value: Money): string {
    return MONEY_FORMATTER.format(money(value));
  }

  formatDate(iso: string): string {
    return DATE_FORMATTER.format(new Date(iso));
  }

  copyAddress(): void {
    const order = this.order();
    if (!order || !isPlatformBrowser(this.platformId) || !navigator.clipboard) {
      return;
    }
    navigator.clipboard.writeText(order.shippingAddress.formatted).then(
      () => this.toast.success(this.translate.instant('admin.orders.detail.address.copied')),
      () => {},
    );
  }

  openPaymentDialog(): void {
    this.paymentDialogOpen.set(true);
  }

  onPaymentUpdated(): void {
    this.paymentDialogOpen.set(false);
    this.fetch();
  }

  onTransitionChanged(): void {
    this.fetch();
  }

  downloadInvoice(): void {
    const invoice = this.invoice();
    if (!invoice || this.downloadingInvoice()) {
      return;
    }
    this.downloadingInvoice.set(true);
    this.invoiceApi.downloadPdf(invoice.id).subscribe({
      next: (blob) => {
        this.downloadingInvoice.set(false);
        downloadBlob(blob, `${invoice.invoiceNumber}.pdf`, this.platformId);
      },
      error: () => this.downloadingInvoice.set(false),
    });
  }

  retry(): void {
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set(false);
    this.orderApi.get(this.orderId).subscribe({
      next: (order) => {
        this.order.set(order);
        this.loading.set(false);
        if (order.fulfillmentStatus === FulfillmentStatus.DELIVERED && !this.invoiceChecked()) {
          this.lookupInvoice(order.id);
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  private lookupInvoice(orderId: number): void {
    this.invoiceApi.list(0, 100).subscribe({
      next: (page) => {
        this.invoiceChecked.set(true);
        this.invoice.set(page.content.find((inv) => inv.orderId === orderId) ?? null);
      },
      error: () => this.invoiceChecked.set(true),
    });
  }
}
