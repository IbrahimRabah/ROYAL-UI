import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { SharedModule } from '../../../shared/shared.module';

import { ShippingRoutingModule } from './shipping-routing.module';
import { ZonesPageComponent } from './pages/zones-page/zones-page.component';
import { RatesFormComponent } from './components/rates-form/rates-form.component';


@NgModule({
  declarations: [
    ZonesPageComponent,
    RatesFormComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ShippingRoutingModule,
    SharedModule,
    InputNumberModule
  ]
})
export class ShippingModule { }
