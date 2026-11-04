import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { catchError, filter, of } from 'rxjs';

import { FaqApiService } from './api/faq-api.service';
import { SeoService } from './seo.service';

/** Parts of the site that are not public pages: kept out of search results. */
const PRIVATE_PREFIXES = ['/admin', '/me', '/auth', '/cart', '/checkout', '/wishlist', '/403'];

/**
 * Sets the head of every page that is not a product or a category (those two set their own once their data
 * arrives). A route says which page it is with {@code data: { seoKey: 'ABOUT' }}; the SEO team's text for that
 * key comes from the API, and the built-in text in the translation files is the fallback, so a page is never
 * left without a title.
 */
@Injectable({
  providedIn: 'root',
})
export class RouteSeoService {
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  private readonly faqApi = inject(FaqApiService);
  private readonly translate = inject(TranslateService);

  private lastUrl: string | null = null;
  private started = false;

  init(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
      this.lastUrl = e.urlAfterRedirects;
      this.apply(e.urlAfterRedirects);
    });
    // The page text comes in the visitor's language: ask again when it changes.
    this.translate.onLangChange.subscribe(() => {
      if (this.lastUrl) {
        this.apply(this.lastUrl);
      }
    });
  }

  private apply(url: string): void {
    const tree = this.router.parseUrl(url);
    const path = '/' + tree.root.children['primary']?.segments.map((s) => s.path).join('/');
    const cleanPath = path === '/undefined' ? '/' : path;
    const categoryId = tree.queryParams['categoryId'];

    if (PRIVATE_PREFIXES.some((p) => cleanPath === p || cleanPath.startsWith(p + '/'))) {
      this.seo.applyPage({ title: 'ROYAL IRON', canonicalPath: cleanPath, noindex: true });
      return;
    }

    const canonical = cleanPath === '/products' && categoryId ? `/products?categoryId=${categoryId}` : cleanPath;
    const key = this.seoKey(this.router.routerState.snapshot.root);

    // A category page and a product page set their own head when their data arrives; only the canonical URL
    // (which they would set the same way) is settled here.
    if (!key || (cleanPath === '/products' && categoryId) || cleanPath.startsWith('/products/')) {
      return;
    }

    const base = `seo.defaults.${key}`;
    this.faqApi.seoPage(key).pipe(catchError(() => of({ title: null, description: null, noindex: false }))).subscribe((page) => {
      this.translate.get([`${base}.title`, `${base}.description`]).subscribe((texts) => {
        // A key with no translation comes back as itself: treat that as «no built-in text».
        const builtIn = (k: string): string | null => (texts[k] && texts[k] !== k ? texts[k] : null);
        this.seo.applyPage({
          title: page.title || builtIn(`${base}.title`) || 'ROYAL IRON',
          description: page.description || builtIn(`${base}.description`),
          canonicalPath: canonical,
          noindex: page.noindex,
        });
      });
    });
  }

  /** The seoKey of the deepest route that has one. */
  private seoKey(root: ActivatedRouteSnapshot): string | null {
    let key: string | null = null;
    let node: ActivatedRouteSnapshot | null = root;
    while (node) {
      const value = node.data?.['seoKey'];
      if (typeof value === 'string') {
        key = value;
      }
      node = node.firstChild;
    }
    return key;
  }
}
