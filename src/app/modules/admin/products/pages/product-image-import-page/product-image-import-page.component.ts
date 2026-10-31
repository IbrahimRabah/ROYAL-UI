import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, defer, from, lastValueFrom, mergeMap, of, catchError, map } from 'rxjs';

import { ERROR_MESSAGES_AR, ERROR_MESSAGES_EN } from '../../../../../core/constants/error-messages';
import { ErrorCode } from '../../../../../core/enums/error-code';
import { Language } from '../../../../../core/enums/language';
import {
  ImageBulkResponse,
  ImageImportMode,
  ImageMatchResponse,
  ImageProductMatch,
  isApiError,
} from '../../../../../core/models';
import { AdminProductImageImportApiService } from '../../../../../core/services/api/admin-product-image-import-api.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import {
  FILES_PER_REQUEST,
  fileKey,
  folderOf,
  planBatches,
  resizeForUpload,
} from '../../../../../shared/utils/image-upload.util';

type Phase = 'pick' | 'checking' | 'report' | 'uploading' | 'done';
type Section = 'matched' | 'conflicts' | 'unmatched' | 'without';

/** One file on its way to a product. `state` is where it is now; `code` says why when it did not go in. */
type ItemState = 'queued' | 'working' | 'ATTACHED' | 'SKIPPED' | 'REJECTED' | 'FAILED';

interface UploadItem {
  key: string;
  file: File;
  name: string;
  sku: string;
  position: number;
  productName: string;
  state: ItemState;
  code: string | null;
}

/** A file the person picked, with the folder it came from (a renamed copy loses `webkitRelativePath`). */
interface Picked {
  file: File;
  folder: string | null;
}

interface Problem {
  title: string;
  detail: string | null;
}

/** Requests in flight at once. Two keeps the server busy without holding many decoded pictures in memory. */
const PARALLEL_REQUESTS = 2;
/** Cards drawn at a time in the matched list; each one decodes a picture. */
const PAGE = 48;
/** The match request carries names only, and the server takes this many. */
const MAX_NAMES = 5000;

/** randomUUID needs a secure context (https or localhost); an admin on a plain-http address still needs an id. */
function newRunId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

