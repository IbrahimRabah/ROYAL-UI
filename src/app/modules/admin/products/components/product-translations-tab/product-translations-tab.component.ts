import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { FlatCategoryOption } from '../../../../../shared/utils/flatten-category-tree.util';
import { FlatBrandOption } from '../../../../../shared/utils/brand-display-name.util';

@Component({
  selector: 'app-product-translations-tab',
  templateUrl: './product-translations-tab.component.html',
  styleUrl: './product-translations-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductTranslationsTabComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() categories: FlatCategoryOption[] = [];
  @Input() brands: FlatBrandOption[] = [];
  @Input() categoriesError = false;
  @Input() brandsError = false;

  get arName() {
    return this.form.get('translations.ar.name');
  }
}
