import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { FurniturePageComponent } from './pages/furniture-page/furniture-page.component';

const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'furniture', component: FurniturePageComponent, data: { seoKey: 'PRODUCTS' } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomeRoutingModule { }
