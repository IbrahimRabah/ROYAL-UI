import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UiStoreService {
  private readonly _drawerOpen = signal(false);
  private readonly _filtersOpen = signal(false);
  private readonly _mobileNavOpen = signal(false);

  readonly drawerOpen = this._drawerOpen.asReadonly();
  readonly filtersOpen = this._filtersOpen.asReadonly();
  readonly mobileNavOpen = this._mobileNavOpen.asReadonly();

  openDrawer(): void {
    this._drawerOpen.set(true);
  }

  closeDrawer(): void {
    this._drawerOpen.set(false);
  }

  toggleDrawer(): void {
    this._drawerOpen.update((open) => !open);
  }

  openFilters(): void {
    this._filtersOpen.set(true);
  }

  closeFilters(): void {
    this._filtersOpen.set(false);
  }

  toggleFilters(): void {
    this._filtersOpen.update((open) => !open);
  }

  openMobileNav(): void {
    this._mobileNavOpen.set(true);
  }

  closeMobileNav(): void {
    this._mobileNavOpen.set(false);
  }

  toggleMobileNav(): void {
    this._mobileNavOpen.update((open) => !open);
  }
}
