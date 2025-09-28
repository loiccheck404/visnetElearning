import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Default redirect to login
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },

  // Auth routes (public) - only include existing components
  {
    path: 'auth/login',
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./auth/register/register.component').then((m) => m.RegisterComponent),
  },

  // Temporary dashboard route - using login component until you create dashboard
  {
    path: 'dashboard',
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [authGuard],
  },

  // Wildcard route - should be last
  { path: '**', redirectTo: '/auth/login' },
];
