import { Pipe, PipeTransform } from '@angular/core';

import { Money, money } from '../../core/models';

const FORMATTER = new Intl.NumberFormat('en-US-u-nu-latn', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

@Pipe({
  name: 'egp',
})
export class EgpPipe implements PipeTransform {
  transform(value: Money | null | undefined): string {
    return FORMATTER.format(money(value));
  }
}
