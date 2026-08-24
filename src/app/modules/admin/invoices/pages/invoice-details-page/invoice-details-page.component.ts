import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { InvoiceResponse, Money, money } from '../../../../../core/models';
import { InvoiceStatus } from '../../../../../core/enums/invoice-status';
import { Language } from '../../../../../core/enums/language';
import { StatusTone } from '../../../../../core/constants/order-status.constants';
import {
  INVOICE_STATUS_LABELS_AR,
  INVOICE_STATUS_LABELS_EN,
  INVOICE_STATUS_TONE,
} from '../../../../../core/constants/invoice-status.constants';
import { AdminInvoiceApiService } from '../../../../../core/services/api/admin-invoice-api.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { ToastService } from '../../../../../core/services/toast.service';

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

@Component({
  selector: 'app-invoice-details-page',
  templateUrl: './invoice-details-page.component.html',
  styleUrl: './invoice-details-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InvoiceDetailsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly invoiceApi = inject(AdminInvoiceApiService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly invoiceId = Number(this.route.snapshot.paramMap.get('id'));
  readonly InvoiceStatus = InvoiceStatus;

  readonly invoice = signal<InvoiceResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly downloading = signal(false);
  readonly cancelDialogOpen = signal(false);

  constructor() {
    this.fetch();
  }

  statusLabel(status: InvoiceStatus): string {
    const labels = this.languageStore.lang() === Language.AR ? INVOICE_STATUS_LABELS_AR : INVOICE_STATUS_LABELS_EN;
    return labels[status];
  }

  statusTone(status: InvoiceStatus): StatusTone {
    return INVOICE_STATUS_TONE[status];
  }

  formatAmount(value: Money): string {
    return NUMBER_FORMATTER.format(money(value));
  }

  retry(): void {
    this.fetch();
  }

  downloadPdf(): void {
    const inv = this.invoice();
    if (!isPlatformBrowser(this.platformId) || !inv || this.downloading()) {
      return;
    }
    this.downloading.set(true);
    this.invoiceApi.downloadPdf(inv.id).subscribe({
      next: (blob) => {
        this.downloading.set(false);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${inv.invoiceNumber}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.downloading.set(false),
    });
  }

  openCancelDialog(): void {
    this.cancelDialogOpen.set(true);
  }

  onCancelDialogClosed(): void {
    this.cancelDialogOpen.set(false);
  }

  onCancelled(): void {
    this.cancelDialogOpen.set(false);
    this.toast.success(this.translate.instant('toast.invoices.cancelled'));
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set(false);
    this.invoiceApi.get(this.invoiceId).subscribe({
      next: (inv) => {
        this.invoice.set(inv);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
