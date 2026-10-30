import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subject, catchError, debounceTime, map, of, switchMap } from 'rxjs';

import { ERROR_MESSAGES_AR, ERROR_MESSAGES_EN } from '../../../../../core/constants/error-messages';
import { StatusTone } from '../../../../../core/constants/order-status.constants';
import { ErrorCode } from '../../../../../core/enums/error-code';
import { Language } from '../../../../../core/enums/language';
import {
  ImportBatchResponse,
  ImportCommitResponse,
  ImportMessage,
  ImportRowAction,
  ImportRowResponse,
  ImportRowSpecification,
  ImportRowStatus,
  ImportSkuCheck,
  Money,
  PageResponse,
  emptyPage,
  isApiError,
  money,
} from '../../../../../core/models';
import { AdminProductImportApiService } from '../../../../../core/services/api/admin-product-import-api.service';
import { AdminTaxonomyApiService } from '../../../../../core/services/api/admin-taxonomy-api.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { downloadBlob } from '../../../../../core/services/file-download.util';
import { ToastService } from '../../../../../core/services/toast.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { flattenCategoryTree } from '../../../../../shared/utils/flatten-category-tree.util';
import { validateImportField } from '../../../../../shared/utils/import-row-validator.util';

type RowFilter = 'ALL' | 'ERROR' | 'VALID';

/** How an input of the editor looks: red (error), amber (warning), green (filled and fine), or plain (empty, optional). */
type FieldState = 'stop' | 'warn' | 'ok' | 'idle';

interface Problem {
  title: string;
  detail: string | null;
}

/** What is wrong with one input right now, with the text to show. */
interface FieldIssue {
  severity: 'ERROR' | 'WARNING';
  code: string;
  text: string;
}

/** One input of the row editor. `key` is the same key the server uses for the value and for findings. */
interface FieldDef {
  key: string;
  type: 'text' | 'number' | 'textarea' | 'category';
}

const MONEY_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  style: 'currency',
  currency: 'EGP',
  currencyDisplay: 'code',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Invalid rows first, each group in the order it came: the server sorts this way, and so does the screen. */
function invalidFirst(rows: ImportRowResponse[]): ImportRowResponse[] {
  return [...rows].sort((a, b) => Number(b.status === 'ERROR') - Number(a.status === 'ERROR'));
}

const XLSX_EXTENSION = /\.xlsx$/i;

/** The yes/no spellings the sheet and the server use for a specification. */
const YES = 'نعم';
const NO = 'لا';

/**
 * Two steps, so nothing reaches the catalogue unreviewed: upload a filled template and review every
 * row (nothing is saved), then submit the whole sheet.
 *
 * <ul>
 *   <li>Invalid rows are listed first. Each finding says which column and cell it is about.</li>
 *   <li>A row is corrected in place. The inputs are checked while typing: red while wrong, green once
 *       right; the SKU is also checked against the rest of the sheet and the catalogue. Saving asks the
 *       server, which decides, and answers with the new totals. A row fixed this way turns green and
 *       stays where it is until the list is re-sorted, so the screen does not jump under the cursor.</li>
 *   <li>The submit is offered only when EVERY row is valid. Products are created as drafts; publishing is
 *       done from the product list.</li>
 * </ul>
 */
