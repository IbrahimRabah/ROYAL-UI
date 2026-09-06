import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { ProductSummaryResponse } from '../../../../core/models';

@Component({
  selector: 'app-new-arrivals-section',
  templateUrl: './new-arrivals-section.component.html',
  styleUrl: './new-arrivals-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewArrivalsSectionComponent {
  @Input() products: ProductSummaryResponse[] = [];
  @Input() loading = false;

  readonly skeletonPlaceholders = Array.from({ length: 9 });

  get showSection(): boolean {
    return this.loading || this.products.length > 0;
  }
}
