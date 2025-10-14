import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service'; // adjust path as needed

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Skip all HTTP calls during SSR/build time
    if (typeof window === 'undefined') {
      return next.handle(request);
    }

    // Get token from localStorage (only available in browser)
    const token = localStorage.getItem('token');

    // If token exists, add it to the request headers
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 errors (unauthorized)
        if (error.status === 401) {
          this.authService.logout();
          // Optionally redirect to login
        }
        return throwError(() => error);
      })
    );
  }
}
