import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';

import { CategoryNode } from '../../../core/models';

/**
 * Hand-rolled rather than PrimeNG's p-drawer: p-drawer's content renders blank and Angular
 * throws an Ivy view-tree assertion the first time it opens in this app's SSR+hydration
 * setup — a known, still-open upstream bug (primefaces/primeng#16358, #16800), not
 * something fixable from consumer code. Verified in the browser both before and after
 * trying ngSkipHydration / appendTo="body"; neither resolved it.
 */
@Component({
  selector: 'app-mobile-nav-drawer',
  templateUrl: './mobile-nav-drawer.component.html',
  styleUrl: './mobile-nav-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileNavDrawerComponent implements OnChanges, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  @Input() categories: CategoryNode[] = [];
  @Input() visible = false;
  @Output() readonly visibleChange = new EventEmitter<boolean>();

  @ViewChild('closeBtn') private readonly closeBtn?: ElementRef<HTMLButtonElement>;

  private readonly openCategoryId = signal<number | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (!('visible' in changes) || !isPlatformBrowser(this.platformId)) {
      return;
    }
    this.document.body.style.overflow = this.visible ? 'hidden' : '';
    if (this.visible) {
      queueMicrotask(() => this.closeBtn?.nativeElement.focus());
    } else {
      this.openCategoryId.set(null);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.document.body.style.overflow = '';
    }
  }

  isCategoryOpen(categoryId: number): boolean {
    return this.openCategoryId() === categoryId;
  }

  toggleCategory(categoryId: number): void {
    this.openCategoryId.set(this.isCategoryOpen(categoryId) ? null : categoryId);
  }

  close(): void {
    this.visibleChange.emit(false);
  }
}
