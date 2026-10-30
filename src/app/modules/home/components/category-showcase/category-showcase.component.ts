import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { CategoryNode } from '../../../../core/models';

// [column, columnSpan, row, rowSpan] on a fixed 4 × 3 grid. Every layout covers all 12 cells.
type Slot = [number, number, number, number];

const MAX_CATEGORY_TILES = 8;
const MIN_BENTO_TILES = 5;

// Keyed by tile count (the "All categories" tile counts as a tile). Index 0 is the resting hero.
const LAYOUTS: Record<number, Slot[]> = {
  5: [[1, 2, 1, 2], [3, 2, 1, 1], [3, 1, 2, 1], [4, 1, 2, 1], [1, 4, 3, 1]],
  6: [[1, 2, 1, 2], [3, 1, 1, 1], [4, 1, 1, 1], [3, 2, 2, 1], [1, 2, 3, 1], [3, 2, 3, 1]],
  7: [[1, 2, 1, 2], [3, 1, 1, 1], [4, 1, 1, 1], [3, 1, 2, 1], [4, 1, 2, 1], [1, 2, 3, 1], [3, 2, 3, 1]],
  8: [[1, 2, 1, 2], [3, 1, 1, 1], [4, 1, 1, 1], [3, 1, 2, 1], [4, 1, 2, 1], [1, 1, 3, 1], [2, 1, 3, 1], [3, 2, 3, 1]],
  9: [[1, 2, 1, 2], [3, 1, 1, 1], [4, 1, 1, 1], [3, 1, 2, 1], [4, 1, 2, 1], [1, 1, 3, 1], [2, 1, 3, 1], [3, 1, 3, 1], [4, 1, 3, 1]],
};

const COLUMNS = 4;
const ROWS = 3;

export interface ShowcaseTile {
  id: number | null;
  name: string;
  imageUrl: string | null | undefined;
  description: string | null | undefined;
  isAll: boolean;
}

@Component({
  selector: 'app-category-showcase',
  templateUrl: './category-showcase.component.html',
  styleUrl: './category-showcase.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryShowcaseComponent {
  private _categories: CategoryNode[] = [];

  tiles: ShowcaseTile[] = [];
  bento = false;
  activeIndex = 0;
  columns = '';
  rows = '';

  @Input()
  set categories(value: CategoryNode[]) {
    this._categories = value ?? [];
    this.activeIndex = 0;
    this.build();
  }

  get categories(): CategoryNode[] {
    return this._categories;
  }

  activate(index: number): void {
    if (!this.bento || index === this.activeIndex) return;
    this.activeIndex = index;
    this.updateTracks();
  }

  reset(): void {
    this.activate(0);
  }

  /** CSS custom property values for one tile's grid placement (bento only). */
  slotStyle(index: number): Record<string, string> {
    if (!this.bento) return {};
    const [col, colSpan, row, rowSpan] = this.slots[index];
    return { '--col': `${col} / span ${colSpan}`, '--row': `${row} / span ${rowSpan}` };
  }

  trackByIndex(index: number): number {
    return index;
  }

  private slots: Slot[] = [];

  private build(): void {
    const shown = this._categories.slice(0, MAX_CATEGORY_TILES);
    const tiles: ShowcaseTile[] = shown.map((category) => ({
      id: category.id,
      name: category.name,
      imageUrl: category.imageUrl,
      description: category.description,
      isAll: false,
    }));
    if (this._categories.length > MAX_CATEGORY_TILES) {
      tiles.push({ id: null, name: '', imageUrl: null, description: null, isAll: true });
    }
    this.tiles = tiles;
    this.bento = tiles.length >= MIN_BENTO_TILES;
    this.slots = this.bento ? LAYOUTS[tiles.length] : [];
    this.updateTracks();
  }

  // Same number of tracks in every state, only their fr sizes change, so the
  // browser interpolates the whole grid in one transition.
  private updateTracks(): void {
    if (!this.bento) {
      this.columns = `repeat(${Math.max(this.tiles.length, 1)}, 1fr)`;
      this.rows = '1fr';
      return;
    }
    const [col, colSpan, row, rowSpan] = this.slots[this.activeIndex];
    this.columns = this.weights(COLUMNS, col, colSpan, 2.2, 0.3);
    this.rows = this.weights(ROWS, row, rowSpan, 2.0, 0.35);
  }

  private weights(count: number, start: number, span: number, base: number, perSpan: number): string {
    const boosted = base - perSpan * span;
    return Array.from({ length: count }, (_, i) => {
      const track = i + 1;
      return `${track >= start && track < start + span ? boosted : 1}fr`;
    }).join(' ');
  }
}
