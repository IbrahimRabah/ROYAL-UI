import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { SharedModule } from '../../shared/shared.module';

import { CheckoutRoutingModule } from './checkout-routing.module';
import { CheckoutPageComponent } from './pages/checkout-page/checkout-page.component';
import { OrderConfirmationPageComponent } from './pages/order-confirmation-page/order-confirmation-page.component';
import { AddressStepComponent } from './components/address-step/address-step.component';
import { GuestAddressFormComponent } from './components/guest-address-form/guest-address-form.component';
import { SavedAddressPickerComponent } from './components/saved-address-picker/saved-address-picker.component';
import { ShippingStepComponent } from './components/shipping-step/shipping-step.component';
import { ReviewStepComponent } from './components/review-step/review-step.component';
import { PaymentMethodSelectorComponent } from './components/payment-method-selector/payment-method-selector.component';
import { CheckoutSummarySidebarComponent } from './components/checkout-summary-sidebar/checkout-summary-sidebar.component';


@NgModule({
  declarations: [
    CheckoutPageComponent,
    OrderConfirmationPageComponent,
    AddressStepComponent,
    GuestAddressFormComponent,
    SavedAddressPickerComponent,
    ShippingStepComponent,
    ReviewStepComponent,
    PaymentMethodSelectorComponent,
    CheckoutSummarySidebarComponent
  ],
  imports: [
    CommonModule,
    CheckoutRoutingModule,
    SelectModule,
    SharedModule
  ]
})
export class CheckoutModule { }
