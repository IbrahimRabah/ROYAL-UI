import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { DashboardCodPosition, money } from '../../../../../core/models';

const NUMBER_FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  maximumFractionDigits: 0,
});

const STALE_AFTER_DAYS = 7;

@Component({
  selector: 'app-outstanding-cash-card',
  templateUrl: './outstanding-cash-card.component.html',
  styleUrl: './outstanding-cash-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OutstandingCashCardComponent {
  @Input({ required: true }) data!: DashboardCodPosition;

  get formattedAmount(): string {
    return NUMBER_FORMATTER.format(money(this.data.amount));
  }

  get isStale(): boolean {
    return this.data.oldestDays > STALE_AFTER_DAYS;
  }
}
