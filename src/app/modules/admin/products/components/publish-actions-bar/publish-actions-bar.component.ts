import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { ProductAdminResponse } from '../../../../../core/models';
import { ProductStatus } from '../../../../../core/enums/product-status';

@Component({
  selector: 'app-publish-actions-bar',
  templateUrl: './publish-actions-bar.component.html',
  styleUrl: './publish-actions-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublishActionsBarComponent {
  @Input() product: ProductAdminResponse | null = null;
  @Input() isNew = false;
  @Input() saving = false;
  @Input() busy = false;
  /** Ready-made products need a variant to publish; made-to-order and custom work don't. */
  @Input() readyMade = true;

  @Output() readonly save = new EventEmitter<void>();
  @Output() readonly publish = new EventEmitter<void>();
  @Output() readonly unpublish = new EventEmitter<void>();
  @Output() readonly archive = new EventEmitter<void>();

  readonly ProductStatus = ProductStatus;
}
