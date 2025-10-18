import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, Subject, of, throwError } from 'rxjs';
import { switchMap, takeUntil, catchError, startWith, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface PlatformStats {
  totalUsers: number;
  totalCourses: number;
  totalInstructors: number;
  totalStudents: number;
}

export interface RecentUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface Course {
  id: number;
  title: string;
  instructor_name: string;
  status: string;
  enrollment_count: number;
  created_at: string;
}

export interface Activity {
  id: number;
  type: string;
  action: string;
  user: string;
  courseName?: string;
  time: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  action: string;
  user: string;
  details: string;
  ip_address: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}`;
  private destroy$ = new Subject<void>();

  // Stats
  private statsSubject = new BehaviorSubject<PlatformStats>({
    totalUsers: 0,
    totalCourses: 0,
    totalInstructors: 0,
    totalStudents: 0,
  });
  public stats$ = this.statsSubject.asObservable();

  // Users
  private usersSubject = new BehaviorSubject<RecentUser[]>([]);
  public users$ = this.usersSubject.asObservable();
  private usersErrorSubject = new BehaviorSubject<string | null>(null);
  public usersError$ = this.usersErrorSubject.asObservable();

  // Courses
  private coursesSubject = new BehaviorSubject<Course[]>([]);
  public courses$ = this.coursesSubject.asObservable();
  private coursesErrorSubject = new BehaviorSubject<string | null>(null);
  public coursesError$ = this.coursesErrorSubject.asObservable();

  // Activities
  private activitiesSubject = new BehaviorSubject<Activity[]>([]);
  public activities$ = this.activitiesSubject.asObservable();
  private activitiesErrorSubject = new BehaviorSubject<string | null>(null);
  public activitiesError$ = this.activitiesErrorSubject.asObservable();

  // Audit Logs
  private auditLogsSubject = new BehaviorSubject<AuditLog[]>([]);
  public auditLogs$ = this.auditLogsSubject.asObservable();
  private auditLogsErrorSubject = new BehaviorSubject<string | null>(null);
  public auditLogsError$ = this.auditLogsErrorSubject.asObservable();

  // Loading states
  private statsLoadingSubject = new BehaviorSubject<boolean>(false);
  public statsLoading$ = this.statsLoadingSubject.asObservable();

  private usersLoadingSubject = new BehaviorSubject<boolean>(false);
  public usersLoading$ = this.usersLoadingSubject.asObservable();

  private coursesLoadingSubject = new BehaviorSubject<boolean>(false);
  public coursesLoading$ = this.coursesLoadingSubject.asObservable();

  private activitiesLoadingSubject = new BehaviorSubject<boolean>(false);
  public activitiesLoading$ = this.activitiesLoadingSubject.asObservable();

  private auditLogsLoadingSubject = new BehaviorSubject<boolean>(false);
  public auditLogsLoading$ = this.auditLogsLoadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Load all dashboard data
   */
  loadDashboardData(): void {
    this.loadPlatformStats();
    this.loadUsers();
    this.loadCourses();
    this.loadActivities();
    this.loadAuditLogs();
  }

  /**
   * Load platform statistics
   */
  loadPlatformStats(): void {
    this.statsLoadingSubject.next(true);
    this.http
      .get<any>(`${this.apiUrl}/admin/stats`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response?.data) {
            this.statsSubject.next({
              totalUsers: response.data.totalUsers || 0,
              totalCourses: response.data.totalCourses || 0,
              totalInstructors: response.data.totalInstructors || 0,
              totalStudents: response.data.totalStudents || 0,
            });
          }
          this.statsLoadingSubject.next(false);
        },
        error: (err) => {
          console.error('Error loading platform stats:', err);
          this.statsLoadingSubject.next(false);
        },
      });
  }

  /**
   * Load all users with proper pagination (not limited to 10)
   */
  loadUsers(): void {
    this.usersLoadingSubject.next(true);
    this.usersErrorSubject.next(null);

    this.http
      .get<any>(`${this.apiUrl}/users?limit=100&offset=0`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response?.data && Array.isArray(response.data)) {
            const users = response.data.map((user: any) => ({
              id: user.id,
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              email: user.email,
              role: (user.role || 'student').toLowerCase(),
              isActive: user.isActive || false,
              createdAt: this.formatDate(user.createdAt),
            }));
            this.usersSubject.next(users);
          }
          this.usersLoadingSubject.next(false);
        },
        error: (err) => {
          console.error('Error loading users:', err);
          this.usersErrorSubject.next('Failed to load users');
          this.usersLoadingSubject.next(false);
        },
      });
  }

  /**
   * Load all courses - NOW using /courses endpoint
   */
  loadCourses(): void {
    this.coursesLoadingSubject.next(true);
    this.coursesErrorSubject.next(null);

    this.http
      .get<any>(`${this.apiUrl}/courses?limit=100&page=1`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Courses API response:', response);

          if (response?.data) {
            // Handle both nested (response.data.courses) and direct (response.data) array formats
            const coursesList = Array.isArray(response.data)
              ? response.data
              : response.data.courses || [];

            console.log('Extracted courses list:', coursesList);

            if (Array.isArray(coursesList) && coursesList.length > 0) {
              const courses = coursesList.map((course: any) => {
                const instructorName = course.instructor_name
                  ? course.instructor_name
                  : `${course.instructor?.first_name || course.instructor?.firstName || ''} ${
                      course.instructor?.last_name || course.instructor?.lastName || ''
                    }`.trim() || 'N/A';

                return {
                  id: course.id,
                  title: course.title || 'Untitled',
                  instructor_name: instructorName,
                  status: (course.status || 'draft').toLowerCase(),
                  enrollment_count: course.enrollment_count || 0,
                  created_at: this.formatDate(course.created_at),
                };
              });

              console.log('Mapped courses:', courses);
              this.coursesSubject.next(courses);
            } else {
              console.warn('No courses found in response');
              this.coursesSubject.next([]);
            }
          } else {
            console.warn('No data in courses response');
            this.coursesSubject.next([]);
          }
          this.coursesLoadingSubject.next(false);
        },
        error: (err) => {
          console.error('Error loading courses:', err);
          this.coursesErrorSubject.next('Failed to load courses');
          this.coursesLoadingSubject.next(false);
        },
      });
  }

  /**
   * Load recent activities
   */
  loadActivities(): void {
    this.activitiesLoadingSubject.next(true);
    this.activitiesErrorSubject.next(null);

    this.http
      .get<any>(`${this.apiUrl}/admin/activities?limit=10`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response?.data && Array.isArray(response.data.activities)) {
            const activities = response.data.activities.map((activity: any) => ({
              id: activity.id,
              type: activity.type || 'user',
              action: activity.action || 'Activity logged',
              user: activity.user || 'System',
              courseName: activity.courseName,
              time: activity.time || 'N/A',
            }));
            this.activitiesSubject.next(activities);
          }
          this.activitiesLoadingSubject.next(false);
        },
        error: (err) => {
          console.error('Error loading activities:', err);
          this.activitiesErrorSubject.next('Failed to load recent activity');
          this.activitiesLoadingSubject.next(false);
        },
      });
  }

  /**
   * Load audit logs
   */
  loadAuditLogs(): void {
    this.auditLogsLoadingSubject.next(true);
    this.auditLogsErrorSubject.next(null);

    this.http
      .get<any>(`${this.apiUrl}/admin/audit-logs?limit=50`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Audit logs API response:', response);

          if (response?.data && Array.isArray(response.data.logs)) {
            const auditLogs = response.data.logs.map((log: any) => ({
              id: log.id,
              timestamp: log.timestamp || log.created_at,
              action: log.action,
              user: log.user || log.email || 'System',
              details: log.details,
              ip_address: log.ip_address || log.ipAddress || 'N/A',
            }));

            console.log('Mapped audit logs:', auditLogs);
            this.auditLogsSubject.next(auditLogs);
          } else {
            console.warn('No audit logs found in response');
            this.auditLogsSubject.next([]);
          }
          this.auditLogsLoadingSubject.next(false);
        },
        error: (err) => {
          console.error('Error loading audit logs:', err);
          this.auditLogsErrorSubject.next('Failed to load audit logs');
          this.auditLogsLoadingSubject.next(false);
        },
      });
  }

  /**
   * Start auto-refresh polling every 30 seconds
   * Refreshes: Stats, Activities, and Audit Logs
   */
  startAutoRefresh(intervalSeconds: number = 30): void {
    interval(intervalSeconds * 1000)
      .pipe(
        startWith(0),
        switchMap(() => {
          this.loadPlatformStats();
          this.loadActivities();
          this.loadAuditLogs();
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Delete a user
   */
  deleteUser(userId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/admin/users/${userId}`);
  }

  /**
   * Approve a course
   */
  approveCourse(courseId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/courses/${courseId}/approve`, {});
  }

  /**
   * Delete a course
   */
  deleteCourse(courseId: number): Observable<any> {
    console.log(
      `Attempting to delete course ${courseId} at ${this.apiUrl}/admin/courses/${courseId}`
    );

    return this.http.delete<any>(`${this.apiUrl}/admin/courses/${courseId}`).pipe(
      tap((response) => {
        console.log(`Course ${courseId} deleted successfully:`, response);
      }),
      catchError((error) => {
        console.error('Delete course error:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.error?.message || error.message);

        // Return a more user-friendly error
        const errorMessage = error.error?.message || error.statusText || 'Failed to delete course';

        return throwError(() => ({
          status: error.status,
          message: errorMessage,
          originalError: error,
        }));
      })
    );
  }

  /**
   * Format date to relative time string
   */
  private formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

      return date.toLocaleDateString();
    } catch (err) {
      return 'N/A';
    }
  }
}
