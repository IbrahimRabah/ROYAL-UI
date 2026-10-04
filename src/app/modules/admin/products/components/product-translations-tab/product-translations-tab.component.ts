import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { FlatCategoryOption } from '../../../../../shared/utils/flatten-category-tree.util';
import { FulfillmentType } from '../../../../../core/enums/fulfillment-type';
import { ShippingSizeClass } from '../../../../../core/enums/shipping-size-class';
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

  readonly fulfillmentTypes = Object.values(FulfillmentType);
  readonly sizeClasses = Object.values(ShippingSizeClass);

  get fulfillmentType() {
    return this.form.get('fulfillmentType');
  }

  get shippingSize() {
    return this.form.get('shippingSizeClass');
  }

  get assemblyFee() {
    return this.form.get('assemblyFee');
  }

  get isReadyMade(): boolean {
    return this.fulfillmentType?.value === FulfillmentType.READY_MADE;
  }

  get requiresAssembly(): boolean {
    return !!this.form.get('requiresAssembly')?.value;
  }

  selectType(type: FulfillmentType): void {
    this.fulfillmentType?.setValue(type);
    this.fulfillmentType?.markAsDirty();
  }

  get arName() {
    return this.form.get('translations.ar.name');
  }
}
