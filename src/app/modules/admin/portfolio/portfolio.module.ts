import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { PopoverModule } from 'primeng/popover';

import { unsavedChangesGuard } from '../../../core/guards/unsaved-changes.guard';
import { SharedModule } from '../../../shared/shared.module';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { PortfolioImagesPanelComponent } from './components/portfolio-images-panel/portfolio-images-panel.component';
import { PortfolioFormPageComponent } from './pages/portfolio-form-page/portfolio-form-page.component';
import { PortfolioListPageComponent } from './pages/portfolio-list-page/portfolio-list-page.component';

const routes: Routes = [
  { path: '', component: PortfolioListPageComponent },
  { path: 'new', component: PortfolioFormPageComponent, canDeactivate: [unsavedChangesGuard] },
  { path: ':id', component: PortfolioFormPageComponent, canDeactivate: [unsavedChangesGuard] },
];

@NgModule({
  declarations: [PortfolioListPageComponent, PortfolioFormPageComponent, PortfolioImagesPanelComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    PopoverModule,
    RouterModule.forChild(routes),
    SharedModule,
    AdminSharedModule,
  ],
})
export class PortfolioModule {}
