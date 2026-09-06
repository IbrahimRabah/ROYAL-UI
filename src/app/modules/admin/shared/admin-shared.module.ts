import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { SelectAppendSelfDirective } from './directives/select-append-self.directive';
import { AdminBackLinkComponent } from './components/admin-back-link/admin-back-link.component';

@NgModule({
  declarations: [SelectAppendSelfDirective, AdminBackLinkComponent],
  imports: [CommonModule, RouterModule, TranslateModule],
  exports: [SelectAppendSelfDirective, AdminBackLinkComponent]
})
export class AdminSharedModule { }
