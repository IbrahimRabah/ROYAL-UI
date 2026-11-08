import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { AnnouncementAnimation, AnnouncementTheme } from '../../../core/models';

/**
 * One message of the announcement bar: the text, an optional countdown and link, with its animation and colour
 * theme. Used by the bar itself and by the admin's live preview, so what the team sees is what visitors get.
 *
 * <p>The animation is CSS only. It stops while the pointer or keyboard focus is on the message (so the link can
 * be used), and a visitor who asks for reduced motion gets still text.
 */
@Component({
  selector: 'app-announcement-item',
  templateUrl: './announcement-item.component.html',
  styleUrl: './announcement-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnouncementItemComponent {
  @Input({ required: true }) text!: string;
  @Input() linkUrl: string | null | undefined = null;
  @Input() linkLabel: string | null | undefined = null;
  @Input() animation: AnnouncementAnimation = 'STATIC';
  @Input() theme: AnnouncementTheme = 'GOLD';
  @Input() countdownEndsAt: string | null | undefined = null;
  @Input() dismissible = false;

  @Output() readonly dismissed = new EventEmitter<void>();

  /** A path on this site is a router link; an https address opens as a normal link. */
  get isInternal(): boolean {
    return !!this.linkUrl && this.linkUrl.startsWith('/');
  }

  /** The path and the query of an internal link, split for the router. */
  get route(): { path: string; query: Record<string, string> } {
    const raw = this.linkUrl ?? '/';
    const cut = raw.indexOf('?');
    const path = cut < 0 ? raw : raw.substring(0, cut);
    const query: Record<string, string> = {};
    if (cut >= 0) {
      new URLSearchParams(raw.substring(cut + 1)).forEach((value, key) => (query[key] = value));
    }
    return { path, query };
  }
}
