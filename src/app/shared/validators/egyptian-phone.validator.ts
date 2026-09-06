import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const EGYPT_MOBILE_LOCAL = /^01[0125]\d{8}$/;
const EGYPT_MOBILE_INTL = /^(?:\+20|0020)1[0125]\d{8}$/;

export function isEgyptianPhone(value: string): boolean {
  const normalized = value.trim().replace(/[\s-]/g, '');
  return EGYPT_MOBILE_LOCAL.test(normalized) || EGYPT_MOBILE_INTL.test(normalized);
}

export function egyptianPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;
    if (!value) {
      return null;
    }
    return isEgyptianPhone(value) ? null : { egyptianPhone: true };
  };
}
