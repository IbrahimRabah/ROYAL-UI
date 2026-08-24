import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { SharedModule } from '../../../shared/shared.module';
import { AdminSharedModule } from '../shared/admin-shared.module';

import { AuditRoutingModule } from './audit-routing.module';
import { AuditLogPageComponent } from './pages/audit-log-page/audit-log-page.component';
import { EntityHistoryPanelComponent } from './components/entity-history-panel/entity-history-panel.component';


@NgModule({
  declarations: [
    AuditLogPageComponent,
    EntityHistoryPanelComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    AuditRoutingModule,
    SharedModule,
    AdminSharedModule,
    TableModule,
    SelectModule,
    DatePickerModule
  ]
})
export class AuditModule { }
