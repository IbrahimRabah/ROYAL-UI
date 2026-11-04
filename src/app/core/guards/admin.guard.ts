import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStoreService } from '../state/auth-store.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStoreService);
  const router = inject(Router);

  if (authStore.isAdmin()) {
    return true;
  }

  // The SEO team has its own corner of the admin; anywhere else is sent back to it.
  if (authStore.isSeoEditor()) {
    return state.url.startsWith('/admin/seo') ? true : router.createUrlTree(['/admin/seo']);
  }

  if (!authStore.isLoggedIn()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }

  return router.createUrlTree(['/403']);
};
