import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AuditEntryResponse } from '../../../../../core/models';
import { AdminAuditApiService } from '../../../../../core/services/api/admin-audit-api.service';
import { LanguageStoreService } from '../../../../../core/state/language-store.service';
import { Language } from '../../../../../core/enums/language';
import {
  AUDIT_ACTION_LABELS_AR,
  AUDIT_ACTION_LABELS_EN,
  AUDIT_ACTION_TONE,
  AUDIT_ENTITY_TYPE_LABELS_AR,
  AUDIT_ENTITY_TYPE_LABELS_EN,
  AuditAction,
  AuditEntityType,
} from '../../../../../core/constants/audit.constants';

// Reached via /admin/audit/:entityType/:entityId — must stand on its own on a hard
// refresh (deep link), so it reads everything it needs from the route params rather than
// from any state handed down by the audit log page.
@Component({
  selector: 'app-entity-history-panel',
  templateUrl: './entity-history-panel.component.html',
  styleUrl: './entity-history-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityHistoryPanelComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly auditApi = inject(AdminAuditApiService);
  private readonly languageStore = inject(LanguageStoreService);

  readonly entityType = this.route.snapshot.paramMap.get('entityType') ?? '';
  readonly entityId = this.route.snapshot.paramMap.get('entityId') ?? '';

  readonly entries = signal<AuditEntryResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  // Only entity types that map to a real admin screen get a link-through target.
  readonly linkTarget: string[] | null =
    this.entityType === 'REMITTANCE' && this.entityId ? ['/admin/remittances', this.entityId] : null;

  constructor() {
    this.fetch();
  }

  get entityTypeLabel(): string {
    const labels = this.languageStore.lang() === Language.AR ? AUDIT_ENTITY_TYPE_LABELS_AR : AUDIT_ENTITY_TYPE_LABELS_EN;
    return labels[this.entityType as AuditEntityType] ?? this.entityType;
  }

  actionLabel(action: string): string {
    const labels = this.languageStore.lang() === Language.AR ? AUDIT_ACTION_LABELS_AR : AUDIT_ACTION_LABELS_EN;
    return labels[action as AuditAction] ?? action;
  }

  actionColor(action: string): string {
    return AUDIT_ACTION_TONE[action as AuditAction] ?? 'var(--admin-text-muted)';
  }

  retry(): void {
    this.fetch();
  }

  private fetch(): void {
    if (!this.entityType || !this.entityId) {
      this.loading.set(false);
      this.error.set(true);
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    this.auditApi.byEntity(this.entityType, this.entityId).subscribe({
      next: (res) => {
        // Newest first.
        const sorted = [...res.content].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.entries.set(sorted);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
