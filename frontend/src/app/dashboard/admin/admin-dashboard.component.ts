import { Component, OnInit, OnDestroy, signal, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../core/services/auth.service';
import { AdminService } from '../../core/services/admin.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface RecentUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface Course {
  id: number;
  title: string;
  instructor_name: string;
  status: string;
  enrollment_count: number;
  created_at: string;
}

interface Activity {
  id: number;
  type: string;
  action: string;
  user: string;
  courseName?: string;
  time: string;
}

interface AuditLog {
  id: number;
  timestamp: string;
  action: string;
  user: string;
  details: string;
  ip_address: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private adminService = inject(AdminService);
  private router = inject(Router);

  currentUser = signal<User | null>(null);
  activeSection = signal<string>('dashboard');
  sidebarCollapsed = signal(false);
  showUserDropdown = signal(false);
  getInstructorPercentage = signal(0);
  getStudentPercentage = signal(0);

  // Observables from service
  platformStats$ = this.adminService.stats$;
  allUsers$ = this.adminService.users$;
  usersError$ = this.adminService.usersError$;
  usersLoading$ = this.adminService.usersLoading$;

  allCourses$ = this.adminService.courses$;
  coursesError$ = this.adminService.coursesError$;
  coursesLoading$ = this.adminService.coursesLoading$;

  recentActivity$ = this.adminService.activities$;
  activitiesError$ = this.adminService.activitiesError$;
  activitiesLoading$ = this.adminService.activitiesLoading$;

  auditLogs$ = this.adminService.auditLogs$;
  auditLogsError$ = this.adminService.auditLogsError$;
  auditLogsLoading$ = this.adminService.auditLogsLoading$;

  // Local state for filtering/sorting
  userSearchQuery = signal('');
  userRoleFilter = signal('all');
  userStatusFilter = signal('all');
  userSortBy = signal('firstName');
  userSortOrder = signal<'asc' | 'desc'>('asc');

  courseSearchQuery = signal('');
  courseStatusFilter = signal('all');
  courseSortBy = signal('title');
  courseSortOrder = signal<'asc' | 'desc'>('asc');

  private destroy$ = new Subject<void>();

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
    this.adminService.loadDashboardData();
    this.adminService.startAutoRefresh(30);
    this.updatePercentages();
  }

  ngOnDestroy() {
    this.adminService.stopAutoRefresh();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserData() {
    const user = this.authService.currentUserValue;
    if (user) {
      this.currentUser.set(user);
    }
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

  // User Management
  onUserSearchChange(query: string) {
    this.userSearchQuery.set(query);
  }

  onUserRoleFilterChange(role: string) {
    this.userRoleFilter.set(role);
  }

  onUserStatusFilterChange(status: string) {
    this.userStatusFilter.set(status);
  }

  sortUsers(column: string) {
    if (this.userSortBy() === column) {
      this.userSortOrder.set(this.userSortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.userSortBy.set(column);
      this.userSortOrder.set('asc');
    }
  }

  getFilteredUsers(users: RecentUser[]): RecentUser[] {
    let filtered = [...users];

    if (this.userSearchQuery()) {
      const query = this.userSearchQuery().toLowerCase();
      filtered = filtered.filter(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      );
    }

    if (this.userRoleFilter() !== 'all') {
      filtered = filtered.filter((u) => u.role === this.userRoleFilter());
    }

    if (this.userStatusFilter() !== 'all') {
      const status = this.userStatusFilter() === 'active' ? true : false;
      filtered = filtered.filter((u) => u.isActive === status);
    }

    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (this.userSortBy() === 'name') {
        aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
        bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
      } else if (this.userSortBy() === 'email') {
        aVal = a.email.toLowerCase();
        bVal = b.email.toLowerCase();
      } else if (this.userSortBy() === 'role') {
        aVal = a.role.toLowerCase();
        bVal = b.role.toLowerCase();
      } else {
        aVal = a[this.userSortBy() as keyof RecentUser];
        bVal = b[this.userSortBy() as keyof RecentUser];
      }

      const order = this.userSortOrder() === 'asc' ? 1 : -1;
      return aVal > bVal ? order : -order;
    });

    return filtered;
  }

  viewUser(userId: number) {
    console.log('View user:', userId);
  }

  editUser(userId: number) {
    console.log('Edit user:', userId);
  }

  deleteUser(userId: number) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.adminService
        .deleteUser(userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.adminService.loadUsers();
            this.adminService.loadPlatformStats();
          },
          error: (err) => console.error('Error deleting user:', err),
        });
    }
  }

  // Course Management
  onCourseSearchChange(query: string) {
    this.courseSearchQuery.set(query);
  }

  onCourseStatusFilterChange(status: string) {
    this.courseStatusFilter.set(status);
  }

  sortCourses(column: string) {
    if (this.courseSortBy() === column) {
      this.courseSortOrder.set(this.courseSortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.courseSortBy.set(column);
      this.courseSortOrder.set('asc');
    }
  }

  getFilteredCourses(courses: Course[]): Course[] {
    let filtered = [...courses];

    if (this.courseSearchQuery()) {
      const query = this.courseSearchQuery().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(query) || c.instructor_name.toLowerCase().includes(query)
      );
    }

    if (this.courseStatusFilter() !== 'all') {
      filtered = filtered.filter((c) => c.status === this.courseStatusFilter());
    }

    filtered.sort((a, b) => {
      let aVal: any = a[this.courseSortBy() as keyof Course];
      let bVal: any = b[this.courseSortBy() as keyof Course];

      if (this.courseSortBy() === 'enrollment_count') {
        aVal = parseInt(String(aVal)) || 0;
        bVal = parseInt(String(bVal)) || 0;
        return this.courseSortOrder() === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const order = this.courseSortOrder() === 'asc' ? 1 : -1;
      if (aVal < bVal) return -order;
      if (aVal > bVal) return order;
      return 0;
    });

    return filtered;
  }

  viewCourse(courseId: number) {
    console.log('View course:', courseId);
  }

  editCourse(courseId: number) {
    console.log('Edit course:', courseId);
  }

  approveCourse(courseId: number) {
    this.adminService
      .approveCourse(courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.adminService.loadCourses();
          this.adminService.loadPlatformStats();
        },
        error: (err) => console.error('Error approving course:', err),
      });
  }

  deleteCourse(courseId: number) {
    if (confirm('Are you sure you want to delete this course?')) {
      this.adminService
        .deleteCourse(courseId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.adminService.loadCourses();
            this.adminService.loadPlatformStats();
          },
          error: (err) => console.error('Error deleting course:', err),
        });
    }
  }

  // Utilities
  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  updatePercentages(): void {
    this.platformStats$.pipe(takeUntil(this.destroy$)).subscribe((stats) => {
      if (stats && stats.totalUsers > 0) {
        const instructorPercent = (stats.totalInstructors / stats.totalUsers) * 100;
        const studentPercent = (stats.totalStudents / stats.totalUsers) * 100;

        this.getInstructorPercentage.set(instructorPercent);
        this.getStudentPercentage.set(studentPercent);
      } else {
        this.getInstructorPercentage.set(0);
        this.getStudentPercentage.set(0);
      }
    });
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
