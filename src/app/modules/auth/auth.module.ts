import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';

import { AuthRoutingModule } from './auth-routing.module';
import { AuthLayoutComponent } from './components/auth-layout/auth-layout.component';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { RegisterPageComponent } from './pages/register-page/register-page.component';
import { ForgotPasswordPageComponent } from './pages/forgot-password-page/forgot-password-page.component';
import { ResetPasswordPageComponent } from './pages/reset-password-page/reset-password-page.component';
import { OtpVerifyPageComponent } from './pages/otp-verify-page/otp-verify-page.component';
import { PasswordStrengthMeterComponent } from './components/password-strength-meter/password-strength-meter.component';
import { AuthOrnamentComponent } from './components/auth-ornament/auth-ornament.component';


@NgModule({
  declarations: [
    AuthLayoutComponent,
    LoginPageComponent,
    RegisterPageComponent,
    ForgotPasswordPageComponent,
    ResetPasswordPageComponent,
    OtpVerifyPageComponent,
    PasswordStrengthMeterComponent,
    AuthOrnamentComponent
  ],
  imports: [
    CommonModule,
    AuthRoutingModule,
    SharedModule
  ]
})
export class AuthModule { }
