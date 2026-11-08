import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import {
  AdminAnnouncement,
  AdminPromotion,
  AnnouncementAnimation,
  AnnouncementSaveRequest,
  AnnouncementTheme,
} from '../../../../../core/models';
import { AdminMarketingApiService } from '../../../../../core/services/api/admin-marketing-api.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../../core/services/toast.service';

const ANIMATIONS: AnnouncementAnimation[] = ['MARQUEE', 'FADE', 'PULSE', 'STATIC'];
const THEMES: AnnouncementTheme[] = ['GOLD', 'DARK', 'RED', 'GREEN', 'LIGHT'];

interface Form {
  id: number | null;
  textAr: string;
  textEn: string;
  linkUrl: string;
  linkLabelAr: string;
  linkLabelEn: string;
  animation: AnnouncementAnimation;
  theme: AnnouncementTheme;
  startsAt: string;
  endsAt: string;
  active: boolean;
  dismissible: boolean;
  showCountdown: boolean;
  promotionId: number | null;
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = (): Form => ({
  id: null, textAr: '', textEn: '', linkUrl: '', linkLabelAr: '', linkLabelEn: '', animation: 'MARQUEE', theme: 'GOLD',
  startsAt: '', endsAt: '', active: true, dismissible: true, showCountdown: false, promotionId: null,
});

/**
 * The message strip above the storefront ("Hurry up, grab the discount!"). Write the text in Arabic and English, pick
 * how it moves and what colour it is, say when it shows, and optionally tie it to a discount: it then appears only
 * while that discount runs, writes its own text and can count down to its end. The preview is the real component.
 */
@Component({
  selector: 'app-announcements-page',
  templateUrl: './announcements-page.component.html',
  styleUrl: './announcements-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementsPageComponent {
  private readonly api = inject(AdminMarketingApiService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly translate = inject(TranslateService);

  readonly animations = ANIMATIONS;
  readonly themes = THEMES;

  readonly items = signal<AdminAnnouncement[]>([]);
  readonly promotions = signal<AdminPromotion[]>([]);
  readonly form = signal<Form | null>(null);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly busy = signal(false);

  /** The linked discount, when there is one: its name and end time feed the preview. */
  readonly linked = computed(() => {
    const id = this.form()?.promotionId;
    return id == null ? null : this.promotions().find((p) => p.id === id) ?? null;
  });

  /** What the preview shows: the typed text, or the sentence the discount would write. */
  readonly previewText = computed(() => {
    const f = this.form();
    if (!f) return '';
    if (f.textAr.trim()) return f.textAr.trim();
    const p = this.linked();
    return p ? this.translate.instant('marketing.announcements.autoText', { percent: p.percent, name: p.nameAr }) : '';
  });
  readonly previewEnds = computed(() => {
    const f = this.form();
    if (!f || !f.showCountdown) return null;
    const p = this.linked();
    if (p) return p.endsAt;
    return f.endsAt ? new Date(f.endsAt).toISOString() : null;
  });
  readonly canSave = computed(() => {
    const f = this.form();
    if (!f || this.busy()) return false;
    return f.textAr.trim().length > 0 || f.promotionId !== null;
  });

  constructor() {
    this.api.promotions(null, 0, 100).subscribe({ next: (p) => this.promotions.set(p.content.filter((x) => x.state !== 'ENDED')), error: () => {} });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.announcements().subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  // ------------------------------------------------------------------- editor

  startNew(): void {
    this.form.set(emptyForm());
  }

  edit(a: AdminAnnouncement): void {
    this.form.set({
      id: a.id, textAr: a.textAr ?? '', textEn: a.textEn ?? '', linkUrl: a.linkUrl ?? '', linkLabelAr: a.linkLabelAr ?? '',
      linkLabelEn: a.linkLabelEn ?? '', animation: a.animation, theme: a.theme, startsAt: toLocalInput(a.startsAt),
      endsAt: toLocalInput(a.endsAt), active: a.active, dismissible: a.dismissible, showCountdown: a.showCountdown,
      promotionId: a.promotionId ?? null,
    });
  }

  cancel(): void {
    this.form.set(null);
  }

  patch(field: keyof Form, value: string | boolean | number | null): void {
    const f = this.form();
    if (f) {
      this.form.set({ ...f, [field]: value });
    }
  }

  pickPromotion(value: string): void {
    this.patch('promotionId', value ? Number(value) : null);
  }

  save(): void {
    const f = this.form();
    if (!f || !this.canSave()) return;
    const body: AnnouncementSaveRequest = {
      textAr: f.textAr.trim() || null,
      textEn: f.textEn.trim() || null,
      linkUrl: f.linkUrl.trim() || null,
      linkLabelAr: f.linkLabelAr.trim() || null,
      linkLabelEn: f.linkLabelEn.trim() || null,
      animation: f.animation,
      theme: f.theme,
      startsAt: f.startsAt ? new Date(f.startsAt).toISOString() : null,
      endsAt: f.endsAt ? new Date(f.endsAt).toISOString() : null,
      active: f.active,
      dismissible: f.dismissible,
      showCountdown: f.showCountdown,
      promotionId: f.promotionId,
    };
    this.busy.set(true);
    (f.id === null ? this.api.createAnnouncement(body) : this.api.updateAnnouncement(f.id, body)).subscribe({
      next: () => {
        this.busy.set(false);
        this.form.set(null);
        this.toast.success(this.translate.instant('marketing.announcements.toast.saved'));
        this.load();
      },
      error: () => this.busy.set(false),
    });
  }

  // -------------------------------------------------------------------- list

  toggle(a: AdminAnnouncement): void {
    this.run(this.api.setAnnouncementActive(a.id, !a.active), a.active ? 'marketing.announcements.toast.off' : 'marketing.announcements.toast.on');
  }

  move(a: AdminAnnouncement, step: -1 | 1): void {
    const ids = this.items().map((i) => i.id);
    const index = ids.indexOf(a.id);
    const other = index + step;
    if (other < 0 || other >= ids.length || this.busy()) return;
    [ids[index], ids[other]] = [ids[other], ids[index]];
    this.busy.set(true);
    this.api.reorderAnnouncements(ids).subscribe({
      next: () => {
        this.busy.set(false);
        this.load();
      },
      error: () => this.busy.set(false),
    });
  }

  remove(a: AdminAnnouncement): void {
    this.confirmDialog
      .confirm({
        title: this.translate.instant('marketing.announcements.deleteConfirm.title'),
        message: this.translate.instant('marketing.announcements.deleteConfirm.message'),
        confirmLabel: this.translate.instant('marketing.announcements.deleteConfirm.confirm'),
        cancelLabel: this.translate.instant('common.cancel'),
      })
      .subscribe((yes) => {
        if (!yes) return;
        this.api.deleteAnnouncement(a.id).subscribe({
          next: () => {
            this.toast.success(this.translate.instant('marketing.announcements.toast.deleted'));
            this.load();
          },
          error: () => {},
        });
      });
  }

  displayText(a: AdminAnnouncement): string {
    return a.textAr || this.translate.instant('marketing.announcements.fromDiscount', { name: a.promotionName ?? '' });
  }

  private run(call: { subscribe: (o: { next: () => void; error: () => void }) => unknown }, toastKey: string): void {
    if (this.busy()) return;
    this.busy.set(true);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success(this.translate.instant(toastKey));
        this.load();
      },
      error: () => this.busy.set(false),
    });
  }
}
