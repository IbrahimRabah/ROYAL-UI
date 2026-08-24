import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuditLogPageComponent } from './pages/audit-log-page/audit-log-page.component';
import { EntityHistoryPanelComponent } from './components/entity-history-panel/entity-history-panel.component';

const routes: Routes = [
  { path: '', component: AuditLogPageComponent },
  { path: ':entityType/:entityId', component: EntityHistoryPanelComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuditRoutingModule { }
