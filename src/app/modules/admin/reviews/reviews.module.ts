import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';
import { ReviewListPageComponent } from './pages/review-list-page/review-list-page.component';

const routes: Routes = [{ path: '', component: ReviewListPageComponent }];

@NgModule({
  declarations: [ReviewListPageComponent],
  imports: [CommonModule, SharedModule, RouterModule.forChild(routes)],
})
export class ReviewsModule {}