@Component({
  selector: 'app-product-import-page',
  templateUrl: './product-import-page.component.html',
  styleUrl: './product-import-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductImportPageComponent {
  private readonly api = inject(AdminProductImportApiService);
  private readonly taxonomyApi = inject(AdminTaxonomyApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly pageSize = 25;
  readonly yes = YES;
  readonly no = NO;

  readonly basicFields: FieldDef[] = [
    { key: 'sku', type: 'text' },
    { key: 'category', type: 'category' },
    { key: 'name_ar', type: 'text' },
    { key: 'name_en', type: 'text' },
    { key: 'price', type: 'number' },
    { key: 'compare_at', type: 'number' },
    { key: 'stock', type: 'number' },
    { key: 'slug', type: 'text' },
  ];

  readonly textFields: FieldDef[] = [
    { key: 'short_ar', type: 'text' },
    { key: 'desc_ar', type: 'textarea' },
    { key: 'desc_en', type: 'textarea' },
    { key: 'meta_title_ar', type: 'text' },
    { key: 'meta_title_en', type: 'text' },
    { key: 'meta_desc_ar', type: 'textarea' },
    { key: 'meta_desc_en', type: 'textarea' },
  ];

  readonly batch = signal<ImportBatchResponse | null>(null);
  readonly result = signal<ImportCommitResponse | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly problem = signal<Problem | null>(null);

  readonly downloading = signal(false);
  readonly uploading = signal(false);
  readonly committing = signal(false);
  readonly loadingRows = signal(false);
  readonly saving = signal(false);

  readonly filter = signal<RowFilter>('ALL');
  readonly rows = signal<PageResponse<ImportRowResponse>>(emptyPage<ImportRowResponse>(this.pageSize));
  readonly expanded = signal<ReadonlySet<number>>(new Set<number>());

  /** Rows fixed on this screen: they stay green and in place until the list is re-sorted. */
  readonly fixed = signal<ReadonlySet<number>>(new Set<number>());
  /** True once an edit has made the on-screen order stale (a fixed row would now sort lower). */
  readonly orderStale = signal(false);

  /** The row being corrected, and its values as typed so far. */
  readonly editing = signal<number | null>(null);
  readonly draft = signal<Record<string, string>>({});
  readonly categoryNames = signal<string[]>([]);
  readonly skuCheck = signal<{ rowNo: number; sku: string; result: ImportSkuCheck } | null>(null);
  private readonly skuInput$ = new Subject<{ batchId: number; rowNo: number; sku: string }>();

  readonly inPreview = computed(() => this.batch()?.status === 'PREVIEW' && !this.result());
  readonly busy = computed(() => this.uploading() || this.committing() || this.saving());


  /** Why the submit is off, in numbers; null when it is on. */
  readonly submitBlockedBy = computed(() => {
    const b = this.batch();
    return b && !b.canSubmit && b.errorRows > 0 ? b.errorRows : null;
  });

  constructor() {
    this.taxonomyApi.listCategories('PRODUCT').subscribe({
      next: (tree) =>
        this.categoryNames.set(flattenCategoryTree(tree, this.languageStore.lang()).map((c) => c.name)),
      error: () => {},
    });

    // A SKU is checked a moment after the typing stops, and only the latest answer is kept.
    this.skuInput$
      .pipe(
        debounceTime(300),
        switchMap((q) =>
          this.api.checkSku(q.batchId, q.sku, q.rowNo).pipe(
            map((result) => ({ rowNo: q.rowNo, sku: q.sku, result })),
            catchError(() => of(null)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((answer) => this.skuCheck.set(answer));
  }

  // ------------------------------------------------------------------ step 1: template and upload

  downloadTemplate(): void {
    if (!isPlatformBrowser(this.platformId) || this.downloading()) {
      return;
    }
    this.downloading.set(true);
    this.api.template().subscribe({
      next: (blob) => {
        this.downloading.set(false);
        downloadBlob(blob, 'product-import-template.xlsx', this.platformId);
      },
      error: () => this.downloading.set(false),
    });
  }

  onFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;
    this.problem.set(null);

    if (file && !XLSX_EXTENSION.test(file.name)) {
      this.selectedFile.set(null);
      input.value = '';
      this.problem.set({ title: this.messageFor(ErrorCode.UNSUPPORTED_FILE_TYPE), detail: null });
      return;
    }
    this.selectedFile.set(file);
  }

  upload(): void {
    const file = this.selectedFile();
    if (!file || this.busy()) {
      return;
    }
    this.uploading.set(true);
    this.problem.set(null);

    this.api.upload(file).subscribe({
      next: (batch) => {
        this.uploading.set(false);
        this.batch.set(batch);
        this.filter.set(batch.errorRows > 0 ? 'ERROR' : 'ALL');
        this.expanded.set(new Set<number>());
        this.fixed.set(new Set<number>());
        this.orderStale.set(false);
        this.editing.set(null);
        this.loadRows(0);
      },
      error: (err: unknown) => {
        this.uploading.set(false);
        this.problem.set(this.describe(err));
      },
    });
  }

  // -------------------------------------------------------------------------- step 2: review

  setFilter(filter: RowFilter): void {
    if (this.filter() === filter) {
      return;
    }
    this.filter.set(filter);
    this.editing.set(null);
    this.loadRows(0);
  }

  goToPage(page: number): void {
    if (page < 0 || page >= this.rows().totalPages) {
      return;
    }
    this.editing.set(null);
    this.loadRows(page);
  }

  /** Sorts the list again, invalid rows first, now that some rows have been fixed. */
  reorder(): void {
    this.editing.set(null);
    this.loadRows(this.rows().page);
  }

  toggleRow(rowNo: number): void {
    const next = new Set(this.expanded());
    if (next.has(rowNo)) {
      next.delete(rowNo);
    } else {
      next.add(rowNo);
    }
    this.expanded.set(next);
  }

  isExpanded(rowNo: number): boolean {
    return this.expanded().has(rowNo);
  }

  private loadRows(page: number): void {
    const batch = this.batch();
    if (!batch) {
      return;
    }
    this.loadingRows.set(true);
    const filter = this.filter();
    const status: ImportRowStatus | null = filter === 'ALL' ? null : filter;
    this.api.rows(batch.id, status, page, this.pageSize).subscribe({
      next: (res) => {
        // A fixed row leaves the "errors" list; if that emptied this page, step back one.
        if (res.content.length === 0 && page > 0) {
          this.loadRows(page - 1);
          return;
        }
        this.rows.set({ ...res, content: invalidFirst(res.content) });
        this.orderStale.set(false);
        this.loadingRows.set(false);
        // On the invalid list the findings are the point, so those rows open by themselves.
        if (this.filter() === 'ERROR') {
          const open = new Set(this.expanded());
          res.content.forEach((r) => open.add(r.rowNo));
          this.expanded.set(open);
        }
      },
      error: () => this.loadingRows.set(false),
    });
  }

  // ----------------------------------------------------------------------- fixing a row

  /** Opens the editor on a row; with a field, that input takes the focus (a finding's "fix" button). */
  startEdit(row: ImportRowResponse, field?: string | null): void {
    if (this.saving()) {
      return;
    }
    this.editing.set(row.rowNo);
    this.draft.set({ ...row.values });
    this.skuCheck.set(null);
    const open = new Set(this.expanded());
    open.add(row.rowNo);
    this.expanded.set(open);
    this.queueSkuCheck(row, row.values['sku'] ?? '');
    this.focusField(row.rowNo, field ?? this.firstErrorField(row));
  }

  cancelEdit(): void {
    this.editing.set(null);
  }

  isEditing(row: ImportRowResponse): boolean {
    return this.editing() === row.rowNo;
  }

  setDraft(row: ImportRowResponse, key: string, value: string): void {
    this.draft.set({ ...this.draft(), [key]: value });
    if (key === 'sku') {
      this.skuCheck.set(null);
      this.queueSkuCheck(row, value);
    }
  }

  private queueSkuCheck(row: ImportRowResponse, sku: string): void {
    const batch = this.batch();
    if (batch && sku.trim()) {
      this.skuInput$.next({ batchId: batch.id, rowNo: row.rowNo, sku: sku.trim() });
    }
  }

  draftValue(key: string): string {
    return this.draft()[key] ?? '';
  }

  /** The values that differ from what the server holds: only those are sent. */
  changedValues(row: ImportRowResponse): Record<string, string> {
    const changed: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.draft())) {
      if ((row.values[key] ?? '') !== value.trim()) {
        changed[key] = value;
      }
    }
    return changed;
  }

  hasChanges(row: ImportRowResponse): boolean {
    return Object.keys(this.changedValues(row)).length > 0;
  }

  /** Every key the editor shows, in order. */
  private editorKeys(row: ImportRowResponse): string[] {
    return [...this.basicFields, ...this.textFields].map((f) => f.key).concat(row.specifications.map((s) => s.key));
  }

  /**
   * What is wrong with one input right now. What the browser can check it checks as the person types; for
   * a value that is still exactly what the server holds, the server's own finding stands, because it knows
   * things the browser cannot (a slug another product uses, the specification attributes in the database).
   */
  fieldIssue(row: ImportRowResponse, key: string): FieldIssue | null {
    const value = this.draftValue(key);
    const specKinds: Record<string, 'TEXT' | 'NUMBER' | 'BOOLEAN'> = {};
    row.specifications.forEach((s) => (specKinds[s.key] = s.kind));

    const own = validateImportField(key, value, {
      categoryNames: this.categoryNames(),
      specKinds,
      values: this.draft(),
    });
    if (own) {
      return { severity: own.severity, code: own.code, text: this.codeText(own.code) };
    }

    if (key === 'sku') {
      const sku = this.skuIssue(row);
      if (sku) {
        return sku;
      }
    }

    if ((row.values[key] ?? '') === value.trim()) {
      const server = row.messages.find((m) => m.field === key);
      if (server) {
        return { severity: server.severity, code: server.code, text: this.messageText(server) };
      }
    }
    return null;
  }

  private skuIssue(row: ImportRowResponse): FieldIssue | null {
    const check = this.skuCheck();
    const typed = this.draftValue('sku').trim().toUpperCase();
    if (!check || check.rowNo !== row.rowNo || check.result.sku !== typed) {
      return null;
    }
    if (check.result.status === 'DUPLICATE_IN_FILE') {
      return {
        severity: 'ERROR',
        code: 'DUPLICATE_SKU',
        text: this.translate.instant('admin.products.import.sku.duplicate', { rows: check.result.rowNos.join(', ') }),
      };
    }
    if (check.result.status === 'IN_CATALOG') {
      return {
        severity: 'ERROR',
        code: 'SKU_EXISTS',
        text: this.translate.instant('admin.products.import.sku.inCatalog', { name: check.result.productName ?? '' }),
      };
    }
    return null;
  }

  /** True while the typed SKU has been confirmed unique by the server. */
  skuIsUnique(row: ImportRowResponse): boolean {
    const check = this.skuCheck();
    return !!check && check.rowNo === row.rowNo && check.result.sku === this.draftValue('sku').trim().toUpperCase()
      && check.result.status === 'AVAILABLE';
  }

  fieldState(row: ImportRowResponse, key: string): FieldState {
    const issue = this.fieldIssue(row, key);
    if (issue) {
      return issue.severity === 'ERROR' ? 'stop' : 'warn';
    }
    return this.draftValue(key).trim() ? 'ok' : 'idle';
  }

  /** How many inputs are still wrong, counted as the person types. */
  problemsLeft(row: ImportRowResponse): number {
    return this.editorKeys(row).filter((key) => this.fieldIssue(row, key)?.severity === 'ERROR').length;
  }

  canSave(row: ImportRowResponse): boolean {
    return !this.saving() && this.hasChanges(row) && this.problemsLeft(row) === 0;
  }

  saveEdit(row: ImportRowResponse): void {
    const batch = this.batch();
    if (!batch || !this.canSave(row)) {
      return;
    }
    const wasInvalid = row.status === 'ERROR';
    this.saving.set(true);
    this.api.editRow(batch.id, row.rowNo, this.changedValues(row)).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.batch.set(res.batch);

        // Update the row and every other row the edit changed IN PLACE: the list keeps its order, so
        // nothing jumps while the person is working down it.
        const updates = new Map<number, ImportRowResponse>([[res.row.rowNo, res.row]]);
        res.affected.forEach((r) => updates.set(r.rowNo, r));
        this.rows.set({
          ...this.rows(),
          content: this.rows().content.map((r) => updates.get(r.rowNo) ?? r),
        });

        const fixedNow = new Set(this.fixed());
        updates.forEach((r, no) => {
          if (r.status === 'VALID' && (no !== row.rowNo || wasInvalid)) {
            fixedNow.add(no);
          } else if (r.status === 'ERROR') {
            fixedNow.delete(no);
          }
        });
        this.fixed.set(fixedNow);
        this.orderStale.set(this.orderStale() || fixedNow.size > 0);

        if (res.row.status === 'VALID') {
          this.editing.set(null);
          this.toast.success(this.translate.instant('admin.products.import.toast.rowFixed', { row: row.rowNo }));
        } else {
          this.draft.set({ ...res.row.values });
          this.focusField(row.rowNo, this.firstErrorField(res.row));
        }
      },
      error: () => this.saving.set(false),
    });
  }

  private firstErrorField(row: ImportRowResponse): string | null {
    return row.messages.find((m) => m.severity === 'ERROR' && m.field)?.field ?? null;
  }

  private focusField(rowNo: number, field: string | null): void {
    if (!field || !isPlatformBrowser(this.platformId)) {
      return;
    }
    setTimeout(() => document.getElementById(this.inputId(rowNo, field))?.focus(), 0);
  }

  inputId(rowNo: number, key: string): string {
    return `import-edit-${rowNo}-${key}`;
  }

  /** The category names with the row's own value first, so an unknown typed name still shows. */
  categoryOptions(): string[] {
    const current = this.draftValue('category');
    return current && !this.categoryNames().includes(current) ? [current, ...this.categoryNames()] : this.categoryNames();
  }

  specValue(spec: ImportRowSpecification): string {
    return this.draftValue(spec.key);
  }

  // ------------------------------------------------------------------------ submit or discard

  commit(): void {
    const batch = this.batch();
    if (!batch || !batch.canSubmit || this.busy()) {
      return;
    }
    this.confirmDialog
      .confirm({
        title: this.translate.instant('admin.products.import.commitConfirm.title'),
        message: this.translate.instant('admin.products.import.commitConfirm.message', {
          count: batch.totalRows,
        }),
        confirmLabel: this.translate.instant('admin.products.import.commitConfirm.confirm'),
        cancelLabel: this.translate.instant('common.cancel'),
      })
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }
        this.committing.set(true);
        this.problem.set(null);
        this.api.commit(batch.id).subscribe({
          next: (res) => {
            this.committing.set(false);
            this.result.set(res);
            this.toast.success(this.translate.instant('admin.products.import.toast.committed'));
          },
          error: (err: unknown) => {
            this.committing.set(false);
            this.problem.set(this.describe(err));
          },
        });
      });
  }

  discard(): void {
    const batch = this.batch();
    if (!batch || this.busy()) {
      return;
    }
    this.api.discard(batch.id).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('admin.products.import.toast.discarded'));
        this.reset();
      },
      error: () => {},
    });
  }

  /** Back to step 1 for another file; a preview left behind is simply never submitted. */
  reset(): void {
    this.batch.set(null);
    this.result.set(null);
    this.selectedFile.set(null);
    this.problem.set(null);
    this.rows.set(emptyPage<ImportRowResponse>(this.pageSize));
    this.expanded.set(new Set<number>());
    this.fixed.set(new Set<number>());
    this.orderStale.set(false);
    this.editing.set(null);
    this.filter.set('ALL');
  }

  openProducts(): void {
    this.router.navigate(['/admin/products'], { queryParams: { status: 'DRAFT' } });
  }

  // ------------------------------------------------------------------------------ presentation

  rowName(row: ImportRowResponse): string {
    const data = row.data;
    return (this.languageStore.lang() === Language.AR ? data.nameAr || data.nameEn : data.nameEn || data.nameAr) || '—';
  }

  /** The look of a row: red while it has errors, green once valid, and bolder green when fixed here. */
  rowTone(row: ImportRowResponse): 'error' | 'fixed' | 'valid' {
    if (row.status === 'ERROR') {
      return 'error';
    }
    return this.fixed().has(row.rowNo) ? 'fixed' : 'valid';
  }

  actionTone(action: ImportRowAction | null): StatusTone {
    return action === 'UPDATE' ? 'info' : action === 'CREATE' ? 'ok' : 'muted';
  }

  actionKey(action: ImportRowAction | null): string {
    return 'admin.products.import.action.' + (action ?? 'NONE');
  }

  errorsOf(row: ImportRowResponse): ImportMessage[] {
    return row.messages.filter((m) => m.severity === 'ERROR');
  }

  warningsOf(row: ImportRowResponse): ImportMessage[] {
    return row.messages.filter((m) => m.severity === 'WARNING');
  }

  formatPrice(value: Money | null): string {
    return value == null ? '—' : MONEY_FORMATTER.format(money(value));
  }

  /** The text for a finding: the localized one for its code, else the server's own wording. */
  messageText(message: ImportMessage): string {
    const key = 'admin.products.import.messages.' + message.code;
    const translated = this.translate.instant(key);
    return translated === key ? message.message : translated;
  }

  private codeText(code: string): string {
    const key = 'admin.products.import.messages.' + code;
    const translated = this.translate.instant(key);
    return translated === key ? code : translated;
  }

  /** What the finding is about, in words: the column's header, else the field's own label. */
  messageSubject(message: ImportMessage): string {
    if (message.column) {
      return message.column;
    }
    if (!message.field) {
      return this.translate.instant('admin.products.import.wholeRow');
    }
    const key = 'admin.products.import.fields.' + message.field;
    const label = this.translate.instant(key);
    return label === key ? message.field : label;
  }

  private describe(err: unknown): Problem {
    if (err instanceof HttpErrorResponse && isApiError(err.error)) {
      const code = err.error.code;
      return { title: this.messageFor(code), detail: err.error.detail };
    }
    return { title: this.messageFor(ErrorCode.INTERNAL_ERROR), detail: null };
  }

  private messageFor(code: ErrorCode): string {
    const table = this.languageStore.lang() === Language.EN ? ERROR_MESSAGES_EN : ERROR_MESSAGES_AR;
    return table[code];
  }
}
