import { NgModule } from '@angular/core';

import { SharedModule } from '../../shared/shared.module';
import { WishlistRoutingModule } from './wishlist-routing.module';
import { WishlistPageComponent } from './pages/wishlist-page/wishlist-page.component';

@NgModule({
  declarations: [WishlistPageComponent],
  imports: [SharedModule, WishlistRoutingModule]
})
export class WishlistModule { }
