import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountLayoutComponent } from './components/account-layout/account-layout.component';
import { ProfilePageComponent } from './pages/profile-page/profile-page.component';
import { AddressesPageComponent } from './pages/addresses-page/addresses-page.component';
import { OrdersPageComponent } from './pages/orders-page/orders-page.component';
import { OrderDetailsPageComponent } from './pages/order-details-page/order-details-page.component';

const routes: Routes = [
  {
    path: '',
    component: AccountLayoutComponent,
    children: [
      { path: 'profile', component: ProfilePageComponent },
      { path: 'addresses', component: AddressesPageComponent },
      { path: 'orders', component: OrdersPageComponent },
      { path: 'orders/:id', component: OrderDetailsPageComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AccountRoutingModule { }
