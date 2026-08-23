import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { ProductSpecification } from '../../../../core/models';

@Component({
  selector: 'app-product-specs-table',
  templateUrl: './product-specs-table.component.html',
  styleUrl: './product-specs-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductSpecsTableComponent {
  @Input() specifications: ProductSpecification[] = [];

  trackByCode(_index: number, spec: ProductSpecification): string {
    return spec.code;
  }
}
