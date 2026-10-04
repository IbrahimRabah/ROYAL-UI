import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { adminGuard } from '../../core/guards/admin.guard';

const routes: Routes = [
  {
    path: '',
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule) },
      { path: 'products', loadChildren: () => import('./products/products.module').then(m => m.ProductsModule) },
      { path: 'custom-requests', loadChildren: () => import('./custom-requests/custom-requests.module').then(m => m.CustomRequestsModule) },
      { path: 'portfolio', loadChildren: () => import('./portfolio/portfolio.module').then(m => m.PortfolioModule) },
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
