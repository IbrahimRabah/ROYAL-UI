import { ChangeDetectionStrategy, Component, ElementRef, HostListener, Input, inject, signal } from '@angular/core';

import { CategoryNode } from '../../../core/models';

@Component({
  selector: 'app-main-nav',
  templateUrl: './main-nav.component.html',
  styleUrl: './main-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainNavComponent {
  @Input() categories: CategoryNode[] = [];

  private readonly elementRef = inject(ElementRef<HTMLElement>);

  private readonly openCategoryId = signal<number | null>(null);

  isOpen(categoryId: number): boolean {
    return this.openCategoryId() === categoryId;
  }

  toggle(categoryId: number): void {
    this.openCategoryId.set(this.isOpen(categoryId) ? null : categoryId);
  }

  closeAll(): void {
    this.openCategoryId.set(null);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeAll();
    }
  }
}
