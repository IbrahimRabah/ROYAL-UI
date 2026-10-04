import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { CategoryNode } from '../../../../core/models';

interface CollectionCard {
  key: 'furniture' | 'woodAndIron' | 'ironwork';
  image: string | null;
  category: CategoryNode | undefined;
}

const CARD_KEYS: CollectionCard['key'][] = ['furniture', 'woodAndIron', 'ironwork'];

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
    return CARD_KEYS.map((key) => {
      const category = bySlug.get(key);
      return { key, image: category?.imageUrl ?? null, category };
    });
  }
}
