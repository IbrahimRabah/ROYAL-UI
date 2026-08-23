import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { adminGuard } from '../../core/guards/admin.guard';

// The parent 'admin' route (app-routing.module.ts) already carries canActivate +
// canActivateChild, and canActivateChild cascades to every descendant including these
// lazy-loaded children — this wrapper re-applies both locally too, so this module stays
// self-defending even if the parent route is ever restructured.
const routes: Routes = [
  {
    path: '',
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule) },
      { path: 'products', loadChildren: () => import('./products/products.module').then(m => m.ProductsModule) },
      // No path segment of its own — its own routes (categories/brands/attributes) mount
      // directly under /admin, per the task's literal /admin/categories, /admin/brands,
      // /admin/attributes (not /admin/taxonomy/...). "taxonomy" is just this module's
      // internal/organizational name.
      { path: '', loadChildren: () => import('./taxonomy/taxonomy.module').then(m => m.TaxonomyModule) },
      { path: 'inventory', loadChildren: () => import('./inventory/inventory.module').then(m => m.InventoryModule) },
      { path: 'orders', loadChildren: () => import('./orders/orders.module').then(m => m.OrdersModule) },
      { path: 'invoices', loadChildren: () => import('./invoices/invoices.module').then(m => m.InvoicesModule) },
      { path: 'remittances', loadChildren: () => import('./remittances/remittances.module').then(m => m.RemittancesModule) },
      { path: 'customers', loadChildren: () => import('./customers/customers.module').then(m => m.CustomersModule) },
      { path: 'shipping', loadChildren: () => import('./shipping/shipping.module').then(m => m.ShippingModule) },
      { path: 'exports', loadChildren: () => import('./exports/exports.module').then(m => m.ExportsModule) },
      { path: 'audit', loadChildren: () => import('./audit/audit.module').then(m => m.AuditModule) },
      { path: 'settings', loadChildren: () => import('./settings/settings.module').then(m => m.SettingsModule) }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
