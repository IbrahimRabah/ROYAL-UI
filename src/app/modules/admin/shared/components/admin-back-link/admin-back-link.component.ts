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
  @Input({ required: true }) parentPath!: string;
  @Input({ required: true }) labelKey!: string;

  get target() {
    return this.listReturn.returnTarget(this.parentPath);
  }
}
