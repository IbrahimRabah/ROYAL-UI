import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { SSR_RESPONSE } from '../../../core/tokens/ssr-response.token';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundComponent {
  constructor() {
    // Server render only: answer 404 instead of 200 for an address that has no page.
    inject(SSR_RESPONSE, { optional: true })?.status(404);
  }
}
