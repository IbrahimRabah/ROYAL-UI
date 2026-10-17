import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { CustomRequestPageComponent } from './pages/custom-request-page/custom-request-page.component';

const routes: Routes = [{ path: '', component: CustomRequestPageComponent }];

@NgModule({
  declarations: [CustomRequestPageComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedModule, RouterModule.forChild(routes)],
})
export class CustomRequestModule { }
