import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-failed-orders-warning',
  templateUrl: './failed-orders-warning.component.html',
  styleUrl: './failed-orders-warning.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FailedOrdersWarningComponent {
  @Input({ required: true }) count!: number;
}
