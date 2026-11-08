import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import {
  AdminPromotion,
  PromotionImpact,
  PromotionSaveRequest,
  PromotionScope,
  PromotionState,
  SeoRow,
} from '../../../../../core/models';
import { AdminMarketingApiService, BannerKind } from '../../../../../core/services/api/admin-marketing-api.service';
import { AdminSeoApiService } from '../../../../../core/services/api/admin-seo-api.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { resizeForUpload } from '../../../../../shared/utils/image-upload.util';

const SCOPES: PromotionScope[] = ['ALL', 'CATEGORY', 'PRODUCT'];
const STATES: PromotionState[] = ['RUNNING', 'SCHEDULED', 'DRAFT', 'PAUSED', 'ENDED'];
/** Above this the server wants the box ticked: a typing slip (200 instead of 20) is the usual cause. */
const HIGH_DISCOUNT = 70;

interface Form {
  id: number | null;
  nameAr: string;
  nameEn: string;
  scope: PromotionScope;
  targetId: number | null;
  targetName: string;
  percent: string;
  startsAt: string;
  endsAt: string;
  headlineAr: string;
  headlineEn: string;
  confirmHigh: boolean;
  bannerUrl: string | null;
  bannerMobileUrl: string | null;
}

/** `2026-11-10T14:30` in the browser's own time zone: what a datetime-local box wants. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function inHours(hours: number): string {
  return toLocalInput(new Date(Date.now() + hours * 3_600_000).toISOString());
}

const emptyForm = (): Form => ({
  id: null, nameAr: '', nameEn: '', scope: 'ALL', targetId: null, targetName: '', percent: '10',
  startsAt: inHours(0), endsAt: inHours(24 * 7), headlineAr: '', headlineEn: '', confirmHigh: false,
  bannerUrl: null, bannerMobileUrl: null,
});

/**
 * Sale discounts. A percentage off everything, one category (with its subcategories) or one product, between two
 * moments. Saving makes a draft; «Check impact» shows the affected products, example prices, overlaps and anything
 * that would sell below cost; activating is refused while a variant would. From its start time the price changes by
 * itself and the banner appears; nothing needs switching off when it ends.
 */
