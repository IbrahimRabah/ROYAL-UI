import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';

import { AdminListReturnService } from '../../../../../core/services/admin-list-return.service';

@Component({
  selector: 'app-admin-back-link',
  templateUrl: './admin-back-link.component.html',
  styleUrl: './admin-back-link.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminBackLinkComponent {
  private readonly listReturn = inject(AdminListReturnService);

  // The parent list's base path, e.g. '/admin/orders' — doubles as the group key used to
  // look up a remembered filtered/paginated URL (see AdminListReturnService) and as the
  // no-history fallback target when nothing was remembered.
  @Input({ required: true }) parentPath!: string;
  // Already-namespaced i18n key, e.g. 'admin.orders.backToList'.
  @Input({ required: true }) labelKey!: string;

  get target() {
    return this.listReturn.returnTarget(this.parentPath);
  }
}
