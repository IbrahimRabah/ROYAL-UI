import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';

/**
 * Counts down to a moment given by the server, to the second. The server sends the end time, never «seconds left»,
 * so a slow page load or a sleeping tab cannot make the clock lie. Nothing ticks during server-side rendering, and a
 * visitor who asks for reduced motion still gets the numbers (a countdown is information, not decoration).
 */
@Component({
  selector: 'app-vl-countdown',
  templateUrl: './vl-countdown.component.html',
  styleUrl: './vl-countdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VlCountdownComponent implements OnChanges, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly zone = inject(NgZone);

  @Input() endsAt: string | null | undefined = null;
  /** Fires once, when the time runs out. */
  @Output() readonly ended = new EventEmitter<void>();

  private readonly now = signal(Date.now());
  private readonly end = signal<number | null>(null);
  private timer: ReturnType<typeof setInterval> | null = null;
  private announced = false;

  readonly parts = computed(() => {
    const end = this.end();
    if (end === null) {
      return null;
    }
    const left = Math.max(0, end - this.now());
    const total = Math.floor(left / 1000);
    return {
      done: left === 0,
      days: Math.floor(total / 86400),
      hours: Math.floor((total % 86400) / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60,
    };
  });

  ngOnChanges(): void {
    const parsed = this.endsAt ? Date.parse(this.endsAt) : NaN;
    this.end.set(Number.isNaN(parsed) ? null : parsed);
    this.announced = false;
    this.now.set(Date.now());
    this.restart();
  }

  ngOnDestroy(): void {
    this.stop();
  }

  pad(n: number): string {
    return n < 10 ? '0' + n : String(n);
  }

  private restart(): void {
    this.stop();
    if (!isPlatformBrowser(this.platformId) || this.end() === null) {
      return;
    }
    // Outside Angular's zone, so this repeating timer never keeps the app from becoming stable (which would leave
    // the server-rendered markup in the page, duplicated). It steps back in to change the clock.
    this.zone.runOutsideAngular(() => {
      this.timer = setInterval(() => {
        this.zone.run(() => {
          this.now.set(Date.now());
          if (this.parts()?.done && !this.announced) {
            this.announced = true;
            this.ended.emit();
            this.stop();
          }
        });
      }, 1000);
    });
  }

  private stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
