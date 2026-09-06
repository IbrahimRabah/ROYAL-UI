import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import { AuthApiService } from '../../../../core/services/api/auth-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { bindServerFieldErrors, isValidationFailedError } from '../../../../shared/utils/bind-field-errors.util';
import { getFieldErrorKey } from '../../../../shared/utils/field-error-key.util';
import { identifierValidator } from '../../../../shared/validators/identifier.validator';

@Component({
  selector: 'app-forgot-password-page',
  templateUrl: './forgot-password-page.component.html',
  styleUrl: './forgot-password-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly form = this.fb.nonNullable.group({
    identifier: ['', [Validators.required, identifierValidator()]],
  });

  readonly loading = signal(false);
  readonly submitted = signal(false);

  fieldError(): string | null {
    return getFieldErrorKey(this.form.get('identifier'));
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
    const { identifier } = this.form.getRawValue();
    this.authApi.forgotPassword({ identifier }).subscribe({
      next: () => {
        this.loading.set(false);
        this.submitted.set(true);
        this.toast.success(this.translate.instant('toast.auth.resetLinkSent'));
      },
      error: (err: unknown) => {
        this.loading.set(false);
        if (isValidationFailedError(err)) {
          bindServerFieldErrors(this.form, err.fieldErrors);
        }
      },
    });
  }
}
