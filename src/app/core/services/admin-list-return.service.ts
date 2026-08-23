import { Injectable } from '@angular/core';

interface ReturnTarget {
  path: string;
  queryParams: Record<string, string>;
}

/**
 * Remembers each admin list screen's current filtered/paginated URL so a "back" link on a
 * detail page it navigated to can return to exactly that view, not a reset one. A list
 * page calls remember() itself whenever its own URL changes (e.g. inside the effect that
 * already reacts to its query-param signals) — this is deliberately push-based rather than
 * a global router-event listener, since a providedIn:'root' service only gets constructed
 * on first injection and a passive listener could miss the very first list visit if
 * nothing had injected it yet.
 *
 * `group` lets more than one route share the same remembered target — e.g. both
 * /admin/inventory and /admin/inventory/low-stock are "the inventory list" for a back
 * link's purposes; whichever the operator actually visited most recently wins.
 *
 * No stored entry (the detail page was opened directly — a bookmark, a fresh tab, a link
 * from outside the app — with no prior visit to the list this session) falls back to the
 * bare group path with no filters. That's the correct default, not a bug: there is no
 * "prior filtered view" to return to, the same reasoning that rules out location.back().
 */
@Injectable({ providedIn: 'root' })
export class AdminListReturnService {
  private readonly targets = new Map<string, ReturnTarget>();

  remember(group: string, url: string): void {
    const [path, queryString] = url.split('?');
    const queryParams: Record<string, string> = {};
    if (queryString) {
      new URLSearchParams(queryString).forEach((value, key) => {
        queryParams[key] = value;
      });
    }
    this.targets.set(group, { path, queryParams });
  }

  returnTarget(group: string): ReturnTarget {
    return this.targets.get(group) ?? { path: group, queryParams: {} };
  }
}