@Component({
  selector: 'app-product-image-import-page',
  templateUrl: './product-image-import-page.component.html',
  styleUrl: './product-image-import-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductImageImportPageComponent {
  private readonly api = inject(AdminProductImageImportApiService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly languageStore = inject(LanguageStoreService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly modes: ImageImportMode[] = ['SKIP', 'ADD', 'REPLACE'];
  readonly sections: Section[] = ['matched', 'conflicts', 'unmatched', 'without'];

  readonly phase = signal<Phase>('pick');
  readonly mode = signal<ImageImportMode>('SKIP');
  readonly section = signal<Section>('matched');
  readonly problem = signal<Problem | null>(null);
  readonly match = signal<ImageMatchResponse | null>(null);
  readonly items = signal<UploadItem[]>([]);
  readonly shown = signal(PAGE);
  readonly stopping = signal(false);

  /** The files the person picked, by name + folder, to tie each server answer back to its File. */
  private picked = new Map<string, Picked>();
  private readonly previews = new Map<string, string>();
  /** One id for the whole run, kept across retries: it is how the server tells this run's images from older ones. */
  private runId = '';

  readonly pickedCount = signal(0);

  readonly summary = computed(() => this.match()?.summary ?? null);
  readonly cards = computed(() => (this.match()?.products ?? []).slice(0, this.shown()));
  readonly hasMoreCards = computed(() => (this.match()?.products.length ?? 0) > this.shown());

  readonly total = computed(() => this.items().length);
  readonly finished = computed(() => this.items().filter((i) => i.state !== 'queued' && i.state !== 'working').length);
  readonly percent = computed(() => (this.total() === 0 ? 0 : Math.round((this.finished() / this.total()) * 100)));
  readonly counts = computed(() => {
    const c = { attached: 0, skipped: 0, rejected: 0, failed: 0 };
    for (const item of this.items()) {
      if (item.state === 'ATTACHED') c.attached++;
      else if (item.state === 'SKIPPED') c.skipped++;
      else if (item.state === 'REJECTED') c.rejected++;
      else if (item.state === 'FAILED') c.failed++;
    }
    return c;
  });
  readonly notAttached = computed(() => this.items().filter((i) => i.state === 'SKIPPED' || i.state === 'REJECTED' || i.state === 'FAILED'));
  /** What a retry sends: files the server could not save, and any left unsent when the person stopped. */
  readonly retryable = computed(() => this.items().filter((i) => i.state === 'FAILED' || i.state === 'queued'));

  /** Files the server will take, if the person goes ahead. */
  readonly canUpload = computed(() => this.phase() === 'report' && (this.summary()?.toUpload ?? 0) > 0);

  /** Products that have images today and would lose them under REPLACE. */
  readonly productsToReplace = computed(
    () => (this.match()?.products ?? []).filter((p) => p.action === 'ATTACH' && p.existingImageCount > 0).length,
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revokePreviews());
  }

  // ------------------------------------------------------------------ picking

  onFolderChosen(event: Event): void {
    this.take(event);
  }

  onFilesChosen(event: Event): void {
    this.take(event);
  }

  private take(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    // The same folder must be choosable again after a change on disk.
    input.value = '';
    if (files.length === 0) {
      return;
    }
    this.revokePreviews();
    this.picked = new Map(
      files.map((f): [string, Picked] => {
        const folder = folderOf(f.webkitRelativePath);
        return [fileKey(f.name, folder), { file: f, folder }];
      }),
    );
    this.pickedCount.set(files.length);
    this.items.set([]);
    this.runId = '';
    this.check();
  }

  setMode(mode: ImageImportMode): void {
    if (this.phase() === 'uploading' || this.mode() === mode) {
      return;
    }
    this.mode.set(mode);
    if (this.picked.size > 0) {
      this.check();
    }
  }

  /** The name a file would carry if renamed: what the person typed, plus the extension it already has. */
  renamedTo(fileName: string, typed: string): string {
    const dot = fileName.lastIndexOf('.');
    const extension = dot > 0 ? fileName.substring(dot) : '';
    return typed.trim().replace(/[\\/]/g, '') + extension;
  }

  /** The text to start the rename box with: the suggested SKU, else the name without its extension. */
  renameStart(u: { name: string; suggestionSku?: string | null; suggestionPosition?: number | null }): string {
    if (u.suggestionSku) {
      return u.suggestionSku + ((u.suggestionPosition ?? 1) > 1 ? '_' + u.suggestionPosition : '');
    }
    const dot = u.name.lastIndexOf('.');
    return dot > 0 ? u.name.substring(0, dot) : u.name;
  }

  /**
   * Gives a file that matched nothing the name it should have had, then matches again. The file on disk is
   * untouched: only the name this page sends changes, and that name is the SKU rule.
   */
  rename(u: { name: string; folder?: string | null }, typed: string): void {
    const newName = this.renamedTo(u.name, typed);
    if (!typed.trim() || newName === u.name || this.phase() !== 'report') {
      return;
    }
    const oldKey = fileKey(u.name, u.folder);
    const entry = this.picked.get(oldKey);
    if (!entry) {
      return;
    }
    const url = this.previews.get(oldKey);
    if (url) {
      URL.revokeObjectURL(url);
      this.previews.delete(oldKey);
    }
    this.picked.delete(oldKey);
    this.picked.set(fileKey(newName, entry.folder), {
      file: new File([entry.file], newName, { type: entry.file.type, lastModified: entry.file.lastModified }),
      folder: entry.folder,
    });
    this.check();
  }

  setSection(section: Section): void {
    this.section.set(section);
  }

  showMore(): void {
    this.shown.update((n) => n + PAGE);
  }

  /** Step 1: send the NAMES, get back which file belongs to which product. Nothing is uploaded. */
  private check(): void {
    this.problem.set(null);
    this.match.set(null);
    this.shown.set(PAGE);
    if (this.picked.size > MAX_NAMES) {
      this.problem.set({
        title: this.translate.instant('admin.products.imageImport.tooManyFiles', { max: MAX_NAMES }),
        detail: null,
      });
      this.phase.set('pick');
      return;
    }
    this.phase.set('checking');

    const files = Array.from(this.picked.values()).map((p) => ({
      name: p.file.name,
      sizeBytes: p.file.size,
      folder: p.folder,
    }));
    this.api.match({ mode: this.mode(), files }).subscribe({
      next: (response) => {
        this.match.set(response);
        this.items.set(this.buildItems(response));
        this.section.set(response.products.length > 0 ? 'matched' : response.unmatched.length > 0 ? 'unmatched' : 'matched');
        this.phase.set('report');
      },
      error: (err) => {
        const problem = this.describe(err);
        this.problem.set(problem);
        this.toast.error(problem.title);
        this.phase.set('pick');
      },
    });
  }

  private buildItems(response: ImageMatchResponse): UploadItem[] {
    const out: UploadItem[] = [];
    for (const product of response.products) {
      for (const f of product.files) {
        const file = this.picked.get(fileKey(f.name, f.folder))?.file;
        if (f.upload && file) {
          out.push({
            key: fileKey(f.name, f.folder),
            file,
            name: f.name,
            sku: product.sku,
            position: f.position,
            productName: this.productName(product),
            state: 'queued',
            code: null,
          });
        }
      }
    }
    return out;
  }

  // --------------------------------------------------------------- thumbnails

  /** A local preview of a picked file, made when first asked for and released when the page goes. */
  preview(name: string, folder: string | null | undefined): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const key = fileKey(name, folder);
    const file = this.picked.get(key)?.file;
    if (!file) {
      return null;
    }
    let url = this.previews.get(key);
    if (!url) {
      url = URL.createObjectURL(file);
      this.previews.set(key, url);
    }
    return url;
  }

  private revokePreviews(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.previews.forEach((url) => URL.revokeObjectURL(url));
    }
    this.previews.clear();
  }

  // ------------------------------------------------------------------- upload

  start(): void {
    if (!this.canUpload()) {
      return;
    }
    if (this.mode() !== 'REPLACE' || this.productsToReplace() === 0) {
      this.run(this.items());
      return;
    }
    this.confirmDialog
      .confirm({
        title: this.translate.instant('admin.products.imageImport.replaceConfirm.title'),
        message: this.translate.instant('admin.products.imageImport.replaceConfirm.message', {
          count: this.productsToReplace(),
        }),
        confirmLabel: this.translate.instant('admin.products.imageImport.replaceConfirm.confirm'),
        cancelLabel: this.translate.instant('common.cancel'),
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.run(this.items());
        }
      });
  }

  retryRemaining(): void {
    this.run(this.retryable());
  }

  stop(): void {
    this.stopping.set(true);
  }

  /** Sends the given items a few at a time. A run id made once is reused by every retry. */
  private run(toSend: UploadItem[]): void {
    if (toSend.length === 0) {
      return;
    }
    this.runId = this.runId || newRunId();
    this.stopping.set(false);
    this.problem.set(null);
    this.phase.set('uploading');
    const keys = new Set(toSend.map((i) => i.key));
    this.update(keys, () => ({ state: 'queued', code: null }));

    const batches = planBatches(toSend, (i) => i.sku, FILES_PER_REQUEST);
    from(batches)
      .pipe(mergeMap((batch) => defer(() => (this.stopping() ? EMPTY : from(this.sendBatch(batch)))), PARALLEL_REQUESTS))
      .subscribe({
        complete: () => {
          this.phase.set('done');
          this.announce();
        },
      });
  }

  /** The same toasts the rest of the admin uses: what went in, and what needs a second look. */
  private announce(): void {
    const c = this.counts();
    if (this.stopping()) {
      this.toast.info(this.translate.instant('admin.products.imageImport.toast.stopped', { count: c.attached }));
    } else if (c.attached > 0) {
      this.toast.success(this.translate.instant('admin.products.imageImport.toast.attached', { count: c.attached }));
    }
    if (c.failed > 0) {
      this.toast.error(this.translate.instant('admin.products.imageImport.toast.failed', { count: c.failed }));
    }
    if (c.rejected > 0) {
      this.toast.warning(this.translate.instant('admin.products.imageImport.toast.rejected', { count: c.rejected }));
    }
  }

  private async sendBatch(batch: UploadItem[]): Promise<void> {
    const keys = new Set(batch.map((i) => i.key));
    this.update(keys, () => ({ state: 'working', code: null }));

    // One picture at a time: a decoded camera photo is tens of megabytes.
    const ready: UploadItem[] = [];
    const files: File[] = [];
    for (const item of batch) {
      try {
        files.push(await resizeForUpload(item.file));
        ready.push(item);
      } catch (e) {
        const code = e instanceof Error && e.message === 'TOO_LARGE' ? 'TOO_LARGE' : 'UNREADABLE';
        this.update(new Set([item.key]), () => ({ state: 'REJECTED', code }));
      }
    }
    if (ready.length === 0) {
      return;
    }

    const answer = await lastValueFrom(
      this.api.upload(this.runId, this.mode(), files).pipe(
        map((r): ImageBulkResponse | null => r),
        catchError((err) => {
          // The whole request failed: nothing was decided about these files, so they can be sent again.
          const code = err instanceof HttpErrorResponse && isApiError(err.error) ? err.error.code : 'NETWORK';
          this.update(new Set(ready.map((i) => i.key)), () => ({ state: 'FAILED', code: String(code) }));
          return of(null);
        }),
      ),
    );
    if (!answer) {
      return;
    }
    answer.results.forEach((result, index) => {
      this.update(new Set([ready[index].key]), () => ({ state: result.status, code: result.code ?? null }));
    });
  }

  private update(keys: Set<string>, change: () => { state: ItemState; code: string | null }): void {
    const next = change();
    this.items.update((list) => list.map((i) => (keys.has(i.key) ? { ...i, ...next } : i)));
  }

  // ---------------------------------------------------------------- navigation

  openProducts(): void {
    void this.router.navigate(['/admin/products']);
  }

  openProduct(productId: number): void {
    void this.router.navigate(['/admin/products', productId]);
  }

  again(): void {
    this.revokePreviews();
    this.picked = new Map();
    this.pickedCount.set(0);
    this.match.set(null);
    this.items.set([]);
    this.runId = '';
    this.problem.set(null);
    this.phase.set('pick');
  }

  // ------------------------------------------------------------------- display

  productName(p: { nameAr?: string | null; nameEn?: string | null; sku?: string | null }): string {
    const ar = this.languageStore.lang() === Language.AR;
    return (ar ? p.nameAr || p.nameEn : p.nameEn || p.nameAr) || p.sku || '';
  }

  actionTone(p: ImageProductMatch): 'ok' | 'info' | 'stop' {
    return p.action === 'ATTACH' ? 'ok' : p.action === 'SKIP_HAS_IMAGES' ? 'info' : 'stop';
  }

  megabytes(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(1);
  }

  /** The translated reason for a code from the server or from this page, falling back to the code itself. */
  reason(code: string | null | undefined): string {
    if (!code) {
      return '';
    }
    const key = 'admin.products.imageImport.codes.' + code;
    const text = this.translate.instant(key);
    return text === key ? code : text;
  }

  private describe(err: unknown): Problem {
    if (err instanceof HttpErrorResponse && isApiError(err.error)) {
      return { title: this.messageFor(err.error.code), detail: err.error.detail };
    }
    return { title: this.messageFor(ErrorCode.INTERNAL_ERROR), detail: null };
  }

  private messageFor(code: ErrorCode): string {
    const table = this.languageStore.lang() === Language.EN ? ERROR_MESSAGES_EN : ERROR_MESSAGES_AR;
    return table[code];
  }
}
