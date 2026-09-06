import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InventoryListPageComponent } from './pages/inventory-list-page/inventory-list-page.component';
import { MovementsLogPageComponent } from './pages/movements-log-page/movements-log-page.component';

const routes: Routes = [
  { path: '', component: InventoryListPageComponent },
  { path: 'low-stock', component: InventoryListPageComponent, data: { lowStockOnly: true } },
  { path: 'movements', component: MovementsLogPageComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InventoryRoutingModule { }
