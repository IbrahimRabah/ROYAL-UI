import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { ERROR_MESSAGES_AR, ERROR_MESSAGES_EN } from '../../../../core/constants/error-messages';
import { ErrorCode } from '../../../../core/enums/error-code';
import { Language } from '../../../../core/enums/language';
import { isApiError } from '../../../../core/models';
import { AuthApiService } from '../../../../core/services/api/auth-api.service';
import { LanguageStoreService } from '../../../../core/state/language-store.service';
import { bindServerFieldErrors, isValidationFailedError } from '../../../../shared/utils/bind-field-errors.util';
import { getFieldErrorKey } from '../../../../shared/utils/field-error-key.util';
import { identifierValidator } from '../../../../shared/validators/identifier.validator';
import { PostAuthService } from '../../services/post-auth.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly postAuth = inject(PostAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly languageStore = inject(LanguageStoreService);

  private readonly returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';

  readonly form = this.fb.nonNullable.group({
    identifier: ['', [Validators.required, identifierValidator()]],
    password: ['', Validators.required],
  });

  readonly loading = signal(false);
  readonly formError = signal<string | null>(null);
  readonly showPassword = signal(false);

  fieldError(name: 'identifier' | 'password'): string | null {
    return getFieldErrorKey(this.form.get(name));
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    if (this.loading()) {
      return;
    }
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { identifier, password } = this.form.getRawValue();
    this.authApi.login({ identifier, password }).subscribe({
      next: (auth) => this.postAuth.completeAuth(auth, this.returnUrl, 'login'),
      error: (err: unknown) => {
        this.loading.set(false);
        if (isValidationFailedError(err)) {
          bindServerFieldErrors(this.form, err.fieldErrors);
          return;
        }
        if (err instanceof HttpErrorResponse && isApiError(err.error) && err.error.code === ErrorCode.INVALID_CREDENTIALS) {
          this.formError.set(this.errorMessage(ErrorCode.INVALID_CREDENTIALS));
        }
      },
    });
  }

  private errorMessage(code: ErrorCode): string {
    const table = this.languageStore.lang() === Language.EN ? ERROR_MESSAGES_EN : ERROR_MESSAGES_AR;
    return table[code];
  }
}
