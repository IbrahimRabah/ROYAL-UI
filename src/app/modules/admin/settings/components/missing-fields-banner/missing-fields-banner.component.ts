import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
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
  @Output() readonly fieldClick = new EventEmitter<string>();

  labelKeyFor(field: string): string {
    return FIELD_LABEL_KEYS[field] ?? field;
  }
}
