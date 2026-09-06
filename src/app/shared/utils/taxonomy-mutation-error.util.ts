import { HttpErrorResponse } from '@angular/common/http';

import { ERROR_MESSAGES_AR, ERROR_MESSAGES_EN } from '../../core/constants/error-messages';
import { ErrorCode } from '../../core/enums/error-code';
import { Language } from '../../core/enums/language';
import { isApiError } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';

export interface TaxonomyMutationErrorResult {
  fieldErrors: Partial<Record<'code' | 'slug', string>>;
  inlineMessage: string | null;
}

export function handleTaxonomyMutationError(err: unknown, toast: ToastService, lang: Language): TaxonomyMutationErrorResult {
  const table = lang === Language.AR ? ERROR_MESSAGES_AR : ERROR_MESSAGES_EN;

  if (err instanceof HttpErrorResponse) {
    const apiError = isApiError(err.error) ? err.error : undefined;
    const code = apiError?.code;

    if (err.status === 409) {
      if (code === ErrorCode.ATTRIBUTE_CODE_EXISTS || code === ErrorCode.ATTRIBUTE_VALUE_CODE_EXISTS) {
        return { fieldErrors: { code: table[code] }, inlineMessage: null };
      }
      if (code === ErrorCode.SLUG_ALREADY_EXISTS || code === ErrorCode.BRAND_SLUG_EXISTS) {
        return { fieldErrors: { slug: table[code] }, inlineMessage: null };
      }
      if (code === ErrorCode.ATTRIBUTE_IN_USE || code === ErrorCode.CATEGORY_CYCLE || code === ErrorCode.CATEGORY_NOT_EMPTY) {
        return { fieldErrors: {}, inlineMessage: table[code] };
      }
    }

    toast.error(code ? table[code] : table[ErrorCode.INTERNAL_ERROR]);
    return { fieldErrors: {}, inlineMessage: null };
  }

  toast.error(table[ErrorCode.INTERNAL_ERROR]);
  return { fieldErrors: {}, inlineMessage: null };
}
