import { HttpErrorResponse } from '@angular/common/http';

import { ERROR_MESSAGES_AR, ERROR_MESSAGES_EN } from '../../core/constants/error-messages';
import { ErrorCode } from '../../core/enums/error-code';
import { Language } from '../../core/enums/language';
import { isApiError } from '../../core/models';
import { StockConflictError } from '../../core/interceptors/error.interceptor';
import { ToastService } from '../../core/services/toast.service';

export interface InventoryMutationErrorResult {
  // 409 NEGATIVE_STOCK / STOCK_BELOW_RESERVED — never a toast, the interceptor already
  // threw a StockConflictError instead of toasting. Show inline next to the figures and
  // keep the dialog open so the operator can correct the value.
  inlineMessage: string | null;
  // 409 CONCURRENT_STOCK_CHANGE, and the interceptor's automatic one-shot retry also
  // failed. The interceptor has ALREADY toasted this (with the exact "someone else
  // changed this stock" wording) — the dialog's only job is to close and refetch the row,
  // not show anything further itself.
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
      // Already toasted by ErrorInterceptor's fallback path.
      return { inlineMessage: null, staleConflict: true };
    }

    // Every other status is already toasted globally by ErrorInterceptor.
    return { inlineMessage: null, staleConflict: false };
  }

  toast.error(table[ErrorCode.INTERNAL_ERROR]);
  return { inlineMessage: null, staleConflict: false };
}
