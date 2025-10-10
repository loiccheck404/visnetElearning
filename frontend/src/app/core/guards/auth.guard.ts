import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check authentication synchronously
  const isAuth = authService.isAuthenticated;

  if (isAuth) {
    return true;
  }

  // Store the attempted URL for redirecting after login
  router.navigate(['/auth/login'], {
    queryParams: { returnUrl: state.url },
    replaceUrl: true,
  });
  return false;
};
