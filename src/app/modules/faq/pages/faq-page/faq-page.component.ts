import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

/** /faq: every published general question in one accordion, with one FAQPage structured-data block. */
@Component({
  selector: 'app-faq-page',
  templateUrl: './faq-page.component.html',
  styleUrl: './faq-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FaqPageComponent {
  /** Null until the questions arrive, so the empty message does not flash before them. */
  readonly count = signal<number | null>(null);
}
