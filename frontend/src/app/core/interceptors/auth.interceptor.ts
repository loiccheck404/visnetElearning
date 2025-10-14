import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip HTTP calls during SSR/build time
  if (typeof window === 'undefined') {
    return next(req);
  }

  const authService = inject(AuthService);
  const token = authService.tokenValue;

  if (token && authService.isAuthenticated) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(authReq);
  }

  return next(req);
};
