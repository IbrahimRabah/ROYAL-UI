import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { SharedModule } from '../../../shared/shared.module';
import { AdminSharedModule } from '../shared/admin-shared.module';

import { RemittancesRoutingModule } from './remittances-routing.module';
import { OutstandingPageComponent } from './pages/outstanding-page/outstanding-page.component';
import { RemittanceListPageComponent } from './pages/remittance-list-page/remittance-list-page.component';
import { RemittanceDetailsPageComponent } from './pages/remittance-details-page/remittance-details-page.component';
import { RemittanceFormPageComponent } from './pages/remittance-form-page/remittance-form-page.component';


@NgModule({
  declarations: [
    OutstandingPageComponent,
    RemittanceListPageComponent,
    RemittanceDetailsPageComponent,
    RemittanceFormPageComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RemittancesRoutingModule,
    SharedModule,
    AdminSharedModule,
    TableModule,
    SelectModule,
    DatePickerModule,
    InputNumberModule
  ]
})
export class RemittancesModule { }
