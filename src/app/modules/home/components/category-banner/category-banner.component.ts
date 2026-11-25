import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Params } from '@angular/router';

/** One small tile under a department banner (a category, a portfolio category...). */
export interface DepartmentTile {
  label: string;
  imageUrl?: string | null;
  link: string;
  queryParams?: Params;
}

/** A department on the home page and on its own page: one large banner, then its sections as small tiles. */
@Component({
  selector: 'app-category-banner',
  templateUrl: './category-banner.component.html',
  styleUrl: './category-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryBannerComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() cta = '';
  @Input({ required: true }) bannerUrl = '';
  @Input({ required: true }) link = '/';
  @Input() tiles: DepartmentTile[] = [];
  /** The page's own H1 is the banner title when true (a department page); false on the home page (an H2). */
  @Input() heading: 'h1' | 'h2' = 'h2';
}
