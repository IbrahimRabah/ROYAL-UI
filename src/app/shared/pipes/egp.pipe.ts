import { Pipe, PipeTransform } from '@angular/core';

import { Money, money } from '../../core/models';

// Latin numerals always (-u-nu-latn) — money stays LTR-readable inside Arabic layouts per
// the admin RTL rules. Returns the bare "1,234.00" figure; callers append "EGP" themselves
// so it can sit beside the number as a muted suffix (see .ilp__currency for the pattern).
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
