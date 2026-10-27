import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';

import { AccountRoutingModule } from './account-routing.module';
import { AccountLayoutComponent } from './components/account-layout/account-layout.component';
import { ProfilePageComponent } from './pages/profile-page/profile-page.component';
import { AddressesPageComponent } from './pages/addresses-page/addresses-page.component';
import { OrdersPageComponent } from './pages/orders-page/orders-page.component';
import { OrderDetailsPageComponent } from './pages/order-details-page/order-details-page.component';
import { CustomRequestsPageComponent } from './pages/custom-requests-page/custom-requests-page.component';
import { CustomRequestDetailsPageComponent } from './pages/custom-request-details-page/custom-request-details-page.component';
import { AddressCardComponent } from './components/address-card/address-card.component';
import { AddressFormDialogComponent } from './components/address-form-dialog/address-form-dialog.component';
import { OrderTimelineComponent } from './components/order-timeline/order-timeline.component';
import { OrderItemsListComponent } from './components/order-items-list/order-items-list.component';
import { CancelOrderDialogComponent } from './components/cancel-order-dialog/cancel-order-dialog.component';
import { InvoiceDownloadButtonComponent } from './components/invoice-download-button/invoice-download-button.component';
import { SessionsPanelComponent } from './components/sessions-panel/sessions-panel.component';


@NgModule({
  declarations: [
    AccountLayoutComponent,
    ProfilePageComponent,
    AddressesPageComponent,
    OrdersPageComponent,
    OrderDetailsPageComponent,
    CustomRequestsPageComponent,
    CustomRequestDetailsPageComponent,
    AddressCardComponent,
    AddressFormDialogComponent,
    OrderTimelineComponent,
    OrderItemsListComponent,
    CancelOrderDialogComponent,
    InvoiceDownloadButtonComponent,
    SessionsPanelComponent
  ],
  imports: [
    CommonModule,
    AccountRoutingModule,
    SharedModule
  ]
})
export class AccountModule { }
