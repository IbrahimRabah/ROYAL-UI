import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
export function passwordStrengthScore(password: string): number {
  if (!password) {
    return 0;
  }
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return score;
}

export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;
    if (!value || value.length < 8) {
      return null;
    }
    return passwordStrengthScore(value) >= 2 ? null : { weakPassword: true };
  };
}
