import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/role.guard';

export const routes: Routes = [
  // Default redirect to login
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },

  // Auth routes (public)
  {
    path: 'auth/login',
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./auth/register/register.component').then((m) => m.RegisterComponent),
  },

  {
    path: 'courses',
    loadComponent: () =>
      import('./courses/course-list/course-list.component').then((m) => m.CourseListComponent),
  },

  {
    path: 'courses/:id',
    loadComponent: () =>
      import('./courses/course-detail/course-detail.component').then(
        (m) => m.CourseDetailComponent
      ),
  },

  // Dashboard routes
  {
    path: 'dashboard',
    canActivate: [authGuard],
    children: [
      // Student Dashboard (home)
      {
        path: 'home',
        loadComponent: () => import('./dashboard/home/home.component').then((m) => m.HomeComponent),
        canActivate: [roleGuard],
        data: { roles: ['student'] },
      },
      {
        path: 'courses',
        loadComponent: () =>
          import('./courses/course-list/course-list.component').then((m) => m.CourseListComponent),
        canActivate: [roleGuard],
        data: { roles: ['student'] },
      },
      {
        path: 'courses/:id',
        loadComponent: () =>
          import('./courses/course-detail/course-detail.component').then(
            (m) => m.CourseDetailComponent
          ),
        canActivate: [roleGuard],
        data: { roles: ['student'] },
      },
      {
        path: 'progress',
        loadComponent: () =>
          import('./dashboard/progress/progress.component').then((m) => m.ProgressComponent),
        canActivate: [roleGuard],
        data: { roles: ['student'] },
      },

      // Instructor Dashboard
      {
        path: 'instructor',
        loadComponent: () =>
          import('./dashboard/instructor/instructor-dashboard.component').then(
            (m) => m.InstructorDashboardComponent
          ),
        canActivate: [roleGuard],
        data: { roles: ['instructor'] },
      },
      {
        path: 'instructor/courses',
        loadComponent: () =>
          import('./courses/course-list/course-list.component').then((m) => m.CourseListComponent), // Changed this
        canActivate: [roleGuard],
        data: { roles: ['instructor'] },
      },
      {
        path: 'instructor/courses/:id',
        loadComponent: () =>
          import('./courses/course-detail/course-detail.component').then(
            (m) => m.CourseDetailComponent
          ), // Add this
        canActivate: [roleGuard],
        data: { roles: ['instructor'] },
      },
      {
        path: 'instructor/students',
        loadComponent: () =>
          import('./dashboard/instructor/instructor-dashboard.component').then(
            (m) => m.InstructorDashboardComponent
          ),
        canActivate: [roleGuard],
        data: { roles: ['instructor'] },
      },
      {
        path: 'instructor/create-course',
        loadComponent: () =>
          import('./courses/course-create/course-create.component').then(
            (m) => m.CourseCreateComponent
          ),
        canActivate: [roleGuard],
        data: { roles: ['instructor'] },
      },

      // Admin Dashboard
      {
        path: 'admin',
        loadComponent: () =>
          import('./dashboard/admin/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
        //canActivate: [roleGuard],
        //data: { roles: ['admin'] },
      },
      {
        path: 'admin/users',
        loadComponent: () =>
          import('./dashboard/admin/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent
          ),
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'admin/courses',
        loadComponent: () =>
          import('./courses/course-list/course-list.component').then((m) => m.CourseListComponent), // Changed this
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },
      {
        path: 'admin/courses/:id',
        loadComponent: () =>
          import('./courses/course-detail/course-detail.component').then(
            (m) => m.CourseDetailComponent
          ), // Add this
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
      },

      // Profile (accessible by all authenticated users)
      {
        path: 'profile',
        loadComponent: () =>
          import('./dashboard/profile/profile.component').then((m) => m.ProfileComponent),
      },

      // Default redirect based on role
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },

  // Wildcard route - should be last
  { path: '**', redirectTo: '/auth/login' },
];
