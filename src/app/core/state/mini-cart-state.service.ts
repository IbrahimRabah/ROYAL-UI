import { Injectable, signal } from '@angular/core';

/**
 * Open/closed state of the mini cart panel. There is exactly one way in for every caller:
 *  - openAfterAdd(variantId)  — a successful add to cart (product page and its sticky bar share one handler)
 *  - openFromHeader()         — the header cart icon
 * The panel component (layout level) is the only reader.
 */
@Injectable({
  providedIn: 'root',
})
export class MiniCartStateService {
  private readonly _open = signal(false);
  private readonly _justAddedVariantId = signal<number | null>(null);

  readonly open = this._open.asReadonly();
  /** The variant that was just added, shown as the thing that was added; null when opened from the header. */
  readonly justAddedVariantId = this._justAddedVariantId.asReadonly();

  openAfterAdd(variantId: number): void {
    this._justAddedVariantId.set(variantId);
    this._open.set(true);
  }

  openFromHeader(): void {
    this._justAddedVariantId.set(null);
    this._open.set(true);
  }

  close(): void {
    this._open.set(false);
    this._justAddedVariantId.set(null);
  }
}
