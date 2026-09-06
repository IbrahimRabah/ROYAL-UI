import { HttpErrorResponse } from '@angular/common/http';

import { ERROR_MESSAGES_AR, ERROR_MESSAGES_EN } from '../../core/constants/error-messages';
import { ErrorCode } from '../../core/enums/error-code';
import { Language } from '../../core/enums/language';
import { isApiError } from '../../core/models';
import { StockConflictError } from '../../core/interceptors/error.interceptor';
import { ToastService } from '../../core/services/toast.service';

export interface InventoryMutationErrorResult {
  inlineMessage: string | null;
  staleConflict: boolean;
}

/**
 * Central error handling for the two inventory write dialogs (receive, adjust). Mirrors
 * handleAdminMutationError's shape/spirit but for inventory's distinct pair of special
 * cases — kept separate rather than widened into that util since the two domains' codes
 * and required caller behaviour (refetch-and-close vs. stay-open-and-correct) don't overlap.
 */
export function handleInventoryMutationError(err: unknown, toast: ToastService, lang: Language): InventoryMutationErrorResult {
  const table = lang === Language.AR ? ERROR_MESSAGES_AR : ERROR_MESSAGES_EN;

  if (err && typeof err === 'object' && (err as Partial<StockConflictError>).kind === 'STOCK_CONFLICT') {
    return { inlineMessage: (err as StockConflictError).message, staleConflict: false };
  }

  if (err instanceof HttpErrorResponse) {
    const apiError = isApiError(err.error) ? err.error : undefined;

    if (err.status === 409 && apiError?.code === ErrorCode.CONCURRENT_STOCK_CHANGE) {
      return { inlineMessage: null, staleConflict: true };
    }

    return { inlineMessage: null, staleConflict: false };
  }

  toast.error(table[ErrorCode.INTERNAL_ERROR]);
  return { inlineMessage: null, staleConflict: false };
}
