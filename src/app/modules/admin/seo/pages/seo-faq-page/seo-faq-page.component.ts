import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { AdminFaq, FaqSaveRequest, FaqScope, FaqStatus, FaqTopic, SeoRow } from '../../../../../core/models';
import { AdminSeoApiService } from '../../../../../core/services/api/admin-seo-api.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../../core/services/toast.service';

const TOPICS: FaqTopic[] = ['GENERAL', 'ORDERS', 'SHIPPING', 'PAYMENT', 'RETURNS', 'CUSTOM_WORK', 'CHECKOUT'];
const SCOPES: FaqScope[] = ['PRODUCT', 'CATEGORY', 'GENERAL'];

/** The form of the editor. Plain text only: no markup is stored or drawn. */
interface Form {
  id: number | null;
  scope: FaqScope;
  targetId: number | null;
  targetName: string;
  topic: FaqTopic;
  questionAr: string;
  answerAr: string;
  questionEn: string;
  answerEn: string;
  status: FaqStatus;
}

const emptyForm = (): Form => ({
  id: null, scope: 'GENERAL', targetId: null, targetName: '', topic: 'GENERAL',
  questionAr: '', answerAr: '', questionEn: '', answerEn: '', status: 'DRAFT',
});

/**
 * FAQs: write, publish, order and delete. A FAQ belongs to a product, a category, or the shop (by topic); only
 * the published ones reach the storefront, and the same text feeds the page and Google's FAQ markup.
 */
