import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePickerModule } from 'primeng/datepicker';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { SharedModule } from '../../../shared/shared.module';
import { AdminSharedModule } from '../shared/admin-shared.module';

import { InventoryRoutingModule } from './inventory-routing.module';
import { InventoryListPageComponent } from './pages/inventory-list-page/inventory-list-page.component';
import { MovementsLogPageComponent } from './pages/movements-log-page/movements-log-page.component';
import { ReceiveStockDialogComponent } from './components/receive-stock-dialog/receive-stock-dialog.component';
import { AdjustStockDialogComponent } from './components/adjust-stock-dialog/adjust-stock-dialog.component';
import { StockNumbersCardComponent } from './components/stock-numbers-card/stock-numbers-card.component';


@NgModule({
  declarations: [
    InventoryListPageComponent,
    MovementsLogPageComponent,
    ReceiveStockDialogComponent,
    AdjustStockDialogComponent,
    StockNumbersCardComponent
  ],
  imports: [
    CommonModule,
    InventoryRoutingModule,
    SharedModule,
    AdminSharedModule,
    TableModule,
    SelectModule,
    InputNumberModule,
    DatePickerModule,
    PopoverModule,
    TooltipModule
  ]
})
export class InventoryModule { }
