import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { environment } from '../../../environments/environment';
import { ProductSeo } from '../models';

export interface SeoPageOptions {
  title: string;
  description?: string | null;
  /** The page's own path (and the query that makes it a different page, such as ?categoryId=3). */
  canonicalPath?: string | null;
  /** An absolute or root-relative image URL for link previews. */
  image?: string | null;
  noindex?: boolean;
  type?: 'website' | 'product';
}

/** Google shows about this many characters of a description. */
const DESCRIPTION_MAX = 160;

/**
 * Everything a search engine or a link preview reads from the head of a page: title, description, canonical URL,
 * robots, Open Graph and Twitter tags, and JSON-LD structured data.
 *
 * <p>Title, Meta and DOCUMENT work during server-side rendering, which is what lets crawlers see all of this
 * without running the app. Nothing here touches window.
 */
@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  /** Sets every head tag for one page. A tag with no value is removed, never left over from the previous page. */
  applyPage(options: SeoPageOptions): void {
    const description = this.shorten(options.description);
    const url = options.canonicalPath ? this.absolute(options.canonicalPath) : null;
    const image = options.image ? this.absolute(options.image) : null;

    this.title.setTitle(options.title);
    this.setName('description', description);
    this.setName('robots', options.noindex ? 'noindex, nofollow' : 'index, follow');
    this.setCanonical(url);

    this.setProperty('og:title', options.title);
    this.setProperty('og:description', description);
    this.setProperty('og:type', options.type ?? 'website');
    this.setProperty('og:url', url);
    this.setProperty('og:image', image);
    this.setName('twitter:card', image ? 'summary_large_image' : 'summary');
    this.setName('twitter:title', options.title);
    this.setName('twitter:description', description);
    this.setName('twitter:image', image);
  }

  /**
   * Puts structured data in the head under a key, replacing what that key held; null removes it.
   * `<` is escaped so a product name can never close the script tag.
   */
  setJsonLd(key: string, data: object | null): void {
    const id = `ld-${key}`;
    const head = this.document.head;
    const existing = this.document.getElementById(id);
    if (data === null) {
      existing?.remove();
      return;
    }
    const script = existing ?? this.document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.setAttribute('id', id);
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
    if (!existing) {
      head.appendChild(script);
    }
  }

  /** The storefront origin joined to a path. */
  absolute(pathOrUrl: string): string {
    if (/^https?:\/\//i.test(pathOrUrl)) {
      return pathOrUrl;
    }
    const origin = environment.siteUrl.replace(/\/$/, '');
    return origin + (pathOrUrl.startsWith('/') ? pathOrUrl : '/' + pathOrUrl);
  }

  /** Kept for the product SEO block the API sends; the product page now uses {@link applyPage}. */
  applyProductSeo(seo: ProductSeo): void {
    this.applyPage({
      title: seo.metaTitle,
      description: seo.metaDescription,
      canonicalPath: seo.canonicalPath,
      type: 'product',
    });
  }

  reset(defaultTitle: string): void {
    this.title.setTitle(defaultTitle);
    this.meta.removeTag("name='description'");
  }

  // ------------------------------------------------------------------ internal

  private shorten(text: string | null | undefined): string | null {
    const clean = text?.replace(/\s+/g, ' ').trim();
    if (!clean) {
      return null;
    }
    return clean.length > DESCRIPTION_MAX ? clean.substring(0, DESCRIPTION_MAX - 1).trimEnd() + '…' : clean;
  }

  private setName(name: string, content: string | null): void {
    if (content) {
      this.meta.updateTag({ name, content });
    } else {
      this.meta.removeTag(`name='${name}'`);
    }
  }

  private setProperty(property: string, content: string | null): void {
    if (content) {
      this.meta.updateTag({ property, content });
    } else {
      this.meta.removeTag(`property='${property}'`);
    }
  }

  private setCanonical(url: string | null): void {
    const head = this.document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!url) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
