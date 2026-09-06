import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';

const COLLAPSE_STORAGE_KEY = 'admin_sidebar_collapsed';

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLayoutComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);

  readonly sidebarCollapsed = signal(false);
  readonly mobileNavOpen = signal(false);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      if (localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1') {
        this.sidebarCollapsed.set(true);
      }
    } catch {
    }
  }

  toggleSidebarCollapsed(): void {
    const next = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(next);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      } catch {
      }
    }
  }
}
