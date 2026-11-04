import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Input, OnChanges, OnDestroy, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { Observable, catchError, of } from 'rxjs';

import { Faq, FaqTopic } from '../../../core/models';
import { FaqApiService } from '../../../core/services/api/faq-api.service';
import { SeoService } from '../../../core/services/seo.service';

let nextId = 0;

/**
 * The published FAQs of a product, a category, or the shop (by topic), as an accordion, plus the matching
 * FAQPage structured data. The markup is built from exactly the questions drawn on the page: Google penalises
 * markup for questions a visitor cannot see. Draws nothing when there are none.
 */
@Component({
  selector: 'app-faq-section',
  templateUrl: './faq-section.component.html',
  styleUrl: './faq-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqSectionComponent implements OnChanges, OnDestroy {
  private readonly api = inject(FaqApiService);
  private readonly seo = inject(SeoService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) scope!: 'product' | 'category' | 'general';
  /** The product slug, or the category id; unused for the general FAQ. */
  @Input() key: string | number | null = null;
  @Input() topic: FaqTopic | null = null;
  /** Show the «Frequently asked questions» heading. Off where the page already has one. */
  @Input() heading = true;

  /** How many FAQs were drawn, so a page can say something when there are none. */
  @Output() readonly loaded = new EventEmitter<number>();

  readonly items = signal<Faq[]>([]);
  readonly uid = `faq-${nextId++}`;

  constructor() {
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  ngOnChanges(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.seo.setJsonLd(this.uid, null);
  }

  private load(): void {
    if (this.scope !== 'general' && (this.key === null || this.key === '')) {
      this.items.set([]);
      this.seo.setJsonLd(this.uid, null);
      return;
    }
    this.source().pipe(catchError(() => of([] as Faq[]))).subscribe((faqs) => {
      this.items.set(faqs);
      this.loaded.emit(faqs.length);
      this.seo.setJsonLd(this.uid, faqs.length === 0 ? null : {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      });
    });
  }

  private source(): Observable<Faq[]> {
    switch (this.scope) {
      case 'product':
        return this.api.forProduct(String(this.key));
      case 'category':
        return this.api.forCategory(Number(this.key));
      default:
        return this.api.general(this.topic);
    }
  }
}
