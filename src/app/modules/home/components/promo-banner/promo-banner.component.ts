import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** A slim advertising banner over a dark workshop photo (a tint keeps the text legible). */
@Component({
  selector: 'app-promo-banner',
  templateUrl: './promo-banner.component.html',
  styleUrl: './promo-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PromoBannerComponent {
  @Input() imageUrl: string | null = 'assets/images/home/custom.jpg';
  @Input() link: string | unknown[] = '/custom-request';
}
