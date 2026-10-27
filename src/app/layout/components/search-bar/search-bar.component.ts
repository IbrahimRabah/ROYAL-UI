import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, NonNullableFormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { EMPTY, catchError, debounceTime, map, of, switchMap, tap } from 'rxjs';

import { SuggestionCategory, SuggestionProduct } from '../../../core/models';
import { CatalogApiService } from '../../../core/services/api/catalog-api.service';

/** The server returns empty arrays below 2 letters; we do not even ask. */
const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

type SuggestStatus = 'idle' | 'loading' | 'ready' | 'error';

export type SuggestionItem =
  | ({ kind: 'product' } & SuggestionProduct)
  | ({ kind: 'category' } & SuggestionCategory);

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchBarComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);


  @ViewChild('searchInput') private readonly searchInput?: ElementRef<HTMLInputElement>;

  readonly query: FormControl<string> = this.fb.control('');
  readonly isOpen = signal(false);

  readonly status = signal<SuggestStatus>('idle');
  readonly products = signal<SuggestionProduct[]>([]);
  readonly categoryRows = signal<SuggestionCategory[]>([]);
  readonly activeIndex = signal(-1);
  /** Separate from isOpen: the suggestions panel can close (Escape) while the search box stays open. */
  readonly suggestOpen = signal(false);

  readonly items = computed<SuggestionItem[]>(() => [
    ...this.products().map((p) => ({ kind: 'product' as const, ...p })),
    ...this.categoryRows().map((c) => ({ kind: 'category' as const, ...c })),
  ]);
  readonly panelVisible = computed(() => this.suggestOpen() && this.status() !== 'idle');
  readonly isEmpty = computed(() => this.status() === 'ready' && this.items().length === 0);

  readonly listboxId = 'search-suggestions-listbox';

  constructor() {
    this.query.valueChanges.pipe(
      tap((value) => {
        if (value.trim().length < MIN_CHARS) {
          this.resetSuggestions();
        } else {
          // Visible immediately, before the debounce, so the panel never sits empty and reads as "no results".
          this.status.set('loading');
          this.suggestOpen.set(true);
          this.activeIndex.set(-1);
        }
      }),
      debounceTime(DEBOUNCE_MS),
      map((value) => value.trim()),
      // switchMap cancels the in-flight request on every newer keystroke, so a slow response can't overwrite a newer one.
      switchMap((q) =>
        q.length < MIN_CHARS
          ? EMPTY
          : this.catalogApi.suggest(q).pipe(catchError(() => of(null))),
      ),
      takeUntilDestroyed(),
    ).subscribe((res) => {
      if (!res) {
        this.products.set([]);
        this.categoryRows.set([]);
        this.status.set('error');
        return;
      }
      this.products.set(res.products ?? []);
      this.categoryRows.set(res.categories ?? []);
      this.activeIndex.set(-1);
      this.status.set('ready');
    });
  }

  optionId(index: number): string {
    return `search-suggestion-${index}`;
  }

  statusKey(): string {
    switch (this.status()) {
      case 'loading': return 'header.suggestions.searching';
      case 'error': return 'header.suggestions.error';
      default: return this.isEmpty() ? 'header.suggestions.empty' : 'header.suggestions.available';
    }
  }

  openSearch(): void {
    this.isOpen.set(true);
    setTimeout(() => this.searchInput?.nativeElement.focus(), 50);
  }

  closeSearch(): void {
    this.isOpen.set(false);
    this.suggestOpen.set(false);
    this.activeIndex.set(-1);
  }

  onFocus(): void {
    if (this.status() !== 'idle') this.suggestOpen.set(true);
  }

  /** Tabbing away closes the panel; moving focus inside the component (e.g. to the submit button) does not. */
  onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.host.nativeElement.contains(next)) return;
    if (next) this.suggestOpen.set(false);
  }

  onArrow(event: Event, direction: 1 | -1): void {
    if (this.status() === 'idle' || !this.items().length) return;
    event.preventDefault();
    this.suggestOpen.set(true);
    const count = this.items().length;
    const current = this.activeIndex();
    const next = current === -1 ? (direction === 1 ? 0 : count - 1) : (current + direction + count) % count;
    this.activeIndex.set(next);
    setTimeout(() => this.host.nativeElement.querySelector(`#${this.optionId(next)}`)?.scrollIntoView({ block: 'nearest' }));
  }

  /** Enter on a highlighted suggestion opens it; with nothing highlighted the form submits to the results page. */
  onEnter(event: Event): void {
    const item = this.panelVisible() ? this.items()[this.activeIndex()] : undefined;
    if (!item) return;
    event.preventDefault();
    this.choose(item);
  }

  /** Escape closes the suggestions and keeps the text; only a second Escape closes the search box. */
  onEscape(event: Event): void {
    if (!this.panelVisible()) return;
    event.stopPropagation();
    this.suggestOpen.set(false);
    this.activeIndex.set(-1);
  }

  /** Keyboard path (Enter on the highlighted row); the rows' own hrefs cover clicks. Same targets as the template. */
  choose(item: SuggestionItem): void {
    if (item.kind === 'product') {
      void this.router.navigate(this.productLink(item.slug));
    } else {
      void this.router.navigate(['/products'], { queryParams: this.categoryParams(item.id) });
    }
    this.closeSearch();
  }

  productLink(slug: string): string[] {
    return ['/products', slug];
  }

  categoryParams(id: number): { categoryId: number } {
    return { categoryId: id };
  }

  /**
   * Plain left click navigates (routerLink) and closes the box. Ctrl/Cmd/Shift/middle clicks open a new tab
   * or window, so the box stays open for comparing the next result.
   */
  onLinkClick(event: MouseEvent): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    this.closeSearch();
  }

  closeAfterNavigation(): void {
    this.closeSearch();
  }

  submit(): void {
    const q = this.query.value.trim();
    if (!q) {
      return;
    }
    this.router.navigate(['/products'], { queryParams: { q } });
    this.closeSearch();
  }

  private resetSuggestions(): void {
    this.status.set('idle');
    this.products.set([]);
    this.categoryRows.set([]);
    this.activeIndex.set(-1);
    this.suggestOpen.set(false);
  }
}
