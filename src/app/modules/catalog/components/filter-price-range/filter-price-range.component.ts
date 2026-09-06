import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { APP_CONFIG } from '../../../../core/constants/app-config';

const PRICE_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  style: 'currency',
  currency: 'EGP',
  currencyDisplay: 'code',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

@Component({
  selector: 'app-filter-price-range',
  templateUrl: './filter-price-range.component.html',
  styleUrl: './filter-price-range.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterPriceRangeComponent implements OnChanges {
  readonly floor = APP_CONFIG.priceFilter.min;
  readonly ceil = APP_CONFIG.priceFilter.max;

  @Input() minPrice: number | null = null;
  @Input() maxPrice: number | null = null;
  @Output() readonly rangeChange = new EventEmitter<{ min: number; max: number }>();

  range: [number, number] = [this.floor, this.ceil];

  ngOnChanges(changes: SimpleChanges): void {
    if ('minPrice' in changes || 'maxPrice' in changes) {
      this.range = [this.minPrice ?? this.floor, this.maxPrice ?? this.ceil];
    }
  }

  commit(): void {
    this.rangeChange.emit({ min: this.range[0], max: this.range[1] });
  }

  format(value: number): string {
    return PRICE_FORMATTER.format(value);
  }
}
