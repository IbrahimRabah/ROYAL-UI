import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { RegisterPageComponent } from './pages/register-page/register-page.component';
import { ForgotPasswordPageComponent } from './pages/forgot-password-page/forgot-password-page.component';
import { ResetPasswordPageComponent } from './pages/reset-password-page/reset-password-page.component';
import { OtpVerifyPageComponent } from './pages/otp-verify-page/otp-verify-page.component';
import { guestOnlyGuard } from '../../core/guards/guest-only.guard';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginPageComponent, canActivate: [guestOnlyGuard] },
  { path: 'register', component: RegisterPageComponent, canActivate: [guestOnlyGuard] },
  { path: 'forgot-password', component: ForgotPasswordPageComponent },
  { path: 'reset-password', component: ResetPasswordPageComponent },
  { path: 'otp-verify', component: OtpVerifyPageComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule { }
