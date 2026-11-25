import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { ProductSpecification } from '../../../../core/models';

/** The description and the specifications, one after the other: no tabs, so nothing is hidden behind a tap. */
@Component({
  selector: 'app-product-tabs',
  templateUrl: './product-tabs.component.html',
  styleUrl: './product-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductTabsComponent {
  @Input() description = '';
  @Input() specifications: ProductSpecification[] = [];
}
