import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { PortfolioListPageComponent } from './pages/portfolio-list-page/portfolio-list-page.component';
import { PortfolioDetailPageComponent } from './pages/portfolio-detail-page/portfolio-detail-page.component';

const routes: Routes = [
  { path: '', component: PortfolioListPageComponent },
  { path: ':slug', component: PortfolioDetailPageComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PortfolioRoutingModule { }
