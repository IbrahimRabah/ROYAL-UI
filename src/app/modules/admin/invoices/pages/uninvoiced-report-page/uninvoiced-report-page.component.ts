import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { UninvoicedReport } from '../../../../../core/models';
import { AdminInvoiceApiService } from '../../../../../core/services/api/admin-invoice-api.service';
import { ToastService } from '../../../../../core/services/toast.service';

@Component({
  selector: 'app-uninvoiced-report-page',
  templateUrl: './uninvoiced-report-page.component.html',
  styleUrl: './uninvoiced-report-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UninvoicedReportPageComponent {
  private readonly invoiceApi = inject(AdminInvoiceApiService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly report = signal<UninvoicedReport | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly issueDialogOrderId = signal<number | null>(null);

  constructor() {
    this.fetch();
  }

  retry(): void {
    this.fetch();
  }

  openIssueDialog(orderId: number): void {
    this.issueDialogOrderId.set(orderId);
  }

  onIssueDialogClosed(): void {
    this.issueDialogOrderId.set(null);
  }

  onIssued(): void {
    this.issueDialogOrderId.set(null);
    this.toast.success(this.translate.instant('toast.invoices.issued'));
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set(false);
    this.invoiceApi.uninvoiced().subscribe({
      next: (report) => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
