import { Directive, ElementRef, EventEmitter, HostListener, Output, inject } from '@angular/core';

@Directive({
  selector: '[appClickOutside]'
})
export class ClickOutsideDirective {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  @Output() readonly appClickOutside = new EventEmitter<void>();

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const path = event.composedPath();
    if (!path.includes(this.elementRef.nativeElement)) {
      this.appClickOutside.emit();
    }
  }
}
