import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { APP_CONFIG } from '../../../core/constants/app-config';
import { isReadyMade } from '../../../core/enums/fulfillment-type';
import { ProductSummaryResponse } from '../../../core/models';

@Component({
  selector: 'app-vl-product-card',
  templateUrl: './vl-product-card.component.html',
  styleUrl: './vl-product-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VlProductCardComponent {
  @Input({ required: true }) product!: ProductSummaryResponse;
  /** The heart is on by default; a surface that supplies its own remove control can turn it off. */
  @Input() wishlistEnabled = true;

  /** One switch for the whole storefront: APP_CONFIG.features.showBrand. */
  readonly showBrand = APP_CONFIG.features.showBrand;

  get readyMade(): boolean {
    return isReadyMade(this.product);
  }
}
