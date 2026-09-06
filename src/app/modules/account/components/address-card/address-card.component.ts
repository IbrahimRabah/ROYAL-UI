import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { AddressResponse } from '../../../../core/models';

@Component({
  selector: 'app-address-card',
  templateUrl: './address-card.component.html',
  styleUrl: './address-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddressCardComponent {
  @Input({ required: true }) address!: AddressResponse;
  @Input() deleting = false;
  @Input() settingDefault = false;
  @Output() readonly edit = new EventEmitter<void>();
  @Output() readonly deleteAddress = new EventEmitter<void>();
  @Output() readonly setDefault = new EventEmitter<void>();

  get busy(): boolean {
    return this.deleting || this.settingDefault;
  }

  get labelTranslateKey(): string | null {
    switch ((this.address.label || '').toUpperCase()) {
      case 'HOME':
        return 'account.addressForm.labelHome';
      case 'WORK':
        return 'account.addressForm.labelWork';
      case 'OTHER':
        return 'account.addressForm.labelOther';
      default:
        return null;
    }
  }

  get labelIcon(): string {
    switch ((this.address.label || '').toUpperCase()) {
      case 'HOME':
        return 'pi-home';
      case 'WORK':
        return 'pi-briefcase';
      default:
        return 'pi-tag';
    }
  }
}
