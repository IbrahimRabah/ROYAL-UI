import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { CategoryAdminResponse } from '../../../../../core/models';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { AdminTaxonomyApiService } from '../../../../../core/services/api/admin-taxonomy-api.service';
import { categoryDisplayName } from '../../../../../shared/utils/flatten-category-tree.util';

interface DialogTarget {
  category: CategoryAdminResponse | null; // null = creating new
  parentId: number | null; // prefilled parent for a new (sub)category
}

// Flat (node, depth) pairs, deepest-first traversal order preserved as top-to-bottom tree
// order — used both for rendering rows and for computing self+descendant exclusions.
interface FlatNode {
  node: CategoryAdminResponse;
  depth: number;
}

function flatten(nodes: CategoryAdminResponse[], depth = 0): FlatNode[] {
  return nodes.flatMap((node) => [{ node, depth }, ...flatten(node.children, depth + 1)]);
}

function collectIds(node: CategoryAdminResponse): Set<number> {
  const ids = new Set<number>([node.id]);
  for (const child of node.children) {
    for (const id of collectIds(child)) {
      ids.add(id);
    }
  }
  return ids;
}

@Component({
  selector: 'app-category-tree-page',
  templateUrl: './category-tree-page.component.html',
  styleUrl: './category-tree-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryTreePageComponent {
  private readonly taxonomyApi = inject(AdminTaxonomyApiService);
  private readonly languageStore = inject(LanguageStoreService);

  readonly tree = signal<CategoryAdminResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly flatRows = computed(() => flatten(this.tree()));

  readonly dialogTarget = signal<DialogTarget | null>(null);
  readonly dialogOpen = computed(() => this.dialogTarget() !== null);

  // Every category except the one being edited and its own descendants — a category
  // cannot become its own ancestor (409 CATEGORY_CYCLE), so this filters the parent
  // select before the operator can ever hit that error.
  readonly parentOptions = computed(() => {
    const target = this.dialogTarget();
    const excluded = target?.category ? collectIds(target.category) : new Set<number>();
    return this.flatRows()
      .filter((row) => !excluded.has(row.node.id))
      .map((row) => ({ id: row.node.id, name: this.displayName(row.node), depth: row.depth }));
  });

  constructor() {
    this.fetchAll();
  }

  displayName(node: CategoryAdminResponse): string {
    return categoryDisplayName(node, this.languageStore.lang());
  }

  retry(): void {
    this.fetchAll();
  }

  openNew(parentId: number | null = null): void {
    this.dialogTarget.set({ category: null, parentId });
  }

  openEdit(node: CategoryAdminResponse): void {
    this.dialogTarget.set({ category: node, parentId: node.parentId });
  }

  closeDialog(): void {
    this.dialogTarget.set(null);
  }

  onSaved(): void {
    this.dialogTarget.set(null);
    this.fetchAll();
  }

  private fetchAll(): void {
    this.loading.set(true);
    this.error.set(false);
    this.taxonomyApi.listCategories().subscribe({
      next: (tree) => {
        this.tree.set(tree);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
