import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as string[];
  const currentUser = authService.currentUserValue;

  if (!currentUser) {
    router.navigate(['/auth/login']);
    return false;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    if (requiredRoles.includes(currentUser.role)) {
      return true;
    } else {
      // Redirect to appropriate dashboard based on user role
      switch (currentUser.role) {
        case 'admin':
          router.navigate(['/dashboard/admin']);
          break;
        case 'instructor':
          router.navigate(['/dashboard/instructor']);
          break;
        case 'student':
          router.navigate(['/dashboard/home']);
          break;
        default:
          router.navigate(['/auth/login']);
      }
      return false;
    }
  }

  return true;
};
