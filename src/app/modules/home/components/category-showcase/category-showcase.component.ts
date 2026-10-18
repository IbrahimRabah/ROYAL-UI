import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { CategoryNode } from '../../../../core/models';

// Above this many categories the row stops sharing the width and scrolls instead.
const MAX_FITTING_PANELS = 8;

@Component({
  selector: 'app-category-showcase',
  templateUrl: './category-showcase.component.html',
  styleUrl: './category-showcase.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryShowcaseComponent {
  @Input() categories: CategoryNode[] = [];

  activeId: number | null = null;

  get scrollable(): boolean {
    return this.categories.length > MAX_FITTING_PANELS;
  }

  activate(id: number): void {
    this.activeId = id;
  }

  deactivate(): void {
    this.activeId = null;
  }

  trackById(_: number, category: CategoryNode): number {
    return category.id;
  }
}
