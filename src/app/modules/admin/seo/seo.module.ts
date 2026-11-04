import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';
import { SeoOverviewPageComponent } from './pages/seo-overview-page/seo-overview-page.component';
import { SeoMetaPageComponent } from './pages/seo-meta-page/seo-meta-page.component';
import { SeoPagesPageComponent } from './pages/seo-pages-page/seo-pages-page.component';
import { SeoFaqPageComponent } from './pages/seo-faq-page/seo-faq-page.component';

/** The SEO team's corner of the admin: health overview, meta texts, static pages and FAQs. */
const routes: Routes = [
  { path: '', component: SeoOverviewPageComponent },
  { path: 'meta', component: SeoMetaPageComponent },
  { path: 'pages', component: SeoPagesPageComponent },
  { path: 'faqs', component: SeoFaqPageComponent },
];

@NgModule({
  declarations: [SeoOverviewPageComponent, SeoMetaPageComponent, SeoPagesPageComponent, SeoFaqPageComponent],
  imports: [CommonModule, SharedModule, RouterModule.forChild(routes)],
})
export class SeoModule {}
