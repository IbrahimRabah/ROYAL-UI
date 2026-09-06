import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { StockMovementResponse } from '../../../../../core/models';
import { StockMovement, movementTypeLabelKey } from '../../../../../core/enums/stock-movement';
import { AdminInventoryApiService } from '../../../../../core/services/api/admin-inventory-api.service';
import { APP_CONFIG } from '../../../../../core/constants/app-config';
import { StatusTone } from '../../../../../core/constants/order-status.constants';

const MOVEMENT_TYPE_TONE: Record<StockMovement, StatusTone> = {
  [StockMovement.PURCHASE_RECEIVED]: 'ok',
  [StockMovement.RETURN_SELLABLE]: 'ok',
  [StockMovement.CANCELLATION_RESTOCK]: 'ok',
  [StockMovement.SALE]: 'info',
  [StockMovement.MANUAL_ADJUSTMENT]: 'warn',
  [StockMovement.DAMAGE_WRITEOFF]: 'stop',
  [StockMovement.RETURN_DAMAGED]: 'stop',
};

const REFERENCE_TYPE_LABEL_KEYS: Partial<Record<string, string>> = {
  VARIANT_CREATE: 'admin.inventory.movements.referenceType.VARIANT_CREATE',
  ADJUSTMENT: 'admin.inventory.movements.referenceType.ADJUSTMENT',
};

@Component({
  selector: 'app-movements-log-page',
  templateUrl: './movements-log-page.component.html',
  styleUrl: './movements-log-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MovementsLogPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly inventoryApi = inject(AdminInventoryApiService);

  readonly pageSize = APP_CONFIG.pagination.inventoryMovements.size;
  readonly movementTypeOptions = Object.values(StockMovement).map((type) => ({ type, labelKey: movementTypeLabelKey(type) }));

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  readonly variantId = computed(() => {
    const raw = this.queryParamMap().get('variantId');
    return raw ? Number(raw) : null;
  });
  readonly movementType = computed<StockMovement | null>(() => {
    const raw = this.queryParamMap().get('movementType');
    return raw && (Object.values(StockMovement) as string[]).includes(raw) ? (raw as StockMovement) : null;
  });
  readonly dateFrom = computed(() => this.queryParamMap().get('dateFrom'));
  readonly dateTo = computed(() => this.queryParamMap().get('dateTo'));
  readonly page = computed(() => Number(this.queryParamMap().get('page') ?? '0') || 0);

  readonly rows = signal<StockMovementResponse[]>([]);
  readonly totalElements = signal(0);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly resolvedSku = signal<string | null>(null);
  readonly skuDraft = signal('');
  readonly filtersOpen = signal(false);
  readonly skuNotFound = signal(false);
  readonly resolvingSku = signal(false);

  readonly dateFromDate = computed(() => (this.dateFrom() ? new Date(this.dateFrom()!) : null));
  readonly dateToDate = computed(() => (this.dateTo() ? new Date(this.dateTo()!) : null));

  constructor() {
    effect(() => {
      const id = this.variantId();
      if (id === null) {
        this.resolvedSku.set(null);
      } else {
        this.inventoryApi.getPosition(id).subscribe({
          next: (pos) => this.resolvedSku.set(pos.sku),
          error: () => this.resolvedSku.set(null),
        });
      }
    }, { allowSignalWrites: true });

    effect(() => {
      this.variantId();
      this.movementType();
      this.dateFrom();
      this.dateTo();
      this.page();
      this.fetchRows();
    }, { allowSignalWrites: true });
  }

  typeLabelKey(type: StockMovement): string {
    return movementTypeLabelKey(type);
  }

  typeTone(type: StockMovement): StatusTone {
    return MOVEMENT_TYPE_TONE[type];
  }

  deltaClass(row: StockMovementResponse): 'ok' | 'stop' {
    return row.quantityDelta >= 0 ? 'ok' : 'stop';
  }

  deltaText(row: StockMovementResponse): string {
    return row.quantityDelta > 0 ? `+${row.quantityDelta}` : `${row.quantityDelta}`;
  }

  referenceText(row: StockMovementResponse): string {
    return row.referenceId != null ? `${row.referenceType} #${row.referenceId}` : '—';
  }

  referenceTypeLabelKey(referenceType: string): string | null {
    return REFERENCE_TYPE_LABEL_KEYS[referenceType] ?? null;
  }

  resolveSkuAndFilter(): void {
    const q = this.skuDraft().trim();
    if (!q) {
      return;
    }
    this.resolvingSku.set(true);
    this.skuNotFound.set(false);
    this.inventoryApi.list({ q, size: 1 }).subscribe({
      next: (res) => {
        this.resolvingSku.set(false);
        const match = res.content[0];
        if (match) {
          this.skuDraft.set('');
          this.updateQueryParams({ variantId: match.variantId, page: null });
        } else {
          this.skuNotFound.set(true);
        }
      },
      error: () => this.resolvingSku.set(false),
    });
  }

  clearVariantFilter(): void {
    this.updateQueryParams({ variantId: null, page: null });
  }

  onMovementTypeChange(type: StockMovement | null): void {
    this.updateQueryParams({ movementType: type, page: null });
  }

  onDateFromChange(date: Date | null): void {
    this.updateQueryParams({ dateFrom: toIsoDate(date), page: null });
  }

  onDateToChange(date: Date | null): void {
    this.updateQueryParams({ dateTo: toIsoDate(date), page: null });
  }

  onPage(event: { first?: number | null; rows?: number | null }): void {
    const rows = event.rows ?? this.pageSize;
    const newPage = Math.floor((event.first ?? 0) / rows);
    this.updateQueryParams({ page: newPage || null });
  }

  retry(): void {
    this.fetchRows();
  }

  private fetchRows(): void {
    this.loading.set(true);
    this.error.set(false);
    this.inventoryApi
      .movements({
        variantId: this.variantId() ?? undefined,
        movementType: this.movementType() ?? undefined,
        dateFrom: this.dateFrom() ?? undefined,
        dateTo: this.dateTo() ?? undefined,
        page: this.page(),
        size: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.content);
          this.totalElements.set(res.totalElements);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set(true);
        },
      });
  }

  private updateQueryParams(partial: Record<string, string | number | null | undefined>): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: partial, queryParamsHandling: 'merge' });
  }
}

function toIsoDate(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
