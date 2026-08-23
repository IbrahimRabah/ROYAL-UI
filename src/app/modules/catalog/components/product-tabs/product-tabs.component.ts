import { ChangeDetectionStrategy, Component, Input, signal } from '@angular/core';

import { ProductSpecification } from '../../../../core/models';

type ProductTabKey = 'description' | 'specifications';

@Component({
  selector: 'app-product-tabs',
  templateUrl: './product-tabs.component.html',
  styleUrl: './product-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductTabsComponent {
  @Input() description = '';
  @Input() specifications: ProductSpecification[] = [];

  readonly activeTab = signal<ProductTabKey>('description');

  // A product with no specifications (yet) falls back to the plain description heading
  // instead of an empty, dead second tab — matches the pre-specs layout exactly.
  get showTabs(): boolean {
    return this.specifications.length > 0;
  }

  selectTab(tab: ProductTabKey): void {
    this.activeTab.set(tab);
  }
}
