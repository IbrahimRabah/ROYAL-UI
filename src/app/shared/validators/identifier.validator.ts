import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { isEgyptianPhone } from './egyptian-phone.validator';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function identifierValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value as string | null)?.trim();
    if (!value) {
      return null;
    }
    return EMAIL_SHAPE.test(value) || isEgyptianPhone(value) ? null : { identifier: true };
  };
}
