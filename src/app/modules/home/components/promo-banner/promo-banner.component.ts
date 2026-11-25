import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** A slim advertising banner. Text-only until the artwork arrives: set `imageUrl` and it becomes the background. */
@Component({
  selector: 'app-promo-banner',
  templateUrl: './promo-banner.component.html',
  styleUrl: './promo-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PromoBannerComponent {
  @Input() imageUrl: string | null = null;
  @Input() link: string | unknown[] = '/custom-request';
}
