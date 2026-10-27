import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule } from 'primeng/popover';

import { SharedModule } from '../shared/shared.module';
import { CustomerLayoutComponent } from './customer-layout/customer-layout.component';
import { AdminLayoutComponent } from './admin-layout/admin-layout.component';
import { SiteHeaderComponent } from './components/site-header/site-header.component';
import { SiteFooterComponent } from './components/site-footer/site-footer.component';
import { MainNavComponent } from './components/main-nav/main-nav.component';
import { MobileNavDrawerComponent } from './components/mobile-nav-drawer/mobile-nav-drawer.component';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { WhatsappFabComponent } from './components/whatsapp-fab/whatsapp-fab.component';
import { CartIconComponent } from './components/cart-icon/cart-icon.component';
import { UserMenuComponent } from './components/user-menu/user-menu.component';
import { AdminSidebarComponent } from './components/admin-sidebar/admin-sidebar.component';
import { AdminTopbarComponent } from './components/admin-topbar/admin-topbar.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { ForbiddenComponent } from './components/forbidden/forbidden.component';



@NgModule({
  declarations: [
    CustomerLayoutComponent,
    AdminLayoutComponent,
    SiteHeaderComponent,
    SiteFooterComponent,
    MainNavComponent,
    MobileNavDrawerComponent,
    SearchBarComponent,
    WhatsappFabComponent,
    CartIconComponent,
    UserMenuComponent,
    AdminSidebarComponent,
    AdminTopbarComponent,
    NotFoundComponent,
    ForbiddenComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    SharedModule,
    ButtonModule,
    InputTextModule,
    PopoverModule
  ],
  exports: [
    CustomerLayoutComponent,
    AdminLayoutComponent,
    NotFoundComponent,
    ForbiddenComponent
  ]
})
export class LayoutModule { }
