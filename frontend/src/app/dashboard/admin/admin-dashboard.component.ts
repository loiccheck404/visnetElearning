import { Component, OnInit, OnDestroy, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';

interface PlatformStats {
  totalUsers: number;
  totalCourses: number;
  totalInstructors: number;
  totalStudents: number;
}

interface RecentUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  joinedDate: string;
}

interface Course {
  id: number;
  title: string;
  instructor: string;
  status: string;
  students: number;
  createdDate: string;
}

interface Activity {
  id: number;
  type: string;
  action: string;
  user: string;
  time: string;
  icon: string;
}

interface AuditLog {
  id: number;
  action: string;
  user: string;
  timestamp: string;
  details: string;
  ipAddress: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  currentUser = signal<User | null>(null);
  activeSection = signal<string>('dashboard');
  sidebarCollapsed = signal(false);
  showUserDropdown = signal(false);

  // Loading states
  isLoadingStats = signal(false);
  isLoadingUsers = signal(false);
  isLoadingCourses = signal(false);
  isLoadingActivity = signal(false);
  isLoadingAudit = signal(false);

  // Error states
  statsError = signal<string | null>(null);
  usersError = signal<string | null>(null);
  coursesError = signal<string | null>(null);

  // Stats
  platformStats = signal<PlatformStats>({
    totalUsers: 0,
    totalCourses: 0,
    totalInstructors: 0,
    totalStudents: 0,
  });

  // Users Management
  allUsers = signal<RecentUser[]>([]);
  filteredUsers = signal<RecentUser[]>([]);
  userSearchQuery = signal('');
  userRoleFilter = signal('all');
  userStatusFilter = signal('all');
  userSortBy = signal('name');
  userSortOrder = signal<'asc' | 'desc'>('asc');

  // Courses Management
  allCourses = signal<Course[]>([]);
  filteredCourses = signal<Course[]>([]);
  courseSearchQuery = signal('');
  courseStatusFilter = signal('all');
  courseSortBy = signal('title');
  courseSortOrder = signal<'asc' | 'desc'>('asc');

  // Activity & Audit
  recentActivity = signal<Activity[]>([]);
  auditLogs = signal<AuditLog[]>([]);

  private destroy$ = new Subject<void>();
  private apiUrl = `${environment.apiUrl}`;

