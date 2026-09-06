import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { Money, money } from '../../../../core/models';

const PRICE_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  style: 'currency',
  currency: 'EGP',
  currencyDisplay: 'code',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

@Component({
  selector: 'app-product-price-block',
  templateUrl: './product-price-block.component.html',
  styleUrl: './product-price-block.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductPriceBlockComponent {
  @Input({ required: true }) price!: Money;

  get formatted(): string {
    return PRICE_FORMATTER.format(money(this.price));
  }
}
