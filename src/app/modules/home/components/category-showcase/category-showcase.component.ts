import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { CategoryNode } from '../../../../core/models';

// Eight category tiles plus an "All categories" tile fill a 3 × 3 desktop grid exactly; six fill 3 × 2.
const MAX_CATEGORY_TILES = 8;

export interface ShowcaseTile {
  id: number | null;
  name: string;
  imageUrl: string | null | undefined;
  description: string | null | undefined;
  isAll: boolean;
  /** The image URL was set but the file failed to load. */
  broken: boolean;
}

/**
 * "Shop by category": the parent categories from the storefront tree (product scope only — the server
 * already keeps portfolio categories out of it, so nothing is filtered here). A tile with no usable
 * image is drawn as a deliberate typographic tile, never as a missing-file placeholder.
 */
@Component({
  selector: 'app-category-showcase',
  templateUrl: './category-showcase.component.html',
  styleUrl: './category-showcase.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryShowcaseComponent {
  private _categories: CategoryNode[] = [];

  tiles: ShowcaseTile[] = [];

  @Input()
  set categories(value: CategoryNode[]) {
    this._categories = value ?? [];
    this.build();
  }

  get categories(): CategoryNode[] {
    return this._categories;
  }

  hasImage(tile: ShowcaseTile): boolean {
    return !tile.isAll && !!tile.imageUrl && !tile.broken;
  }

  /** First letter of the name, used as the quiet watermark on a tile without an image (works in Arabic too). */
  initial(tile: ShowcaseTile): string {
    return Array.from(tile.name.trim())[0] ?? '';
  }

  markBroken(tile: ShowcaseTile): void {
    tile.broken = true;
  }

  trackByIndex(index: number): number {
    return index;
  }

  private build(): void {
    const shown = this._categories.slice(0, MAX_CATEGORY_TILES);
    const tiles: ShowcaseTile[] = shown.map((category) => ({
      id: category.id,
      name: category.name,
      imageUrl: category.imageUrl,
      description: category.description,
      isAll: false,
      broken: false,
    }));
    if (this._categories.length > MAX_CATEGORY_TILES) {
      tiles.push({ id: null, name: '', imageUrl: null, description: null, isAll: true, broken: false });
    }
    this.tiles = tiles;
  }
}
