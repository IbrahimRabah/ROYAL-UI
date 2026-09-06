import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phoneDisplay',
})
export class PhoneDisplayPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ?? '—';
  }
}
