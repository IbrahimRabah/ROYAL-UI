import { Pipe, PipeTransform } from '@angular/core';

import { normalizeHexColor } from '../utils/hex-color.util';

/** `[style.background]="value.hexColor | hexColor"` — tolerates a hex saved without its `#`. */
@Pipe({
  name: 'hexColor',
})
export class HexColorPipe implements PipeTransform {
  transform(value: string | null | undefined): string | null {
    return normalizeHexColor(value);
  }
}
