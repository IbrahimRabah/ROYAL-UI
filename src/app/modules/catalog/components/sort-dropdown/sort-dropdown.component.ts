import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { SortOption } from '../../../../core/enums/sort-option';

export interface SortChoice {
  value: SortOption;
  labelKey: string;
}

export const SORT_CHOICES: SortChoice[] = [
  { value: SortOption.NEWEST, labelKey: 'products.sort.newest' },
  { value: SortOption.PRICE_ASC, labelKey: 'products.sort.priceAsc' },
  { value: SortOption.PRICE_DESC, labelKey: 'products.sort.priceDesc' },
  { value: SortOption.NAME, labelKey: 'products.sort.name' },
];

@Component({
  selector: 'app-sort-dropdown',
  templateUrl: './sort-dropdown.component.html',
  styleUrl: './sort-dropdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SortDropdownComponent {
  @Input() value: SortOption = SortOption.NEWEST;
  @Output() readonly valueChange = new EventEmitter<SortOption>();

  readonly choices = SORT_CHOICES;
}
