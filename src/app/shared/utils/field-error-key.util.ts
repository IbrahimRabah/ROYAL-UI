import { AbstractControl } from '@angular/forms';

export function getFieldErrorKey(control: AbstractControl | null): string | null {
  if (!control || !control.errors || !(control.touched || control.dirty)) {
    return null;
  }
  const errors = control.errors;
  if (errors['required']) return 'auth.errors.required';
  if (errors['email']) return 'auth.errors.emailInvalid';
  if (errors['identifier']) return 'auth.errors.identifierInvalid';
  if (errors['egyptianPhone']) return 'auth.errors.phoneInvalid';
  if (errors['notServed']) return 'checkout.errors.governorateNotServed';
  if (errors['minlength']) return 'auth.errors.passwordMinLength';
  if (errors['maxlength']) return 'auth.errors.passwordMaxLength';
  if (errors['weakPassword']) return 'auth.errors.weakPassword';
  if (errors['mismatch']) return 'auth.errors.passwordMismatch';
  if (errors['server']) return 'auth.errors.genericField';
  return 'auth.errors.genericField';
}
