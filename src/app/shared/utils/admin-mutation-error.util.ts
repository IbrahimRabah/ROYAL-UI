import { HttpErrorResponse } from '@angular/common/http';

import { ERROR_MESSAGES_AR, ERROR_MESSAGES_EN } from '../../core/constants/error-messages';
import { ErrorCode } from '../../core/enums/error-code';
import { Language } from '../../core/enums/language';
import { isApiError } from '../../core/models';
import { ValidationFailedError } from '../../core/interceptors/error.interceptor';
import { ToastService } from '../../core/services/toast.service';

export interface AdminMutationErrorResult {

  isConflict: boolean;
  message: string | null;
  fieldError: string | null;
}

export function handleAdminMutationError(err: unknown, toast: ToastService, lang: Language): AdminMutationErrorResult {
  const table = lang === Language.AR ? ERROR_MESSAGES_AR : ERROR_MESSAGES_EN;

  if (err && typeof err === 'object' && (err as Partial<ValidationFailedError>).kind === 'VALIDATION_FAILED') {
    const validationError = err as ValidationFailedError;
    const fieldError = validationError.fieldErrors[0]?.message || validationError.message;
    return { isConflict: false, message: null, fieldError };
  }

  if (err instanceof HttpErrorResponse) {
    const apiError = isApiError(err.error) ? err.error : undefined;

    if (err.status === 409 && apiError?.code === ErrorCode.INVALID_STATUS_TRANSITION) {
      return { isConflict: true, message: table[ErrorCode.INVALID_STATUS_TRANSITION], fieldError: null };
    }

    toast.error(apiError?.code ? table[apiError.code] : table[ErrorCode.INTERNAL_ERROR]);
    return { isConflict: false, message: null, fieldError: null };
  }

  toast.error(table[ErrorCode.INTERNAL_ERROR]);
  return { isConflict: false, message: null, fieldError: null };
}
