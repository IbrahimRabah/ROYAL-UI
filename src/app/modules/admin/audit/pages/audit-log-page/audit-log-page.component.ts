import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AuditEntryResponse } from '../../../../../core/models';
import { AdminAuditApiService } from '../../../../../core/services/api/admin-audit-api.service';
import { AdminListReturnService } from '../../../../../core/services/admin-list-return.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { Language } from '../../../../../core/enums/language';
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABELS_AR,
  AUDIT_ACTION_LABELS_EN,
  AUDIT_ACTION_TONE,
  AUDIT_ENTITY_TYPES,
  AUDIT_ENTITY_TYPE_LABELS_AR,
  AUDIT_ENTITY_TYPE_LABELS_EN,
  AuditAction,
  AuditEntityType,
} from '../../../../../core/constants/audit.constants';

@Component({
  selector: 'app-audit-log-page',
  templateUrl: './audit-log-page.component.html',
  styleUrl: './audit-log-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditLogPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auditApi = inject(AdminAuditApiService);
  private readonly listReturn = inject(AdminListReturnService);
  private readonly languageStore = inject(LanguageStoreService);

  readonly pageSize = 50;
  readonly actionOptions = [...AUDIT_ACTIONS];
  readonly entityTypeOptions = [...AUDIT_ENTITY_TYPES];

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  readonly action = computed<AuditAction | null>(() => {
    const raw = this.queryParamMap().get('action');
    return raw && (AUDIT_ACTIONS as readonly string[]).includes(raw) ? (raw as AuditAction) : null;
  });
  readonly entityType = computed<AuditEntityType | null>(() => {
    const raw = this.queryParamMap().get('entityType');
    return raw && (AUDIT_ENTITY_TYPES as readonly string[]).includes(raw) ? (raw as AuditEntityType) : null;
  });
  readonly dateFrom = computed(() => this.queryParamMap().get('dateFrom'));
  readonly dateTo = computed(() => this.queryParamMap().get('dateTo'));
  readonly actor = computed(() => this.queryParamMap().get('actor') ?? '');
  readonly page = computed(() => Number(this.queryParamMap().get('page') ?? '0') || 0);

  readonly dateFromDate = computed(() => (this.dateFrom() ? new Date(this.dateFrom()!) : null));
  readonly dateToDate = computed(() => (this.dateTo() ? new Date(this.dateTo()!) : null));

  readonly hasActiveFilters = computed(() => !!(this.action() || this.entityType() || this.dateFrom() || this.dateTo() || this.actor()));

  readonly actorDraft = signal('');
  readonly filtersOpen = signal(false);
  readonly rows = signal<AuditEntryResponse[]>([]);
  readonly totalElements = signal(0);
  readonly loading = signal(true);
  readonly error = signal(false);

  private readonly actorInput$ = new Subject<string>();

  constructor() {
    this.actorDraft.set(this.actor());

    this.actorInput$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => this.updateQueryParams({ actor: value || null, page: null }));

    let first = true;
    effect(
      () => {
        const page = this.page();
        this.action();
        this.entityType();
        this.dateFrom();
        this.dateTo();
        this.actor();
        if (!first) {
          this.actorDraft.set(this.actor());
        }
        first = false;
        this.listReturn.remember('/admin/audit', this.router.url);
        this.fetch(page);
      },
      { allowSignalWrites: true },
    );
  }

  actionLabel(action: string): string {
    const labels = this.languageStore.lang() === Language.AR ? AUDIT_ACTION_LABELS_AR : AUDIT_ACTION_LABELS_EN;
    return labels[action as AuditAction] ?? action;
  }

  entityTypeLabel(entityType: string): string {
    const labels = this.languageStore.lang() === Language.AR ? AUDIT_ENTITY_TYPE_LABELS_AR : AUDIT_ENTITY_TYPE_LABELS_EN;
    return labels[entityType as AuditEntityType] ?? entityType;
  }

  actionColor(action: string): string {
    return AUDIT_ACTION_TONE[action as AuditAction] ?? 'var(--admin-text-muted)';
  }

  onActorDraftChange(value: string): void {
    this.actorDraft.set(value);
    this.actorInput$.next(value);
  }

  onActionChange(value: AuditAction | null): void {
    this.updateQueryParams({ action: value, page: null });
  }

  onEntityTypeChange(value: AuditEntityType | null): void {
    this.updateQueryParams({ entityType: value, page: null });
  }

  onDateFromChange(date: Date | null): void {
    this.updateQueryParams({ dateFrom: toIsoDate(date), page: null });
  }

  onDateToChange(date: Date | null): void {
    this.updateQueryParams({ dateTo: toIsoDate(date), page: null });
  }

  clearFilters(): void {
    this.actorDraft.set('');
    this.updateQueryParams({ action: null, entityType: null, dateFrom: null, dateTo: null, actor: null, page: null });
  }

  onPage(event: { first?: number | null; rows?: number | null }): void {
    const rows = event.rows ?? this.pageSize;
    const newPage = Math.floor((event.first ?? 0) / rows);
    this.updateQueryParams({ page: newPage || null });
  }

  retry(): void {
    this.fetch(this.page());
  }

  private fetch(page: number): void {
    this.loading.set(true);
    this.error.set(false);

    this.auditApi.list(this.action() ?? undefined, undefined, page, this.pageSize).subscribe({
      next: (res) => {
        let content = res.content;

        const entityType = this.entityType();
        if (entityType) {
          content = content.filter((r) => r.entityType === entityType);
        }

        const actor = this.actor().trim().toLowerCase();
        if (actor) {
          content = content.filter((r) => r.actorName.toLowerCase().includes(actor));
        }

        const from = this.dateFrom();
        if (from) {
          const fromTime = new Date(from).getTime();
          content = content.filter((r) => new Date(r.createdAt).getTime() >= fromTime);
        }

        const to = this.dateTo();
        if (to) {
          const toTime = new Date(to).getTime() + 24 * 3_600_000 - 1;
          content = content.filter((r) => new Date(r.createdAt).getTime() <= toTime);
        }

        this.rows.set(content);
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