@Component({
  selector: 'app-discounts-page',
  templateUrl: './discounts-page.component.html',
  styleUrl: './discounts-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscountsPageComponent {
  private readonly api = inject(AdminMarketingApiService);
  private readonly seoApi = inject(AdminSeoApiService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly translate = inject(TranslateService);

  readonly scopes = SCOPES;
  readonly states = STATES;
  readonly highDiscount = HIGH_DISCOUNT;

  readonly stateFilter = signal<PromotionState | null>(null);
  readonly items = signal<AdminPromotion[]>([]);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly busy = signal(false);

  readonly form = signal<Form | null>(null);
  readonly impact = signal<PromotionImpact | null>(null);
  readonly categories = signal<SeoRow[]>([]);
  readonly productResults = signal<SeoRow[]>([]);

  readonly percentNumber = computed(() => Number(this.form()?.percent ?? 0));
  readonly needsConfirm = computed(() => this.percentNumber() > HIGH_DISCOUNT);
  readonly canSave = computed(() => {
    const f = this.form();
    if (!f || this.busy()) return false;
    const pct = this.percentNumber();
    const targetOk = f.scope === 'ALL' || f.targetId !== null;
    return f.nameAr.trim().length > 0 && pct > 0 && pct <= 95 && targetOk && !!f.startsAt && !!f.endsAt
      && new Date(f.endsAt).getTime() > new Date(f.startsAt).getTime() && (!this.needsConfirm() || f.confirmHigh);
  });

  private readonly pick$ = new Subject<string>();

  constructor() {
    this.pick$.pipe(debounceTime(300), distinctUntilChanged()).subscribe((q) => {
      if (q.trim().length < 2) {
        this.productResults.set([]);
        return;
      }
      this.seoApi.products(q, 'ALL', null, 0, 8).subscribe({ next: (p) => this.productResults.set(p.content), error: () => {} });
    });
    this.seoApi.categories(null, 'ALL', 0, 100).subscribe({ next: (c) => this.categories.set(c.content), error: () => {} });
    this.load();
  }

  // --------------------------------------------------------------------- list

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.promotions(this.stateFilter(), 0).subscribe({
      next: (page) => {
        this.items.set(page.content);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  setState(value: string): void {
    this.stateFilter.set((value || null) as PromotionState | null);
    this.load();
  }

  tone(state: PromotionState): string {
    return state === 'RUNNING' ? 'ok' : state === 'SCHEDULED' ? 'warn' : state === 'ENDED' ? 'stop' : '';
  }

  // ------------------------------------------------------------------- editor

  startNew(): void {
    this.form.set(emptyForm());
    this.impact.set(null);
    this.productResults.set([]);
  }

  edit(p: AdminPromotion): void {
    this.form.set(this.formOf(p));
    this.impact.set(null);
    this.productResults.set([]);
  }

  cancel(): void {
    this.form.set(null);
    this.impact.set(null);
  }

  patch(field: keyof Form, value: string | number | boolean | null): void {
    const f = this.form();
    if (f) {
      this.form.set({ ...f, [field]: value });
    }
  }

  setScope(value: string): void {
    const f = this.form();
    if (f) {
      this.form.set({ ...f, scope: value as PromotionScope, targetId: null, targetName: '' });
      this.productResults.set([]);
    }
  }

  searchProduct(value: string): void {
    this.pick$.next(value);
  }

  pickProduct(row: SeoRow): void {
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

  save(): void {
    const f = this.form();
    if (!f || !this.canSave()) return;
    const body: PromotionSaveRequest = {
      nameAr: f.nameAr.trim(),
      nameEn: f.nameEn.trim() || null,
      scope: f.scope,
      targetId: f.scope === 'ALL' ? null : f.targetId,
      percent: Number(f.percent),
      startsAt: new Date(f.startsAt).toISOString(),
      endsAt: new Date(f.endsAt).toISOString(),
      headlineAr: f.headlineAr.trim() || null,
      headlineEn: f.headlineEn.trim() || null,
      confirmHighDiscount: f.confirmHigh,
    };
    this.busy.set(true);
    (f.id === null ? this.api.createPromotion(body) : this.api.updatePromotion(f.id, body)).subscribe({
      next: (saved) => {
        this.busy.set(false);
        // Stay on the saved discount: its banner can be uploaded now that it has an id.
        this.form.set(this.formOf(saved));
        this.impact.set(null);
        this.toast.success(this.translate.instant('marketing.discounts.toast.saved'));
        this.load();
      },
      error: () => this.busy.set(false),
    });
  }

  // ------------------------------------------------------------------- impact

  checkImpact(id: number): void {
    this.api.impact(id).subscribe({ next: (i) => this.impact.set(i), error: () => {} });
  }

  // ------------------------------------------------------------------ actions

  activate(p: AdminPromotion): void {
    this.run(this.api.activate(p.id), 'marketing.discounts.toast.activated');
  }

  pause(p: AdminPromotion): void {
    this.run(this.api.pause(p.id), 'marketing.discounts.toast.paused');
  }

  end(p: AdminPromotion): void {
    this.ask('end', () => this.run(this.api.end(p.id), 'marketing.discounts.toast.ended'));
  }

  remove(p: AdminPromotion): void {
    this.ask('delete', () => {
      this.busy.set(true);
      this.api.deletePromotion(p.id).subscribe({
        next: () => {
          this.busy.set(false);
          if (this.form()?.id === p.id) this.cancel();
          this.toast.success(this.translate.instant('marketing.discounts.toast.deleted'));
          this.load();
        },
        error: () => this.busy.set(false),
      });
    });
  }

  private ask(kind: 'end' | 'delete', then: () => void): void {
    this.confirmDialog
      .confirm({
        title: this.translate.instant(`marketing.discounts.confirm.${kind}.title`),
        message: this.translate.instant(`marketing.discounts.confirm.${kind}.message`),
        confirmLabel: this.translate.instant(`marketing.discounts.confirm.${kind}.confirm`),
        cancelLabel: this.translate.instant('common.cancel'),
      })
      .subscribe((yes) => {
        if (yes) then();
      });
  }

  private run(call: { subscribe: (o: { next: (p: AdminPromotion) => void; error: () => void }) => unknown }, toastKey: string): void {
    if (this.busy()) return;
    this.busy.set(true);
    call.subscribe({
      next: (saved) => {
        this.busy.set(false);
        this.toast.success(this.translate.instant(toastKey));
        if (this.form()?.id === saved.id) this.form.set(this.formOf(saved));
        this.load();
      },
      error: () => this.busy.set(false),
    });
  }

  // ------------------------------------------------------------------- banner

  async chooseBanner(event: Event, kind: BannerKind): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const f = this.form();
    if (!file || !f || f.id === null || this.busy()) return;
    this.busy.set(true);
    try {
      // Shrunk in the browser first, like the product images: the original stays with whoever made it.
      const ready = await resizeForUpload(file);
      this.api.uploadBanner(f.id, kind, ready).subscribe({
        next: (saved) => {
          this.busy.set(false);
          this.form.set(this.formOf(saved));
          this.toast.success(this.translate.instant('marketing.discounts.toast.banner'));
          this.load();
        },
        error: () => this.busy.set(false),
      });
    } catch {
      this.busy.set(false);
      this.toast.error(this.translate.instant('marketing.discounts.bannerUnreadable'));
    }
  }

  removeBanner(kind: BannerKind): void {
    const f = this.form();
    if (!f || f.id === null || this.busy()) return;
    this.busy.set(true);
    this.api.removeBanner(f.id, kind).subscribe({
      next: (saved) => {
        this.busy.set(false);
        this.form.set(this.formOf(saved));
        this.load();
      },
      error: () => this.busy.set(false),
    });
  }

  private formOf(p: AdminPromotion): Form {
    return {
      id: p.id, nameAr: p.nameAr, nameEn: p.nameEn ?? '', scope: p.scope, targetId: p.targetId ?? null,
      targetName: p.targetName ?? '', percent: String(p.percent), startsAt: toLocalInput(p.startsAt),
      endsAt: toLocalInput(p.endsAt), headlineAr: p.headlineAr ?? '', headlineEn: p.headlineEn ?? '',
      confirmHigh: p.percent > HIGH_DISCOUNT, bannerUrl: p.bannerUrl ?? null, bannerMobileUrl: p.bannerMobileUrl ?? null,
    };
  }
}
