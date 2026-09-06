import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CheckoutPageComponent } from './pages/checkout-page/checkout-page.component';
import { OrderConfirmationPageComponent } from './pages/order-confirmation-page/order-confirmation-page.component';
import { checkoutReadyGuard } from '../../core/guards/checkout-ready.guard';

const routes: Routes = [
  { path: '', component: CheckoutPageComponent, canActivate: [checkoutReadyGuard] },
  { path: 'success/:orderNumber', component: OrderConfirmationPageComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CheckoutRoutingModule { }
