import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, pairwise, startWith } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class ScrollRestorationService {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  init(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map((event) => event.urlAfterRedirects.split('?')[0]),
        startWith(this.router.url.split('?')[0]),
        pairwise(),
      )
      .subscribe(([previousPath, currentPath]) => {
        if (previousPath !== currentPath) {
          window.scrollTo({ top: 0 });
        }
      });
  }
}
