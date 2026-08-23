import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../shared/shared.module';
import { AdminSharedModule } from '../shared/admin-shared.module';

import { CustomersRoutingModule } from './customers-routing.module';
import { CustomerListPageComponent } from './pages/customer-list-page/customer-list-page.component';
import { CustomerDetailsPageComponent } from './pages/customer-details-page/customer-details-page.component';
import { CustomerOrdersTabComponent } from './components/customer-orders-tab/customer-orders-tab.component';
import { FailedOrdersWarningComponent } from './components/failed-orders-warning/failed-orders-warning.component';


@NgModule({
  declarations: [
    CustomerListPageComponent,
    CustomerDetailsPageComponent,
    CustomerOrdersTabComponent,
    FailedOrdersWarningComponent
  ],
  imports: [
    CommonModule,
    CustomersRoutingModule,
    SharedModule,
    AdminSharedModule
  ]
})
export class CustomersModule { }
