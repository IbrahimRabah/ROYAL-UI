import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-stock-numbers-card',
  templateUrl: './stock-numbers-card.component.html',
  styleUrl: './stock-numbers-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockNumbersCardComponent {
  // Stock is deducted from onHand at SHIPPED, not at order time — a warehouse holding 10
  // units with 3 reserved shows 10/3/7, all three simultaneously correct. Never show only
  // one of these; operators confuse them constantly without all three labelled.
  @Input({ required: true }) qtyOnHand!: number;
  @Input({ required: true }) qtyReserved!: number;
  @Input({ required: true }) qtyAvailable!: number;
  @Input({ required: true }) minStockLevel!: number;

  get availableTone(): 'stop' | 'warn' | null {
    if (this.qtyAvailable <= 0) {
      return 'stop';
    }
    if (this.qtyAvailable <= this.minStockLevel) {
      return 'warn';
    }
    return null;
  }
}
