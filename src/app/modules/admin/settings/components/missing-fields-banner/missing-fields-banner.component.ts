import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

// Server-driven — the banner never decides what's missing itself, it only renders the
// `missingFields` array StoreProfileResponse already sends. This map is purely cosmetic:
// a human-readable label (and the id to focus) for each known raw field key. An unknown
// key still renders — ngx-translate falls back to showing the raw key text untranslated
// rather than dropping it silently.
const FIELD_LABEL_KEYS: Record<string, string> = {
  legalName: 'admin.settings.fields.legalName',
  legalNameEn: 'admin.settings.fields.legalNameEn',
  address: 'admin.settings.fields.address',
  phone: 'admin.settings.fields.phone',
  email: 'admin.settings.fields.email',
  taxNumber: 'admin.settings.fields.taxNumber',
  commercialRegister: 'admin.settings.fields.commercialRegister',
  website: 'admin.settings.fields.website',
  invoiceFooterNote: 'admin.settings.fields.invoiceFooterNote',
};

@Component({
  selector: 'app-missing-fields-banner',
  templateUrl: './missing-fields-banner.component.html',
  styleUrl: './missing-fields-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MissingFieldsBannerComponent {
  @Input() fields: string[] = [];
  // Lets the field, not the banner, decide what "jump to it" means (focus, scroll, etc).
  @Output() readonly fieldClick = new EventEmitter<string>();

  labelKeyFor(field: string): string {
    return FIELD_LABEL_KEYS[field] ?? field;
  }
}
