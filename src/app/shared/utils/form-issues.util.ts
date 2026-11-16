import { AbstractControl } from '@angular/forms';

import { getFieldErrorKey } from './field-error-key.util';

/** One invalid field, as listed in a form's error summary. */
export interface FormIssue {
  /** DOM id of the input, so the summary can link to it and move focus there. */
  id: string;
  /** Translation key of the field's label. */
  labelKey: string;
  /** Translation key of what is wrong with it. */
  errorKey: string;
}

export interface FormIssueField {
  id: string;
  labelKey: string;
  control: AbstractControl | null;
}

/** The invalid fields, in the order given (which should be the on-screen order). Call after marking all touched. */
export function collectFormIssues(fields: FormIssueField[]): FormIssue[] {
  const issues: FormIssue[] = [];
  for (const field of fields) {
    const errorKey = getFieldErrorKey(field.control);
    if (errorKey) {
      issues.push({ id: field.id, labelKey: field.labelKey, errorKey });
    }
  }
  return issues;
}

/** Moves keyboard focus to a field and brings it to the middle of the screen. Browser-only (call from a handler). */
export function focusFormField(doc: Document, id: string): void {
  const element = doc.getElementById(id);
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
