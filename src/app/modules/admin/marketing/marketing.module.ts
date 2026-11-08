import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';
import { DiscountsPageComponent } from './pages/discounts-page/discounts-page.component';
import { AnnouncementsPageComponent } from './pages/announcements-page/announcements-page.component';

/** Marketing: sale discounts with banners, and the announcement bar. Administrators only. */
const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'discounts' },
  { path: 'discounts', component: DiscountsPageComponent },
  { path: 'announcements', component: AnnouncementsPageComponent },
];

@NgModule({
  declarations: [DiscountsPageComponent, AnnouncementsPageComponent],
  imports: [CommonModule, SharedModule, RouterModule.forChild(routes)],
})
export class MarketingModule {}
