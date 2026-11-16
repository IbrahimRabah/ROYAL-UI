import { InjectionToken } from '@angular/core';

/** The minimal slice of the Express response that a component needs to set the HTTP status while server-rendering. */
export interface SsrResponse {
  status(code: number): unknown;
}

/**
 * Provided by server.ts for each server render. Deliberately NOT `providedIn: 'root'`: a root-level default would
 * shadow the platform-level value that server.ts passes in. Inject it with `{ optional: true }` — it is absent in
 * the browser, where there is no HTTP response to set. Lets a page that renders "not found" also answer with a
 * real HTTP 404, so search engines and link checkers do not treat it as a live page.
 */
export const SSR_RESPONSE = new InjectionToken<SsrResponse>('SSR_RESPONSE');
