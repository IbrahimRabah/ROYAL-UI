import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

/** The events the store reports. Adding one here keeps every call site honest about its name. */
export type AnalyticsEvent =
  | 'search_open'
  | 'search_submit'
  | 'zero_results'
  | 'filter_apply'
  | 'pdp_view'
  | 'atc_click'
  | 'checkout_start'
  | 'checkout_confirm'
  | 'call_click'
  | 'whatsapp_click';

export type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

type DataLayerWindow = Window & { dataLayer?: Record<string, unknown>[] };

/**
 * Pushes events onto `window.dataLayer`, the plain array every tag manager reads. No analytics script is loaded
 * and nothing is sent anywhere by this class: until a tool (Google Tag Manager, GA4, Meta Pixel...) is chosen and
 * its snippet added to index.html, the events just sit in that array, so the measurement points are already in
 * place and can be checked in the browser console (`dataLayer`). Browser-only; a no-op during server rendering.
 */
@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);

  track(event: AnalyticsEvent, params: AnalyticsParams = {}): void {
    if (!this.isBrowser) return;
    const win = this.document.defaultView as DataLayerWindow | null;
    if (!win) return;
    (win.dataLayer ??= []).push({ event, ...params });
  }
}
