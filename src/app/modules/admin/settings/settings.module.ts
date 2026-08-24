import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../../shared/shared.module';

import { SettingsRoutingModule } from './settings-routing.module';
import { StoreProfilePageComponent } from './pages/store-profile-page/store-profile-page.component';
import { MissingFieldsBannerComponent } from './components/missing-fields-banner/missing-fields-banner.component';


@NgModule({
  declarations: [
    StoreProfilePageComponent,
    MissingFieldsBannerComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    SettingsRoutingModule,
    SharedModule
  ]
})
export class SettingsModule { }
