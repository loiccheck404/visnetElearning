import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Specific routes with dynamic parameters - use Server mode
  {
    path: 'courses/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'dashboard/courses/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'dashboard/instructor/courses/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'dashboard/instructor/students/profile/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'dashboard/admin/courses/:id',
    renderMode: RenderMode.Server,
  },
  // All other routes can be prerendered
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
