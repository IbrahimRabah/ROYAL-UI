import { Directive, ElementRef, HostBinding, HostListener, inject } from '@angular/core';

import { IMAGE_PLACEHOLDER } from '../pipes/image-url.pipe';

@Directive({
  selector: 'img[appImgFallback]'
})
export class ImgFallbackDirective {
  private readonly el = inject<ElementRef<HTMLImageElement>>(ElementRef);

  @HostBinding('class.img-loading') loading = true;

  @HostListener('load')
  onLoad(): void {
    this.loading = false;
  }

  @HostListener('error')
  onError(): void {
    const img = this.el.nativeElement;
    if (img.getAttribute('src') !== IMAGE_PLACEHOLDER) {
      img.src = IMAGE_PLACEHOLDER;
    }
    this.loading = false;
  }
}
