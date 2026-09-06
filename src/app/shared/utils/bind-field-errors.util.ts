import { FormGroup } from '@angular/forms';

import { FieldError } from '../../core/models';
import { ValidationFailedError } from '../../core/interceptors/error.interceptor';

export function isValidationFailedError(err: unknown): err is ValidationFailedError {
  return typeof err === 'object' && err !== null && (err as { kind?: unknown }).kind === 'VALIDATION_FAILED';
}

export function bindServerFieldErrors(form: FormGroup, fieldErrors: FieldError[]): FieldError[] {
  const unmatched: FieldError[] = [];
  for (const fieldError of fieldErrors) {
    const control = form.get(fieldError.field);
    if (control) {
      control.setErrors({ server: true });
      control.markAsTouched();
    } else {
      unmatched.push(fieldError);
    }
  }
  return unmatched;
}
