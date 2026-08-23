import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../shared/shared.module';
import { AdminSharedModule } from '../shared/admin-shared.module';

import { InvoicesRoutingModule } from './invoices-routing.module';
import { InvoiceListPageComponent } from './pages/invoice-list-page/invoice-list-page.component';
import { InvoiceDetailsPageComponent } from './pages/invoice-details-page/invoice-details-page.component';
import { UninvoicedReportPageComponent } from './pages/uninvoiced-report-page/uninvoiced-report-page.component';
import { IssueInvoiceDialogComponent } from './components/issue-invoice-dialog/issue-invoice-dialog.component';
import { CancelInvoiceDialogComponent } from './components/cancel-invoice-dialog/cancel-invoice-dialog.component';


@NgModule({
  declarations: [
    InvoiceListPageComponent,
    InvoiceDetailsPageComponent,
    UninvoicedReportPageComponent,
    IssueInvoiceDialogComponent,
    CancelInvoiceDialogComponent
  ],
  imports: [
    CommonModule,
    InvoicesRoutingModule,
    SharedModule,
    AdminSharedModule
  ]
})
export class InvoicesModule { }
