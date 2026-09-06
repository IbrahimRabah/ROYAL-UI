import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { RegisterRequest } from '../../../../core/models';
import { AuthApiService } from '../../../../core/services/api/auth-api.service';
import { LanguageStoreService } from '../../../../core/state/language-store.service';
import { bindServerFieldErrors, isValidationFailedError } from '../../../../shared/utils/bind-field-errors.util';
import { getFieldErrorKey } from '../../../../shared/utils/field-error-key.util';
import { egyptianPhoneValidator } from '../../../../shared/validators/egyptian-phone.validator';
import { strongPasswordValidator } from '../../../../shared/validators/strong-password.validator';
import { PostAuthService } from '../../services/post-auth.service';

type RegisterFieldName = 'firstName' | 'lastName' | 'phone' | 'email' | 'password';

@Component({
  selector: 'app-register-page',
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly postAuth = inject(PostAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly languageStore = inject(LanguageStoreService);

  private readonly returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', Validators.maxLength(100)],
    phone: ['', [Validators.required, egyptianPhoneValidator()]],
    email: ['', [Validators.email, Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72), strongPasswordValidator()]],
  });

  readonly loading = signal(false);
  readonly showPassword = signal(false);

  fieldError(name: RegisterFieldName): string | null {
    return getFieldErrorKey(this.form.get(name));
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    if (this.loading()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const raw = this.form.getRawValue();
    const payload: RegisterRequest = {
      firstName: raw.firstName,
      lastName: raw.lastName || undefined,
      phone: raw.phone,
      email: raw.email || undefined,
      password: raw.password,
      locale: this.languageStore.lang(),
    };

    this.authApi.register(payload).subscribe({
      next: (auth) => this.postAuth.completeAuth(auth, this.returnUrl, 'register'),
      error: (err: unknown) => {
        this.loading.set(false);
        if (isValidationFailedError(err)) {
          bindServerFieldErrors(this.form, err.fieldErrors);
        }
       
      },
    });
  }
}
