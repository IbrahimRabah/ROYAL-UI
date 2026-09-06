import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { AttributeGroupResponse, FilterFacetsResponse, ProductFilter } from '../../../../core/models';

export interface CategoryFilterOption {
  id: number;
  label: string;
  count: number | null;
}

@Component({
  selector: 'app-filter-sidebar',
  templateUrl: './filter-sidebar.component.html',
  styleUrl: './filter-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterSidebarComponent {
  @Input() facets: FilterFacetsResponse | null = null;
  @Input() filter: ProductFilter = {};
  @Input() categoryOptions: CategoryFilterOption[] = [];
  @Input() activeCategoryId: number | null = null;

  @Output() readonly priceChange = new EventEmitter<{ min: number; max: number }>();
  @Output() readonly brandToggle = new EventEmitter<number>();
  @Output() readonly colorToggle = new EventEmitter<number>();
  @Output() readonly attributeToggle = new EventEmitter<number>();
  @Output() readonly inStockChange = new EventEmitter<boolean>();
  @Output() readonly categorySelect = new EventEmitter<number>();
  @Output() readonly clearAll = new EventEmitter<void>();

  get selectedBrandIds(): number[] {
    return this.filter.brandIds ?? [];
  }

  get selectedAttributeValueIds(): number[] {
    return this.filter.attributeValueIds ?? [];
  }

  get inStockOnly(): boolean {
    return this.filter.inStockOnly ?? false;
  }

  get colorGroup(): AttributeGroupResponse | null {
    return this.facets?.attributes.find((group) => group.values.some((value) => value.hexColor != null)) ?? null;
  }

  get otherAttributeGroups(): AttributeGroupResponse[] {
    const color = this.colorGroup;
    return (this.facets?.attributes ?? []).filter((group) => group !== color && group.values.length > 0);
  }

  get hasAnyFilters(): boolean {
    return (
      this.selectedBrandIds.length > 0 ||
      this.selectedAttributeValueIds.length > 0 ||
      this.filter.minPrice != null ||
      this.filter.maxPrice != null ||
      this.inStockOnly
    );
  }
}
