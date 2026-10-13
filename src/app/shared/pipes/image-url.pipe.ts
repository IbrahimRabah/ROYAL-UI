import { Pipe, PipeTransform } from '@angular/core';

export const IMAGE_PLACEHOLDER = 'assets/images/placeholder-category.svg';

@Pipe({
  name: 'imageUrl'
})
export class ImageUrlPipe implements PipeTransform {
  transform(url: string | null | undefined): string {
    return url || IMAGE_PLACEHOLDER;
  }
}
