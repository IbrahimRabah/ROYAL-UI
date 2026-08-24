import { Pipe, PipeTransform } from '@angular/core';

// Phone numbers are already normalised (E.164-ish, e.g. +201012345678) by the API — this
// pipe just guarantees a display string; the LTR/isolate direction handling belongs to
// the consuming template's CSS (see .ilp__col-phone for the established pattern), not here.
@Pipe({
  name: 'phoneDisplay',
})
export class PhoneDisplayPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ?? '—';
  }
}
