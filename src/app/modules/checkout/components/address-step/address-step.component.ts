import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output, ViewChild, inject, signal } from '@angular/core';

import { AddressResponse, GovernorateResponse } from '../../../../core/models';
import { AddressApiService } from '../../../../core/services/api/address-api.service';
import { AuthStoreService } from '../../../../core/state/auth-store.service';
import { GuestAddressFields, GuestAddressFormComponent, GuestAddressFormValue } from '../guest-address-form/guest-address-form.component';

export interface AddressStepValue {
  addressId?: number;
  addressFields?: GuestAddressFields;
  customerNote?: string;
  governorateId: number | null;
}

@Component({
  selector: 'app-address-step',
  templateUrl: './address-step.component.html',
  styleUrl: './address-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressStepComponent implements OnInit {
  private readonly authStore = inject(AuthStoreService);
  private readonly addressApi = inject(AddressApiService);

  @Input() governorates: GovernorateResponse[] = [];
  @Output() readonly addressChange = new EventEmitter<{ value: AddressStepValue; valid: boolean }>();

  @ViewChild(GuestAddressFormComponent) private readonly guestForm?: GuestAddressFormComponent;

  readonly isLoggedIn = this.authStore.isLoggedIn;
  readonly loadingAddresses = signal(false);
  readonly addresses = signal<AddressResponse[]>([]);
  readonly mode = signal<'saved' | 'new'>('new');
  readonly selectedAddressId = signal<number | null>(null);

  private lastGuestValue: GuestAddressFormValue | null = null;
  private lastGuestValid = false;

  ngOnInit(): void {
    if (!this.isLoggedIn()) {
      return;
    }
    this.loadingAddresses.set(true);
    this.addressApi.list().subscribe({
      next: (list) => {
        this.addresses.set(list);
        this.loadingAddresses.set(false);
        if (list.length > 0) {
          const preferred = list.find((address) => address.isDefault) ?? list[0];
          this.selectedAddressId.set(preferred.id);
          this.mode.set('saved');
          this.emitSaved();
        }
      },
      error: () => this.loadingAddresses.set(false),
    });
  }

  onSelect(id: number): void {
    this.selectedAddressId.set(id);
    this.emitSaved();
  }

  onUseDifferent(): void {
    this.mode.set('new');
    this.emitGuest();
  }

  onGuestValueChange(event: { value: GuestAddressFormValue; valid: boolean }): void {
    this.lastGuestValue = event.value;
    this.lastGuestValid = event.valid;
    this.emitGuest();
  }

  touchAll(): void {
    if (this.mode() === 'new') {
      this.guestForm?.touchAll();
    }
  }

  flagGovernorateNotServed(): void {
    if (this.mode() === 'new') {
      this.guestForm?.flagGovernorateNotServed();
    }
  }

  private emitSaved(): void {
    const address = this.addresses().find((a) => a.id === this.selectedAddressId());
    this.addressChange.emit({
      value: { addressId: address?.id, governorateId: address?.governorateId ?? null },
      valid: address != null,
    });
  }

  private emitGuest(): void {
    this.addressChange.emit({
      value: {
        addressFields: this.lastGuestValue?.fields,
        customerNote: this.lastGuestValue?.customerNote,
        governorateId: this.lastGuestValue?.fields.governorateId ?? null,
      },
      valid: this.lastGuestValid,
    });
  }
}
