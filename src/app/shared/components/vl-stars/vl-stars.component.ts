import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Read-only star rating, to a tenth: 3.5 fills three stars and half of the fourth. Used wherever an average
 * or a single review's stars are shown. Picking a rating is the review dialog's own radio group, not this.
 */
@Component({
  selector: 'app-vl-stars',
  templateUrl: './vl-stars.component.html',
  styleUrl: './vl-stars.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VlStarsComponent {
  /** 0 to 5, may be fractional. */
  @Input() value: number | null | undefined = 0;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  get percent(): number {
    const v = Math.min(5, Math.max(0, Number(this.value) || 0));
    return (v / 5) * 100;
  }

  get rounded(): number {
    return Math.round((Number(this.value) || 0) * 10) / 10;
  }
}
