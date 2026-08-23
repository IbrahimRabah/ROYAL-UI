import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { SelectAppendSelfDirective } from './directives/select-append-self.directive';
import { AdminBackLinkComponent } from './components/admin-back-link/admin-back-link.component';

// Import this in every admin feature module that uses p-select (see
// select-append-self.directive.ts for why this can't just live in the app-wide
// SharedModule) or that has a screen reached from a parent list needing
// <app-admin-back-link> (see admin-back-link.component.ts).
@NgModule({
  declarations: [SelectAppendSelfDirective, AdminBackLinkComponent],
  imports: [CommonModule, RouterModule, TranslateModule],
  exports: [SelectAppendSelfDirective, AdminBackLinkComponent]
})
export class AdminSharedModule { }
