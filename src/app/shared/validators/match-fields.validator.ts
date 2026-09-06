import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
export function matchFieldsValidator(controlName: string, matchingControlName: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const control = group.get(controlName);
    const matchingControl = group.get(matchingControlName);
    if (!control || !matchingControl) {
      return null;
    }

    if (matchingControl.errors && !matchingControl.errors['mismatch']) {
      return null;
    }

    if (control.value !== matchingControl.value) {
      matchingControl.setErrors({ ...matchingControl.errors, mismatch: true });
    } else if (matchingControl.errors) {
      const { mismatch, ...rest } = matchingControl.errors;
      matchingControl.setErrors(Object.keys(rest).length ? rest : null);
    }

    return null;
  };
}
