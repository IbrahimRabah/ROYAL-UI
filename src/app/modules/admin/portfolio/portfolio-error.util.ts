import { HttpErrorResponse } from '@angular/common/http';

import { ERROR_MESSAGES_AR, ERROR_MESSAGES_EN } from '../../../core/constants/error-messages';
import { ErrorCode } from '../../../core/enums/error-code';
import { Language } from '../../../core/enums/language';
import { FieldError, isApiError } from '../../../core/models';

export interface ParsedApiError {
  code: ErrorCode | null;
  fieldErrors: FieldError[];
}

/**
 * Portfolio calls suppress the global error toast so conflicts can be answered inline
 * (slug field, archived notice) — so the raw HttpErrorResponse arrives here.
 */
export function parseApiError(err: unknown): ParsedApiError {
  if (err instanceof HttpErrorResponse && isApiError(err.error)) {
    return { code: err.error.code, fieldErrors: err.error.errors ?? [] };
  }
  return { code: null, fieldErrors: [] };
}

export function errorMessageFor(parsed: ParsedApiError, lang: Language): string {
  const table = lang === Language.EN ? ERROR_MESSAGES_EN : ERROR_MESSAGES_AR;
  return table[parsed.code ?? ErrorCode.INTERNAL_ERROR] ?? table[ErrorCode.INTERNAL_ERROR];
}
