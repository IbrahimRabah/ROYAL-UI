import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { CategoryNode } from '../../../../core/models';

@Component({
  selector: 'app-category-showcase',
  templateUrl: './category-showcase.component.html',
  styleUrl: './category-showcase.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryShowcaseComponent {
  @Input() categories: CategoryNode[] = [];

  private readonly brokenIds = new Set<number>();

  hasImage(category: CategoryNode): boolean {
    return !!category.imageUrl && !this.brokenIds.has(category.id);
  }

  onImageError(id: number): void {
    this.brokenIds.add(id);
  }
}