@Component({
  selector: 'app-seo-faq-page',
  templateUrl: './seo-faq-page.component.html',
  styleUrl: './seo-faq-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeoFaqPageComponent {
  private readonly api = inject(AdminSeoApiService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly translate = inject(TranslateService);

  readonly topics = TOPICS;
  readonly scopes = SCOPES;

  readonly scope = signal<FaqScope | null>(null);
  readonly status = signal<FaqStatus | null>(null);
  readonly topic = signal<FaqTopic | null>(null);
  readonly query = signal('');

  readonly items = signal<AdminFaq[]>([]);
  readonly selected = signal<ReadonlySet<number>>(new Set<number>());
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly busy = signal(false);

  readonly form = signal<Form | null>(null);
  readonly productResults = signal<SeoRow[]>([]);
  readonly categories = signal<SeoRow[]>([]);

  readonly allSelected = computed(() => this.items().length > 0 && this.items().every((i) => this.selected().has(i.id)));
  readonly canSave = computed(() => {
    const f = this.form();
    if (!f || this.busy()) return false;
    const hasTarget = f.scope === 'GENERAL' || f.targetId !== null;
    return hasTarget && f.questionAr.trim().length > 0 && f.answerAr.trim().length > 0;
  });

  private readonly search$ = new Subject<string>();
  private readonly pick$ = new Subject<string>();

  constructor() {
    this.search$.pipe(debounceTime(400), distinctUntilChanged()).subscribe((value) => {
      this.query.set(value);
      this.load();
    });
    this.pick$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((value) => {
      if (value.trim().length < 2) {
        this.productResults.set([]);
        return;
      }
      this.api.products(value, 'ALL', null, 0, 8).subscribe({ next: (p) => this.productResults.set(p.content), error: () => {} });
    });
    this.api.categories(null, 'ALL', 0, 100).subscribe({ next: (c) => this.categories.set(c.content), error: () => {} });
    this.load();
  }

  // ---------------------------------------------------------------------- list

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.faqs({ scope: this.scope(), status: this.status(), topic: this.topic(), targetId: null, q: this.query() || null }, 0).subscribe({
      next: (page) => {
        this.items.set(page.content);
        this.selected.set(new Set<number>());
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  setScope(value: string): void {
    this.scope.set((value || null) as FaqScope | null);
    this.load();
  }

  setStatus(value: string): void {
    this.status.set((value || null) as FaqStatus | null);
    this.load();
  }

  setTopic(value: string): void {
    this.topic.set((value || null) as FaqTopic | null);
    this.load();
  }

  onSearch(value: string): void {
    this.search$.next(value);
  }

  // ----------------------------------------------------------------- selection

  isSelected(f: AdminFaq): boolean {
    return this.selected().has(f.id);
  }

  toggle(f: AdminFaq): void {
    const next = new Set(this.selected());
    if (!next.delete(f.id)) {
      next.add(f.id);
    }
    this.selected.set(next);
  }

  toggleAll(): void {
    this.selected.set(this.allSelected() ? new Set<number>() : new Set(this.items().map((i) => i.id)));
  }

  bulk(status: FaqStatus): void {
    const ids = Array.from(this.selected());
    if (ids.length === 0 || this.busy()) return;
    this.busy.set(true);
    this.api.bulkFaqStatus(ids, status).subscribe({
      next: (r) => {
        this.busy.set(false);
        this.toast.success(this.translate.instant('seo.faq.toast.bulk', { count: r.changed }));
        this.load();
      },
      error: () => this.busy.set(false),
    });
  }

  togglePublished(f: AdminFaq): void {
    this.save({
      scope: f.scope,
      targetId: f.targetId ?? null,
      topic: f.topic ?? null,
      questionAr: f.questionAr,
      answerAr: f.answerAr,
      questionEn: f.questionEn ?? null,
      answerEn: f.answerEn ?? null,
      status: f.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
    }, 'seo.faq.toast.saved', f.id);
  }

  // -------------------------------------------------------------------- order

  /** Whether there is an item of the same page before or after this one in the list, to swap places with. */
  neighbour(f: AdminFaq, step: -1 | 1): AdminFaq | null {
    const group = this.items().filter((i) => this.sameGroup(i, f));
    const index = group.findIndex((i) => i.id === f.id);
    return group[index + step] ?? null;
  }

  move(f: AdminFaq, step: -1 | 1): void {
    if (this.busy()) return;
    const group = this.items().filter((i) => this.sameGroup(i, f));
    const index = group.findIndex((i) => i.id === f.id);
    const other = index + step;
    if (other < 0 || other >= group.length) return;
    const ids = group.map((i) => i.id);
    [ids[index], ids[other]] = [ids[other], ids[index]];
    this.busy.set(true);
    this.api.reorderFaqs(ids).subscribe({
      next: () => {
        this.busy.set(false);
        this.load();
      },
      error: () => this.busy.set(false),
    });
  }

  private sameGroup(a: AdminFaq, b: AdminFaq): boolean {
    return a.scope === b.scope && (a.targetId ?? null) === (b.targetId ?? null)
      && (a.scope !== 'GENERAL' || a.topic === b.topic);
  }

  // ------------------------------------------------------------------- editor

  startNew(): void {
    this.form.set({ ...emptyForm(), scope: this.scope() ?? 'GENERAL' });
    this.productResults.set([]);
  }

  startEdit(f: AdminFaq): void {
    this.form.set(this.formOf(f));
    this.productResults.set([]);
  }

  cancel(): void {
    this.form.set(null);
  }

  patch(field: keyof Form, value: string | number | null): void {
    const f = this.form();
    if (f) {
      this.form.set({ ...f, [field]: value });
    }
  }

  setFormScope(value: string): void {
    const f = this.form();
    if (f) {
      this.form.set({ ...f, scope: value as FaqScope, targetId: null, targetName: '' });
      this.productResults.set([]);
    }
  }

  searchProduct(value: string): void {
    this.pick$.next(value);
  }

  pickTarget(row: SeoRow): void {
    const f = this.form();
    if (f) {
      this.form.set({ ...f, targetId: row.id, targetName: row.name });
      this.productResults.set([]);
    }
  }

  pickCategory(value: string): void {
    const f = this.form();
    const row = this.categories().find((c) => String(c.id) === value);
    if (f) {
      this.form.set({ ...f, targetId: row?.id ?? null, targetName: row?.name ?? '' });
    }
  }

  submit(): void {
    const f = this.form();
    if (!f || !this.canSave()) return;
    this.save({
      scope: f.scope,
      targetId: f.scope === 'GENERAL' ? null : f.targetId,
      topic: f.scope === 'GENERAL' ? f.topic : null,
      questionAr: f.questionAr.trim(),
      answerAr: f.answerAr.trim(),
      questionEn: f.questionEn.trim() || null,
      answerEn: f.answerEn.trim() || null,
      status: f.status,
    }, 'seo.faq.toast.saved', f.id);
  }

  private save(body: FaqSaveRequest, toastKey: string, id: number | null = null): void {
    const editing = id ?? this.form()?.id ?? null;
    if (this.busy()) return;
    this.busy.set(true);
    // Keep the position when editing, so a fix to the wording does not move the question.
    const existing = editing === null ? null : this.items().find((i) => i.id === editing);
    const request = { ...body, position: existing ? existing.position : null };
    (editing === null ? this.api.createFaq(request) : this.api.updateFaq(editing, request)).subscribe({
      next: () => {
        this.busy.set(false);
        this.form.set(null);
        this.toast.success(this.translate.instant(toastKey));
        this.load();
      },
      error: () => this.busy.set(false),
    });
  }

  remove(f: AdminFaq): void {
    this.confirmDialog
      .confirm({
        title: this.translate.instant('seo.faq.deleteConfirm.title'),
        message: this.translate.instant('seo.faq.deleteConfirm.message'),
        confirmLabel: this.translate.instant('seo.faq.deleteConfirm.confirm'),
        cancelLabel: this.translate.instant('common.cancel'),
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.api.deleteFaq(f.id).subscribe({
          next: () => {
            this.toast.success(this.translate.instant('seo.faq.toast.deleted'));
            this.load();
          },
          error: () => {},
        });
      });
  }

  private formOf(f: AdminFaq): Form {
    return {
      id: f.id, scope: f.scope, targetId: f.targetId ?? null, targetName: f.targetName ?? '',
      topic: f.topic ?? 'GENERAL', questionAr: f.questionAr, answerAr: f.answerAr,
      questionEn: f.questionEn ?? '', answerEn: f.answerEn ?? '', status: f.status,
    };
  }
}
