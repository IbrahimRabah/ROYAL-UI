import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  inject,
} from '@angular/core';

@Component({
  selector: 'app-mobile-filter-drawer',
  templateUrl: './mobile-filter-drawer.component.html',
  styleUrl: './mobile-filter-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileFilterDrawerComponent implements OnChanges, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  @Input() visible = false;
  @Output() readonly visibleChange = new EventEmitter<boolean>();

  ngOnChanges(changes: SimpleChanges): void {
    if ('visible' in changes && isPlatformBrowser(this.platformId)) {
      this.document.body.style.overflow = this.visible ? 'hidden' : '';
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.document.body.style.overflow = '';
    }
  }

  close(): void {
    this.visibleChange.emit(false);
  }
}
