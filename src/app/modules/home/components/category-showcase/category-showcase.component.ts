import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { CategoryNode } from '../../../../core/models';

const SHOWCASE_IMAGES: Record<string, string> = {
  watches: 'assets/images/categories/watch.png',
  wallets: 'assets/images/categories/wallet.png',
  perfumes: 'assets/images/categories/perfume.png',
};

@Component({
  selector: 'app-category-showcase',
  templateUrl: './category-showcase.component.html',
  styleUrl: './category-showcase.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryShowcaseComponent {
  @Input() categories: CategoryNode[] = [];

  get items(): CategoryNode[] {
    return this.categories.filter((category) => SHOWCASE_IMAGES[category.slug]);
  }

  imageFor(category: CategoryNode): string {
    return SHOWCASE_IMAGES[category.slug];
  }
}
