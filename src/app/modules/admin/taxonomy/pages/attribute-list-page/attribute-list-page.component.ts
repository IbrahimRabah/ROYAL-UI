import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AttributeAdminResponse } from '../../../../../core/models';
import { AttributeDataType, attributeDataTypeLabelKey } from '../../../../../core/enums/attribute-data-type';
import { Language } from '../../../../../core/enums/language';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { AdminTaxonomyApiService } from '../../../../../core/services/api/admin-taxonomy-api.service';
import { StatusTone } from '../../../../../core/constants/order-status.constants';

const DATA_TYPE_TONE: Record<AttributeDataType, StatusTone> = {
  [AttributeDataType.LIST]: 'info',
  [AttributeDataType.TEXT]: 'muted',
  [AttributeDataType.NUMBER]: 'info',
  [AttributeDataType.BOOLEAN]: 'warn',
};

@Component({
  selector: 'app-attribute-list-page',
  templateUrl: './attribute-list-page.component.html',
  styleUrl: './attribute-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributeListPageComponent {
  private readonly taxonomyApi = inject(AdminTaxonomyApiService);
  private readonly languageStore = inject(LanguageStoreService);

  readonly attributes = signal<AttributeAdminResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly variantAttributes = computed(() => this.attributes().filter((a) => a.variantDefining));
  readonly specAttributes = computed(() => this.attributes().filter((a) => !a.variantDefining));

  readonly AttributeDataType = AttributeDataType;

  constructor() {
    this.fetchAll();
  }

  displayName(attr: AttributeAdminResponse): string {
    const lang = this.languageStore.lang();
    const primary = lang === Language.AR ? attr.nameAr : attr.nameEn;
    const fallback = lang === Language.AR ? attr.nameEn : attr.nameAr;
    return primary || fallback || attr.code;
  }

  dataTypeLabelKey(type: AttributeDataType): string {
    return attributeDataTypeLabelKey(type);
  }

  dataTypeTone(type: AttributeDataType): StatusTone {
    return DATA_TYPE_TONE[type];
  }

  retry(): void {
    this.fetchAll();
  }

  private fetchAll(): void {
    this.loading.set(true);
    this.error.set(false);
    this.taxonomyApi.listAttributes().subscribe({
      next: (attrs) => {
        this.attributes.set(attrs);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
