import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

import { ConfirmDialogService } from '../services/confirm-dialog.service';

export interface CanComponentDeactivate {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = (component) => {
  if (!component.hasUnsavedChanges()) {
    return true;
  }

  const confirmDialog = inject(ConfirmDialogService);
  const result: Observable<boolean> = confirmDialog.confirm({
    title: 'تغييرات غير محفوظة',
    message: 'لديك تغييرات لم يتم حفظها. هل تريد المغادرة بدون حفظ؟',
    confirmLabel: 'مغادرة بدون حفظ',
    cancelLabel: 'البقاء',
    danger: true,
  });
  return result;
};
