import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';

import { PublicAnnouncement } from '../../../core/models';
import { MarketingApiService } from '../../../core/services/api/marketing-api.service';

const STORAGE_KEY = 'royal.announcements.dismissed';
/** How long each message stays when there are several. */
const ROTATE_MS = 8000;

/**
 * The message strip above the header ("Hurry up, grab the discount!").
 *
 * <p>Messages come from the API (only the ones switched on and inside their dates, and, for a message tied to a
 * discount, only while that discount runs). With several, they take turns. A visitor can close a message; it
 * stays closed until staff edit it (the message's version changes) and never throws if storage is blocked.
 * Rotation pauses while the pointer or focus is on the bar, and does not run for a visitor who asks for reduced
 * motion.
 */
@Component({
  selector: 'app-announcement-bar',
  templateUrl: './announcement-bar.component.html',
  styleUrl: './announcement-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementBarComponent implements OnDestroy {
  private readonly api = inject(MarketingApiService);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private readonly all = signal<PublicAnnouncement[]>([]);
  private readonly dismissed = signal<Record<string, number>>({});
  private readonly index = signal(0);
  private paused = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  /** What is left to show: not closed by this visitor (at this version of the message). */
  readonly visible = computed(() => this.all().filter((a) => this.dismissed()[String(a.id)] !== a.version));
  readonly current = computed<PublicAnnouncement | null>(() => {
    const list = this.visible();
    return list.length === 0 ? null : list[this.index() % list.length];
  });
  readonly count = computed(() => this.visible().length);
  readonly dots = computed(() => Array.from({ length: this.count() }, (_, i) => i));
  readonly activeDot = computed(() => (this.count() === 0 ? 0 : this.index() % this.count()));

  constructor() {
    this.dismissed.set(this.readDismissed());
    this.load();
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.startRotation();
  }

  ngOnDestroy(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
    }
  }

  dismiss(item: PublicAnnouncement): void {
    const next = { ...this.dismissed(), [String(item.id)]: item.version };
    this.dismissed.set(next);
    this.index.set(0);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked: the message is closed for this visit only.
    }
  }

  trackById(_: number, item: PublicAnnouncement): number {
    return item.id;
  }

  hold(on: boolean): void {
    this.paused = on;
  }

  private load(): void {
    this.api.announcements().pipe(catchError(() => of([] as PublicAnnouncement[]))).subscribe((list) => {
      this.all.set(list);
      this.index.set(0);
    });
  }

  private startRotation(): void {
    if (!isPlatformBrowser(this.platformId) || this.prefersReducedMotion()) {
      return;
    }
    this.timer = setInterval(() => {
      if (!this.paused && this.count() > 1) {
        this.index.update((i) => (i + 1) % this.count());
      }
    }, ROTATE_MS);
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private readDismissed(): Record<string, number> {
    if (!isPlatformBrowser(this.platformId)) {
      return {};
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Record<string, number>) : {};
    } catch {
      return {};
    }
  }
}

