import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';
import { TeamPageComponent } from './pages/team-page/team-page.component';

const routes: Routes = [{ path: '', component: TeamPageComponent }];

@NgModule({
  declarations: [TeamPageComponent],
  imports: [CommonModule, SharedModule, RouterModule.forChild(routes)],
})
export class TeamModule {}
