import { NgModule } from '@angular/core';

import { SelectAppendSelfDirective } from './directives/select-append-self.directive';

// Import this in every admin feature module that uses p-select — see
// select-append-self.directive.ts for why this can't just live in the app-wide
// SharedModule (it would also force appendTo="self" on the storefront's p-select usages,
// which is out of this fix's scope and unverified).
@NgModule({
  declarations: [SelectAppendSelfDirective],
  exports: [SelectAppendSelfDirective]
})
export class AdminSharedModule { }
