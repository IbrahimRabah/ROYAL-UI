import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Params } from '@angular/router';

import { ProductSummaryResponse } from '../../../../core/models';

@Component({
  selector: 'app-featured-section',
  templateUrl: './featured-section.component.html',
  styleUrl: './featured-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeaturedSectionComponent {
  @Input() products: ProductSummaryResponse[] = [];
  @Input() loading = false;
  /** Translation keys and link of the heading; the defaults make it the "featured" strip. */
  @Input() titleKey = 'home.featured.title';
  @Input() viewAllKey = 'home.featured.viewAll';
  @Input() viewAllParams: Params = { featured: true };

  readonly skeletonPlaceholders = Array.from({ length: 9 });

  get showSection(): boolean {
    return this.loading || this.products.length > 0;
  }
}
