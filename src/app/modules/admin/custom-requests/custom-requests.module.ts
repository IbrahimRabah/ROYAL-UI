import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../../shared/shared.module';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { RequestActionDialogComponent } from './components/request-action-dialog/request-action-dialog.component';
import { RequestDetailPageComponent } from './pages/request-detail-page/request-detail-page.component';
import { RequestListPageComponent } from './pages/request-list-page/request-list-page.component';

const routes: Routes = [
  { path: '', component: RequestListPageComponent },
  { path: ':id', component: RequestDetailPageComponent },
];

@NgModule({
  declarations: [RequestListPageComponent, RequestDetailPageComponent, RequestActionDialogComponent],
  imports: [CommonModule, FormsModule, RouterModule.forChild(routes), SharedModule, AdminSharedModule],
})
export class CustomRequestsModule {}
