import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CustomerLayoutComponent } from './layout/customer-layout/customer-layout.component';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';
import { NotFoundComponent } from './layout/components/not-found/not-found.component';
import { ForbiddenComponent } from './layout/components/forbidden/forbidden.component';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: CustomerLayoutComponent,
    children: [
      { path: '', loadChildren: () => import('./modules/home/home.module').then(m => m.HomeModule) },
      { path: 'products', loadChildren: () => import('./modules/catalog/catalog.module').then(m => m.CatalogModule) },
      { path: 'cart', loadChildren: () => import('./modules/cart/cart.module').then(m => m.CartModule) },
      { path: 'checkout', loadChildren: () => import('./modules/checkout/checkout.module').then(m => m.CheckoutModule) },
      { path: 'about', loadChildren: () => import('./modules/about/about.module').then(m => m.AboutModule) },
      { path: 'contact', loadChildren: () => import('./modules/contact/contact.module').then(m => m.ContactModule) },
      { path: 'auth', loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule) },
      {
        path: 'me',
        canActivateChild: [authGuard],
        loadChildren: () => import('./modules/account/account.module').then(m => m.AccountModule)
      }
    ]
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    loadChildren: () => import('./modules/admin/admin.module').then(m => m.AdminModule)
  },
  { path: '403', component: ForbiddenComponent },
  { path: '**', component: NotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'disabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
