import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStoreService } from '../state/auth-store.service';


export const guestOnlyGuard: CanActivateFn = () => {
  const authStore = inject(AuthStoreService);
  const router = inject(Router);

  return authStore.isLoggedIn() ? router.createUrlTree(['/']) : true;
};
