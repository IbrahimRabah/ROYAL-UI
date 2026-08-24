import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { SharedModule } from '../../../shared/shared.module';
import { AdminSharedModule } from '../shared/admin-shared.module';

import { ExportsRoutingModule } from './exports-routing.module';
import { ExportPageComponent } from './pages/export-page/export-page.component';
import { ExportFiltersFormComponent } from './components/export-filters-form/export-filters-form.component';


@NgModule({
  declarations: [
    ExportPageComponent,
    ExportFiltersFormComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ExportsRoutingModule,
    SharedModule,
    AdminSharedModule,
    SelectModule,
    DatePickerModule
  ]
})
export class ExportsModule { }
