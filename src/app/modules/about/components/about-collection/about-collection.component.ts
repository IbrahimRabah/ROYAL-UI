import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { CategoryNode } from '../../../../core/models';

interface CollectionCard {
  key: 'furniture' | 'woodAndIron' | 'ironwork';
  image: string;
  category: CategoryNode | undefined;
}

const CARD_KEYS: CollectionCard['key'][] = ['furniture', 'woodAndIron', 'ironwork'];

const CARD_IMAGES: Record<CollectionCard['key'], string> = {
  furniture: 'assets/images/about/furniture.png',
  woodAndIron: 'assets/images/about/wood-and-iron.png',
  ironwork: 'assets/images/about/iron.png',
};

// Backend category slugs differ from the card keys (kebab-case).
const CARD_SLUGS: Record<CollectionCard['key'], string> = {
  furniture: 'furniture',
  woodAndIron: 'wood-and-iron',
  ironwork: 'ironwork',
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
    return CARD_KEYS.map((key) => {
      const category = bySlug.get(CARD_SLUGS[key]);
      return { key, image: CARD_IMAGES[key], category };
    });
  }
}