  constructor(private authService: AuthService, private router: Router, private http: HttpClient) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-info') && !target.closest('.user-dropdown')) {
      this.showUserDropdown.set(false);
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (window.innerWidth <= 1200 && window.innerWidth > 1024) {
      this.sidebarCollapsed.set(true);
    }
  }

  ngOnInit() {
    this.loadUserData();
    this.loadAllData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserData() {
    const user = this.authService.currentUserValue;
    if (user) {
      this.currentUser.set(user);
    }
  }

  loadAllData() {
    this.loadPlatformStats();
    this.loadUsers();
    this.loadCourses();
    this.loadRecentActivity();
    this.loadAuditLogs();
  }

  // Navigation
  setActiveSection(section: string) {
    this.activeSection.set(section);
  }

  toggleSidebar() {
    this.sidebarCollapsed.update((val) => !val);
  }

  toggleUserDropdown() {
    this.showUserDropdown.update((show) => !show);
  }

  // Platform Stats
  loadPlatformStats() {
    this.isLoadingStats.set(true);
    this.statsError.set(null);

    this.http
      .get<any>(`${this.apiUrl}/admin/stats`)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingStats.set(false))
      )
      .subscribe({
        next: (response) => {
          if (response?.data) {
            this.platformStats.set({
              totalUsers: response.data.totalUsers || 0,
              totalCourses: response.data.totalCourses || 0,
              totalInstructors: response.data.totalInstructors || 0,
              totalStudents: response.data.totalStudents || 0,
            });
          }
        },
        error: (err) => {
          console.error('Error loading platform stats:', err);
          this.statsError.set('Failed to load platform statistics');
          this.setMockPlatformStats();
        },
      });
  }

  private setMockPlatformStats() {
    this.platformStats.set({
      totalUsers: 247,
      totalCourses: 38,
      totalInstructors: 12,
      totalStudents: 235,
    });
  }

  // Users
  loadUsers() {
    this.isLoadingUsers.set(true);
    this.usersError.set(null);

    this.http
      .get<any>(`${this.apiUrl}/users`)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingUsers.set(false))
      )
      .subscribe({
        next: (response) => {
          if (response?.data && Array.isArray(response.data)) {
            const users = response.data.map((user: any) => ({
              id: user.id,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
              email: user.email,
              role: (user.role || 'student').toLowerCase(),
              status: (user.isActive ? 'active' : 'inactive').toLowerCase(),
              joinedDate: this.formatDate(user.createdAt),
            }));
            this.allUsers.set(users);
            this.applyUserFilters();
          }
        },
        error: (err) => {
          console.error('Error loading users:', err);
          this.usersError.set('Failed to load users');
          this.setMockUsers();
        },
      });
  }

  private setMockUsers() {
    const mockUsers: RecentUser[] = [
      {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'student',
        status: 'active',
        joinedDate: '2 days ago',
      },
      {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'instructor',
        status: 'active',
        joinedDate: '5 days ago',
      },
    ];
    this.allUsers.set(mockUsers);
    this.applyUserFilters();
  }

  // Courses
  loadCourses() {
    this.isLoadingCourses.set(true);
    this.coursesError.set(null);

    this.http
      .get<any>(`${this.apiUrl}/courses`)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingCourses.set(false))
      )
      .subscribe({
        next: (response) => {
          console.log('Raw courses response:', response); // DEBUG

          if (response?.data && Array.isArray(response.data)) {
            const courses = response.data.map((course: any) => {
              // Handle both possible response formats
              const instructorName = course.instructor_name
                ? course.instructor_name
                : `${course.instructor?.firstName || ''} ${
                    course.instructor?.lastName || ''
                  }`.trim() || 'N/A';

              return {
                id: course.id,
                title: course.title || 'Untitled',
                instructor: instructorName,
                status: (course.status || 'draft').toLowerCase(),
                students: course.enrollment_count || course.enrollmentCount || 0,
                createdDate: this.formatDate(course.created_at || course.createdAt),
              };
            });

            console.log('Mapped courses:', courses); // DEBUG
            this.allCourses.set(courses);
            this.applyCourseFilters();
          } else {
            console.warn('No courses data in response');
            this.setMockCourses();
          }
        },
        error: (err) => {
          console.error('Error loading courses:', err);
          this.coursesError.set('Failed to load courses');
          this.setMockCourses();
        },
      });
  }

  private setMockCourses() {
    const mockCourses: Course[] = [
      {
        id: 1,
        title: 'Web Development Fundamentals',
        instructor: 'Jane Smith',
        status: 'published',
        students: 45,
        createdDate: '1 week ago',
      },
      {
        id: 2,
        title: 'Advanced JavaScript',
        instructor: 'Sarah Williams',
        status: 'published',
        students: 32,
        createdDate: '3 days ago',
      },
    ];
    this.allCourses.set(mockCourses);
    this.applyCourseFilters();
  }

  // Activities
  loadRecentActivity() {
    this.isLoadingActivity.set(true);

    this.http
      .get<any>(`${this.apiUrl}/admin/activities?limit=10`)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoadingActivity.set(false))
      )
      .subscribe({
        next: (response) => {
          if (response?.data && Array.isArray(response.data)) {
            const activities = response.data.map((activity: any, index: number) => ({
              id: activity.id || index,
              type: activity.activity_type || activity.type || 'user',
              action: activity.action || activity.description || 'Activity logged',
              user: activity.student_name || activity.user || 'System',
              time: this.formatDate(activity.created_at || activity.timestamp),
              icon: this.getActivityIcon(activity.activity_type || activity.type),
            }));
            this.recentActivity.set(activities);
          }
        },
        error: (err) => {
          console.error('Error loading activities:', err);
          this.setMockActivity();
        },
      });
  }

  private setMockActivity() {
    const mockActivity: Activity[] = [
      {
        id: 1,
        type: 'user',
        action: 'New user registered',
        user: 'John Doe',
        time: '5 minutes ago',
        icon: 'user-plus',
      },
      {
        id: 2,
        type: 'course',
        action: 'Course published',
        user: 'Jane Smith',
        time: '1 hour ago',
        icon: 'book',
      },
      {
        id: 3,
        type: 'enrollment',
        action: 'Student enrolled in course',
        user: 'Mike Johnson',
        time: '2 hours ago',
        icon: 'check',
      },
    ];
    this.recentActivity.set(mockActivity);
  }

  // Audit Logs
  loadAuditLogs() {
    this.isLoadingAudit.set(true);

    // For now using mock data - you can connect to a real endpoint later
    const mockLogs: AuditLog[] = [
      {
        id: 1,
        action: 'User Login',
        user: 'admin@visnet.com',
        timestamp: '2025-10-12 14:30:22',
        details: 'Successful login',
        ipAddress: '192.168.1.1',
      },
      {
        id: 2,
        action: 'Course Approved',
        user: 'admin@visnet.com',
        timestamp: '2025-10-12 13:15:10',
        details: 'Approved Web Development course',
        ipAddress: '192.168.1.1',
      },
      {
        id: 3,
        action: 'User Created',
        user: 'admin@visnet.com',
        timestamp: '2025-10-12 12:00:05',
        details: 'Created new instructor account',
        ipAddress: '192.168.1.1',
      },
    ];
    this.auditLogs.set(mockLogs);
    this.isLoadingAudit.set(false);
  }

  // Filtering and Sorting
  applyUserFilters() {
    let users = [...this.allUsers()];

    if (this.userSearchQuery()) {
      const query = this.userSearchQuery().toLowerCase();
      users = users.filter(
        (u) => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)
      );
    }

    if (this.userRoleFilter() !== 'all') {
      users = users.filter((u) => u.role === this.userRoleFilter());
    }

    if (this.userStatusFilter() !== 'all') {
      users = users.filter((u) => u.status === this.userStatusFilter());
    }

    users.sort((a, b) => {
      const aVal = a[this.userSortBy() as keyof RecentUser];
      const bVal = b[this.userSortBy() as keyof RecentUser];
      const order = this.userSortOrder() === 'asc' ? 1 : -1;
      return aVal > bVal ? order : -order;
    });

    this.filteredUsers.set(users);
  }

  onUserSearchChange(query: string) {
    this.userSearchQuery.set(query);
    this.applyUserFilters();
  }

  onUserRoleFilterChange(role: string) {
    this.userRoleFilter.set(role);
    this.applyUserFilters();
  }

  onUserStatusFilterChange(status: string) {
    this.userStatusFilter.set(status);
    this.applyUserFilters();
  }

  sortUsers(column: string) {
    if (this.userSortBy() === column) {
      this.userSortOrder.set(this.userSortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.userSortBy.set(column);
      this.userSortOrder.set('asc');
    }
    this.applyUserFilters();
  }

  // Update the applyCourseFilters method to handle all statuses
  applyCourseFilters() {
    let courses = [...this.allCourses()];

    // Search filter
    if (this.courseSearchQuery()) {
      const query = this.courseSearchQuery().toLowerCase();
      courses = courses.filter(
        (c) => c.title.toLowerCase().includes(query) || c.instructor.toLowerCase().includes(query)
      );
    }

    // Status filter - show all if 'all' selected
    if (this.courseStatusFilter() !== 'all') {
      courses = courses.filter((c) => c.status === this.courseStatusFilter());
    }

    // Sort
    courses.sort((a, b) => {
      let aVal: any = a[this.courseSortBy() as keyof Course];
      let bVal: any = b[this.courseSortBy() as keyof Course];

      // Handle numeric comparisons for students
      if (this.courseSortBy() === 'students') {
        aVal = parseInt(aVal) || 0;
        bVal = parseInt(bVal) || 0;
        return this.courseSortOrder() === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // String comparisons
      const order = this.courseSortOrder() === 'asc' ? 1 : -1;
      if (aVal < bVal) return -order;
      if (aVal > bVal) return order;
      return 0;
    });

    console.log('Filtered courses:', courses); // DEBUG
    this.filteredCourses.set(courses);
  }

  onCourseSearchChange(query: string) {
    this.courseSearchQuery.set(query);
    this.applyCourseFilters();
  }

  onCourseStatusFilterChange(status: string) {
    this.courseStatusFilter.set(status);
    this.applyCourseFilters();
  }

  sortCourses(column: string) {
    if (this.courseSortBy() === column) {
      this.courseSortOrder.set(this.courseSortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.courseSortBy.set(column);
      this.courseSortOrder.set('asc');
    }
    this.applyCourseFilters();
  }

  // Actions
  viewUser(userId: number) {
    console.log('View user:', userId);
  }

  editUser(userId: number) {
    console.log('Edit user:', userId);
  }

  deleteUser(userId: number) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.http
        .delete<any>(`${this.apiUrl}/users/${userId}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadUsers();
          },
          error: (err) => console.error('Error deleting user:', err),
        });
    }
  }

  viewCourse(courseId: number) {
    console.log('View course:', courseId);
  }

  editCourse(courseId: number) {
    console.log('Edit course:', courseId);
  }

  approveCourse(courseId: number) {
    this.http
      .patch<any>(`${this.apiUrl}/courses/${courseId}/approve`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadCourses();
        },
        error: (err) => console.error('Error approving course:', err),
      });
  }

  deleteCourse(courseId: number) {
    if (confirm('Are you sure you want to delete this course?')) {
      this.http
        .delete<any>(`${this.apiUrl}/courses/${courseId}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadCourses();
          },
          error: (err) => console.error('Error deleting course:', err),
        });
    }
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  getActivityIcon(type: string): string {
    const icons: { [key: string]: string } = {
      user: 'user-plus',
      course: 'book',
      enrollment: 'check',
      edit: 'edit',
      delete: 'trash',
      course_enrolled: 'user-plus',
      lesson_completed: 'check',
      course_completed: 'check',
    };
    return icons[type] || 'activity';
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  formatDate(dateString: string): string {
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
