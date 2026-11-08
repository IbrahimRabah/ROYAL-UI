import { ChangeDetectionStrategy, Component, DestroyRef, Input, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';

import { PublicPromotion } from '../../../core/models';
import { MarketingApiService } from '../../../core/services/api/marketing-api.service';

/**
 * The running sale banners: every discount that is on right now and has an image, biggest first. Draws nothing when
 * there are none. {@code max} limits how many are shown (the home page shows the best three).
 */
@Component({
  selector: 'app-sale-banners',
  templateUrl: './sale-banners.component.html',
  styleUrl: './sale-banners.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaleBannersComponent {
  private readonly api = inject(MarketingApiService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() max = 3;

  readonly promotions = signal<PublicPromotion[]>([]);

  constructor() {
    this.load();
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  /** The ones to draw: those with a banner picture, a few at most. */
  shown(): PublicPromotion[] {
    return this.promotions().filter((p) => p.bannerUrl || p.bannerMobileUrl).slice(0, this.max);
  }

  trackById(_: number, p: PublicPromotion): number {
    return p.id;
  }

  private load(): void {
    this.api.promotions().pipe(catchError(() => of([] as PublicPromotion[]))).subscribe((list) => this.promotions.set(list));
  }
}
