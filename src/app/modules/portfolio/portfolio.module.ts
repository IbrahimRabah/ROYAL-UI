import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

import { SharedModule } from '../../shared/shared.module';
import { PortfolioRoutingModule } from './portfolio-routing.module';
import { PortfolioListPageComponent } from './pages/portfolio-list-page/portfolio-list-page.component';
import { PortfolioDetailPageComponent } from './pages/portfolio-detail-page/portfolio-detail-page.component';
import { RevealDirective } from './directives/reveal.directive';

@NgModule({
  declarations: [PortfolioListPageComponent, PortfolioDetailPageComponent, RevealDirective],
  imports: [CommonModule, PortfolioRoutingModule, SharedModule, ButtonModule],
})
export class PortfolioModule { }
