import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { StatusTone } from '../../../core/constants/order-status.constants';

@Component({
  selector: 'app-vl-status-badge',
  templateUrl: './vl-status-badge.component.html',
  styleUrl: './vl-status-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VlStatusBadgeComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) tone!: StatusTone;
  @Input() outline = false;
}
