import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';

import { OrderExportFilter } from '../../../../../core/models';
import { AdminExportApiService } from '../../../../../core/services/api/admin-export-api.service';
import { downloadBlob } from '../../../../../core/services/file-download.util';

type ExportKind = 'pickingList' | 'accounting';

@Component({
  selector: 'app-export-page',
  templateUrl: './export-page.component.html',
  styleUrl: './export-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExportPageComponent {
  private readonly exportApi = inject(AdminExportApiService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly filters = signal<OrderExportFilter>({ excludeCancelled: true });
  readonly downloading = signal<ExportKind | null>(null);
  readonly downloadError = signal<ExportKind | null>(null);

  readonly dateRangeInvalid = computed(() => {
    const { dateFrom, dateTo } = this.filters();
    return !!dateFrom && !!dateTo && dateFrom > dateTo;
  });

  onFiltersChange(filter: OrderExportFilter): void {
    this.filters.set(filter);
  }

  downloadPickingList(): void {
    this.download('pickingList');
  }

  downloadAccounting(): void {
    this.download('accounting');
  }

  private download(kind: ExportKind): void {
    if (!isPlatformBrowser(this.platformId) || this.downloading() !== null || this.dateRangeInvalid()) {
      return;
    }

    this.downloading.set(kind);
    this.downloadError.set(null);

    const request$ = kind === 'pickingList' ? this.exportApi.pickingList(this.filters()) : this.exportApi.accounting(this.filters());
    const extension = kind === 'pickingList' ? 'pdf' : 'xlsx';
    const stem = kind === 'pickingList' ? 'picking-list' : 'accounting';
    const today = new Date();
    const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    request$.subscribe({
      next: (blob) => {
        this.downloading.set(null);
        downloadBlob(blob, `royal-${stem}-${stamp}.${extension}`, this.platformId);
      },
      error: () => {
        this.downloading.set(null);
        this.downloadError.set(kind);
      },
    });
  }
}
