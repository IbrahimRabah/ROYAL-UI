import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ColorPickerModule } from 'primeng/colorpicker';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { SharedModule } from '../../../shared/shared.module';
import { AdminSharedModule } from '../shared/admin-shared.module';

import { TaxonomyRoutingModule } from './taxonomy-routing.module';
import { CategoryTreePageComponent } from './pages/category-tree-page/category-tree-page.component';
import { BrandListPageComponent } from './pages/brand-list-page/brand-list-page.component';
import { AttributeListPageComponent } from './pages/attribute-list-page/attribute-list-page.component';
import { AttributeFormPageComponent } from './pages/attribute-form-page/attribute-form-page.component';
import { CategoryFormDialogComponent } from './components/category-form-dialog/category-form-dialog.component';
import { BrandFormDialogComponent } from './components/brand-form-dialog/brand-form-dialog.component';
import { AttributeValuesEditorComponent } from './components/attribute-values-editor/attribute-values-editor.component';


@NgModule({
  declarations: [
    CategoryTreePageComponent,
    BrandListPageComponent,
    AttributeListPageComponent,
    AttributeFormPageComponent,
    CategoryFormDialogComponent,
    BrandFormDialogComponent,
    AttributeValuesEditorComponent
  ],
  imports: [
    CommonModule,
    TaxonomyRoutingModule,
    SharedModule,
    AdminSharedModule,
    DragDropModule,
    TableModule,
    SelectModule,
    InputNumberModule,
    ColorPickerModule,
    PopoverModule,
    TooltipModule
  ]
})
export class TaxonomyModule { }
