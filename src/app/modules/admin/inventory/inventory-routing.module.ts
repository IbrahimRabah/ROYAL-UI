import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InventoryListPageComponent } from './pages/inventory-list-page/inventory-list-page.component';
import { MovementsLogPageComponent } from './pages/movements-log-page/movements-log-page.component';

// low-stock is deliberately NOT a separate page component — it's InventoryListPageComponent
// with lowStockOnly pre-applied via route data, so the two screens can never drift out of
// sync. See InventoryListPageComponent's `isLowStockRoute`.
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
