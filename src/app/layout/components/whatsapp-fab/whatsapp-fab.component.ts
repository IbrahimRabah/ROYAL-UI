import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { APP_CONFIG } from '../../../core/constants/app-config';
import { LanguageStoreService } from '../../../core/state/language-store.service';
import { UiStoreService } from '../../../core/state/ui-store.service';

/**
 * Floating WhatsApp contact button. The number is the site's single public contact config
 * (APP_CONFIG.contact.whatsappUrl, shared with the footer and the contact page); the store profile that
 * holds the legal phone is admin-only and has no public endpoint. No URL configured = no button.
 */
@Component({
  selector: 'app-whatsapp-fab',
  templateUrl: './whatsapp-fab.component.html',
  styleUrl: './whatsapp-fab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappFabComponent {
  private readonly ui = inject(UiStoreService);
  private readonly translate = inject(TranslateService);
  private readonly languageStore = inject(LanguageStoreService);

  /** Lifted above the product page's sticky bar so the two never overlap. */
  readonly raised = this.ui.stickyBarVisible;

  readonly href = computed<string | null>(() => {
    this.languageStore.lang(); // message follows the interface language
    const base = APP_CONFIG.contact.whatsappUrl;
    if (!base) return null;
    const product = this.ui.contactProduct();
    const text = product
      ? this.translate.instant('whatsapp.productMessage', { name: product })
      : this.translate.instant('whatsapp.greeting');
    return `${base}?text=${encodeURIComponent(text)}`;
  });
}
