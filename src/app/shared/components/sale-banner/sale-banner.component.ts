import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { PublicPromotion } from '../../../core/models';

/**
 * One sale banner: the image staff uploaded (a separate one for small screens when they gave it), the discount's
 * headline and percentage, and a countdown to its end. The whole banner is one link to where the discount applies.
 * A discount with no image still gets a banner: a coloured card with the same text.
 */
@Component({
  selector: 'app-sale-banner',
  templateUrl: './sale-banner.component.html',
  styleUrl: './sale-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaleBannerComponent {
  @Input({ required: true }) promotion!: PublicPromotion;

  get route(): { path: string; query: Record<string, string> } {
    const raw = this.promotion.landingPath || '/products';
    const cut = raw.indexOf('?');
    const path = cut < 0 ? raw : raw.substring(0, cut);
    const query: Record<string, string> = {};
    if (cut >= 0) {
      new URLSearchParams(raw.substring(cut + 1)).forEach((value, key) => (query[key] = value));
    }
    return { path, query };
  }

  get title(): string {
    return this.promotion.headline || this.promotion.name;
  }

  /** The desktop image, or the mobile one when that is all there is. */
  get mainImage(): string | null {
    return this.promotion.bannerUrl || this.promotion.bannerMobileUrl || null;
  }
}
