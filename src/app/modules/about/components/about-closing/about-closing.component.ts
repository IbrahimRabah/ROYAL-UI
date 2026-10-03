import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { CategoryIds } from '../../models/category-ids';

interface ShopLink {
  key: 'shopBedrooms' | 'shopDining' | 'shopTables';
  icon: string;
  categoryKey: keyof CategoryIds;
}

const LINKS: ShopLink[] = [
  { key: 'shopBedrooms', icon: 'pi-moon', categoryKey: 'bedrooms' },
  { key: 'shopDining', icon: 'pi-wallet', categoryKey: 'dining' },
  { key: 'shopTables', icon: 'pi-sparkles', categoryKey: 'tables' },
];

@Component({
  selector: 'app-about-closing',
  templateUrl: './about-closing.component.html',
  styleUrl: './about-closing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutClosingComponent {
  @Input() categoryIds: CategoryIds = { bedrooms: null, dining: null, tables: null };

  readonly links = LINKS;

  queryParamsFor(link: ShopLink): { categoryId: number } | null {
    const id = this.categoryIds[link.categoryKey];
    return id == null ? null : { categoryId: id };
  }
}
