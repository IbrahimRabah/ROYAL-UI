import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { SharedModule } from '../../shared/shared.module';

import { HomeRoutingModule } from './home-routing.module';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { HeroBannerComponent } from './components/hero-banner/hero-banner.component';
import { CategoryShowcaseComponent } from './components/category-showcase/category-showcase.component';
import { FeaturedSectionComponent } from './components/featured-section/featured-section.component';
import { NewArrivalsSectionComponent } from './components/new-arrivals-section/new-arrivals-section.component';
import { CategoryBannerComponent } from './components/category-banner/category-banner.component';
import { PromoBannerComponent } from './components/promo-banner/promo-banner.component';
import { FurniturePageComponent } from './pages/furniture-page/furniture-page.component';


@NgModule({
  declarations: [
    HomePageComponent,
    HeroBannerComponent,
    CategoryShowcaseComponent,
    FeaturedSectionComponent,
    NewArrivalsSectionComponent,
    CategoryBannerComponent,
    PromoBannerComponent,
    FurniturePageComponent
  ],
  imports: [
    CommonModule,
    HomeRoutingModule,
    SharedModule,
    ButtonModule
  ]
})
export class HomeModule { }
