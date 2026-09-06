import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-shipping-step',
  templateUrl: './shipping-step.component.html',
  styleUrl: './shipping-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShippingStepComponent {}
