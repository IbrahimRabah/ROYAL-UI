import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { CategoryNode } from '../../../../core/models';

interface CollectionCard {
  key: 'furniture' | 'woodAndIron' | 'ironwork';
  image: string;
  category: CategoryNode | undefined;
}

const CARD_IMAGES: Record<CollectionCard['key'], string> = {
  furniture: 'assets/images/about/category3.png',
  woodAndIron: 'assets/images/about/category2.png',
  ironwork: 'assets/images/about/category1.png',
};

@Component({
  selector: 'app-about-collection',
  templateUrl: './about-collection.component.html',
  styleUrl: './about-collection.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutCollectionComponent {
  private _categories: CategoryNode[] = [];

  cards: CollectionCard[] = this.buildCards();

  @Input()
  set categories(value: CategoryNode[]) {
    this._categories = value;
    this.cards = this.buildCards();
  }

  get categories(): CategoryNode[] {
    return this._categories;
  }

  queryParamsFor(card: CollectionCard): { categoryId: number } | null {
    return card.category ? { categoryId: card.category.id } : null;
  }

  private buildCards(): CollectionCard[] {
    const bySlug = new Map(this._categories.map((category) => [category.slug, category]));
    return (Object.keys(CARD_IMAGES) as CollectionCard['key'][]).map((key) => ({
      key,
      image: CARD_IMAGES[key],
      category: bySlug.get(key),
    }));
  }
}
