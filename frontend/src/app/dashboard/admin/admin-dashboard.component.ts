import { Component, OnInit, OnDestroy, signal, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../core/services/auth.service';
import { AdminService } from '../../core/services/admin.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { AfterViewInit, ViewChild, ElementRef } from '@angular/core';

// Register Chart.js components
Chart.register(...registerables);

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
  imports: [
    CommonModule,
    RouterModule,
    ThemeToggleComponent,
    FormsModule,
    ConfirmationDialogComponent,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
})
export class AdminDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  private authService = inject(AuthService);
  private adminService = inject(AdminService);
  private router = inject(Router);

  // Chart references
  @ViewChild('userDistributionChart') userDistributionCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('courseStatusChart') courseStatusCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('growthTrendChart') growthTrendCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('enrollmentChart') enrollmentCanvas!: ElementRef<HTMLCanvasElement>;

  private userDistributionChart?: Chart;
  private courseStatusChart?: Chart;
  private growthTrendChart?: Chart;
  private enrollmentChart?: Chart;
  private isDarkMode = false;

  currentUser = signal<User | null>(null);
  activeSection = signal<string>('dashboard');
  sidebarCollapsed = signal(false);
  showUserDropdown = signal(false);
  getInstructorPercentage = signal(0);
  getStudentPercentage = signal(0);

  // Confirmation dialog states
  showDeleteUserDialog = signal(false);
  showDeleteCourseDialog = signal(false);
  showSuccessDialog = signal(false);
  showErrorDialog = signal(false);
  isDeleting = signal(false);
  selectedUserId = signal<number | null>(null);
  selectedCourseId = signal<number | null>(null);
  selectedCourseName = signal<string>('');
  successMessage = signal('');
  errorMessage = signal('');
  showLogoutDialog = signal(false);
  showApproveCourseDialog = signal(false);
  showRejectCourseDialog = signal(false);
  isApproving = signal(false);
  isRejecting = signal(false);
  rejectionReason = signal('');
  pendingCoursesCount = signal(0);
  showRejectReasonDialog = signal(false);
  rejectionReasonInput = signal('');

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
    this.detectTheme();
    this.observeThemeChanges();

    // Subscribe to courses changes to update pending count
    this.allCourses$.pipe(takeUntil(this.destroy$)).subscribe((courses) => {
      if (courses) {
        console.log('All courses:', courses); // Debug: see all courses
        console.log(
          'Course statuses:',
          courses.map((c) => ({ id: c.id, title: c.title, status: c.status }))
        );
        const pending = courses.filter((c) => c.status === 'pending').length;
        this.pendingCoursesCount.set(pending);
        console.log('Updated pending courses count:', pending);
      }
    });
  }

  ngAfterViewInit() {
    // Initialize charts after view is ready
    setTimeout(() => {
      if (this.activeSection() === 'analytics') {
        this.initializeCharts();
      }
    }, 100);
  }

  ngOnDestroy() {
    this.adminService.stopAutoRefresh();
    this.destroyCharts();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============ THEME DETECTION ============
  detectTheme() {
    const isDark = document.documentElement.classList.contains('dark-theme');
    this.isDarkMode = isDark;
    console.log('Current theme - Dark mode:', isDark); // For debugging
  }

  // Observe theme changes and re-render charts
  observeThemeChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const wasDark = this.isDarkMode;
          this.detectTheme();

          // If theme changed and we're on analytics, re-initialize charts
          if (wasDark !== this.isDarkMode && this.activeSection() === 'analytics') {
            setTimeout(() => this.initializeCharts(), 100);
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  private getChartColors() {
    if (this.isDarkMode) {
      return {
        textColor: '#e2e8f0',
        secondaryText: '#cbd5e0',
        gridColor: 'rgba(203, 213, 224, 0.15)',
        tooltipBg: 'rgba(45, 55, 72, 0.98)',
        tooltipBorder: '#4a5568',
      };
    } else {
      return {
        textColor: '#1a202c',
        secondaryText: '#4a5568',
        gridColor: 'rgba(226, 232, 240, 0.8)',
        tooltipBg: 'rgba(255, 255, 255, 0.98)',
        tooltipBorder: '#e2e8f0',
      };
    }
  }

  // ============ CHART INITIALIZATION ============
  initializeCharts() {
    this.destroyCharts(); // Destroy existing charts first

    if (
      this.userDistributionCanvas &&
      this.courseStatusCanvas &&
      this.growthTrendCanvas &&
      this.enrollmentCanvas
    ) {
      this.createUserDistributionChart();
      this.createCourseStatusChart();
      this.createGrowthTrendChart();
      this.createEnrollmentChart();
    }
  }

  destroyCharts() {
    if (this.userDistributionChart) {
      this.userDistributionChart.destroy();
    }
    if (this.courseStatusChart) {
      this.courseStatusChart.destroy();
    }
    if (this.growthTrendChart) {
      this.growthTrendChart.destroy();
    }
    if (this.enrollmentChart) {
      this.enrollmentChart.destroy();
    }
  }

  // ============ USER DISTRIBUTION CHART (Doughnut) ============
  createUserDistributionChart() {
    const ctx = this.userDistributionCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const colors = this.getChartColors();
    let instructors = 0;
    let students = 0;

    this.platformStats$.pipe(takeUntil(this.destroy$)).subscribe((stats) => {
      if (stats) {
        instructors = stats.totalInstructors;
        students = stats.totalStudents;

        if (this.userDistributionChart) {
          this.userDistributionChart.data.datasets[0].data = [instructors, students];
          this.userDistributionChart.update();
        }
      }
    });

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Instructors', 'Students'],
        datasets: [
          {
            data: [instructors, students],
            backgroundColor: ['rgba(139, 125, 255, 0.8)', 'rgba(72, 187, 120, 0.8)'],
            borderColor: ['rgba(139, 125, 255, 1)', 'rgba(72, 187, 120, 1)'],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: this.isDarkMode ? '#e2e8f0' : '#1a202c',
              padding: 20,
              font: {
                size: 14,
              },
            },
          },
          tooltip: {
            backgroundColor: this.isDarkMode
              ? 'rgba(26, 32, 44, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            titleColor: this.isDarkMode ? '#e2e8f0' : '#1a202c',
            bodyColor: this.isDarkMode ? '#cbd5e0' : '#4a5568',
            borderColor: this.isDarkMode ? '#4a5568' : '#e2e8f0',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              },
            },
          },
        },
        cutout: '65%',
      },
    };

    this.userDistributionChart = new Chart(ctx, config);
  }

  // ============ COURSE STATUS CHART (Bar) ============
  createCourseStatusChart() {
    const ctx = this.courseStatusCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const colors = this.getChartColors();
    let published = 0;
    this.platformStats$.pipe(takeUntil(this.destroy$)).subscribe((stats) => {
      if (stats) {
        published = stats.totalCourses;
        if (this.courseStatusChart) {
          this.courseStatusChart.data.datasets[0].data = [published, 6, 2, 1];
          this.courseStatusChart.update();
        }
      }
    });

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: ['Published', 'Pending', 'Draft', 'Archived'],
        datasets: [
          {
            label: 'Courses',
            data: [published, 6, 2, 1],
            backgroundColor: [
              'rgba(72, 187, 120, 0.8)',
              'rgba(237, 137, 54, 0.8)',
              'rgba(113, 128, 150, 0.8)',
              'rgba(203, 213, 224, 0.8)',
            ],
            borderColor: [
              'rgba(72, 187, 120, 1)',
              'rgba(237, 137, 54, 1)',
              'rgba(113, 128, 150, 1)',
              'rgba(203, 213, 224, 1)',
            ],
            borderWidth: 2,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: this.isDarkMode
              ? 'rgba(26, 32, 44, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            titleColor: this.isDarkMode ? '#e2e8f0' : '#1a202c',
            bodyColor: this.isDarkMode ? '#cbd5e0' : '#4a5568',
            borderColor: this.isDarkMode ? '#4a5568' : '#e2e8f0',
            borderWidth: 1,
            padding: 12,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: this.isDarkMode ? '#cbd5e0' : '#4a5568',
              stepSize: 1,
            },
            grid: {
              color: this.isDarkMode ? 'rgba(74, 85, 104, 0.2)' : 'rgba(226, 232, 240, 0.8)',
            },
          },
          x: {
            ticks: {
              color: this.isDarkMode ? '#cbd5e0' : '#4a5568',
            },
            grid: {
              display: false,
            },
          },
        },
      },
    };

    this.courseStatusChart = new Chart(ctx, config);
  }

  // ============ GROWTH TREND CHART (Line) ============
  createGrowthTrendChart() {
    const ctx = this.growthTrendCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const colors = this.getChartColors();
    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        datasets: [
          {
            label: 'Users',
            data: [5, 8, 12, 15, 20, 28, 35],
            borderColor: 'rgba(139, 125, 255, 1)',
            backgroundColor: 'rgba(139, 125, 255, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: 'rgba(139, 125, 255, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
          {
            label: 'Courses',
            data: [3, 4, 6, 7, 9, 11, 14],
            borderColor: 'rgba(72, 187, 120, 1)',
            backgroundColor: 'rgba(72, 187, 120, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: 'rgba(72, 187, 120, 1)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: this.isDarkMode ? '#e2e8f0' : '#1a202c',
              padding: 15,
              font: {
                size: 13,
              },
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
          tooltip: {
            backgroundColor: this.isDarkMode
              ? 'rgba(26, 32, 44, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            titleColor: this.isDarkMode ? '#e2e8f0' : '#1a202c',
            bodyColor: this.isDarkMode ? '#cbd5e0' : '#4a5568',
            borderColor: this.isDarkMode ? '#4a5568' : '#e2e8f0',
            borderWidth: 1,
            padding: 12,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: this.isDarkMode ? '#cbd5e0' : '#4a5568',
            },
            grid: {
              color: this.isDarkMode ? 'rgba(74, 85, 104, 0.2)' : 'rgba(226, 232, 240, 0.8)',
            },
          },
          x: {
            ticks: {
              color: this.isDarkMode ? '#cbd5e0' : '#4a5568',
            },
            grid: {
              color: this.isDarkMode ? 'rgba(74, 85, 104, 0.2)' : 'rgba(226, 232, 240, 0.8)',
            },
          },
        },
      },
    };

    this.growthTrendChart = new Chart(ctx, config);
  }

  // ============ ENROLLMENT CHART (Polar Area) ============
  createEnrollmentChart() {
    const ctx = this.enrollmentCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const colors = this.getChartColors();

    const config: ChartConfiguration<'polarArea'> = {
      type: 'polarArea',
      data: {
        labels: ['Web Dev', 'Data Science', 'Design', 'Business', 'Marketing'],
        datasets: [
          {
            data: [450, 320, 280, 190, 150],
            backgroundColor: [
              'rgba(139, 125, 255, 0.7)',
              'rgba(72, 187, 120, 0.7)',
              'rgba(237, 137, 54, 0.7)',
              'rgba(66, 153, 225, 0.7)',
              'rgba(245, 101, 101, 0.7)',
            ],
            borderColor: [
              'rgba(139, 125, 255, 1)',
              'rgba(72, 187, 120, 1)',
              'rgba(237, 137, 54, 1)',
              'rgba(66, 153, 225, 1)',
              'rgba(245, 101, 101, 1)',
            ],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: this.isDarkMode ? '#e2e8f0' : '#1a202c',
              padding: 15,
              font: {
                size: 13,
              },
            },
          },
          tooltip: {
            backgroundColor: this.isDarkMode
              ? 'rgba(26, 32, 44, 0.95)'
              : 'rgba(255, 255, 255, 0.95)',
            titleColor: this.isDarkMode ? '#e2e8f0' : '#1a202c',
            bodyColor: this.isDarkMode ? '#cbd5e0' : '#4a5568',
            borderColor: this.isDarkMode ? '#4a5568' : '#e2e8f0',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (context) => {
                return `${context.label}: ${context.parsed.r} enrollments`;
              },
            },
          },
        },
        scales: {
          r: {
            ticks: {
              color: this.isDarkMode ? '#cbd5e0' : '#4a5568',
              backdropColor: 'transparent',
            },
            grid: {
              color: this.isDarkMode ? 'rgba(74, 85, 104, 0.2)' : 'rgba(226, 232, 240, 0.8)',
            },
          },
        },
      },
    };

    this.enrollmentChart = new Chart(ctx, config);
  }

  // ============ NAVIGATION & EXISTING METHODS ============
  setActiveSection(section: string) {
    this.activeSection.set(section);

    // Initialize charts when analytics section is activated
    if (section === 'analytics') {
      setTimeout(() => this.initializeCharts(), 100);
    }
  }

  loadUserData() {
    const user = this.authService.currentUserValue;
    if (user) {
      this.currentUser.set(user);
    }
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

  // ============ USER ACTIONS ============
  viewUser(userId: number) {
    console.log('Viewing user:', userId);
    alert(`Viewing User #${userId}\n\nThis would navigate to user detail view.`);
    // TODO: Implement user detail view
    // this.router.navigate(['/dashboard/admin/users', userId]);
  }

  editUser(userId: number) {
    console.log('Editing user:', userId);
    alert(`Editing User #${userId}\n\nThis would open user edit form.`);
    // TODO: Implement user edit form
    // this.router.navigate(['/dashboard/admin/users', userId, 'edit']);
  }

  confirmDeleteUser(userId: number) {
    this.selectedUserId.set(userId);
    this.showDeleteUserDialog.set(true);
  }

  cancelDeleteUser() {
    this.showDeleteUserDialog.set(false);
    this.selectedUserId.set(null);
  }

  deleteUser() {
    const userId = this.selectedUserId();
    if (!userId) return;

    this.isDeleting.set(true);
    this.adminService
      .deleteUser(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.showDeleteUserDialog.set(false);
          this.selectedUserId.set(null);

          this.successMessage.set('User deleted successfully!');
          this.showSuccessDialog.set(true);

          this.adminService.loadUsers();
          this.adminService.loadPlatformStats();
        },
        error: (err) => {
          console.error('Error deleting user:', err);
          this.isDeleting.set(false);
          this.showDeleteUserDialog.set(false);

          this.errorMessage.set(err.message || 'Failed to delete user. Please try again.');
          this.showErrorDialog.set(true);
        },
      });
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

    console.log('Filtering courses - Total:', courses.length);
    console.log(
      'All course statuses:',
      courses.map((c) => ({ id: c.id, title: c.title, status: c.status }))
    );

    // Search filter
    if (this.courseSearchQuery()) {
      const query = this.courseSearchQuery().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(query) || c.instructor_name.toLowerCase().includes(query)
      );
      console.log('After search filter:', filtered.length);
    }

    // Status filter - FIXED: Now correctly filters by status
    if (this.courseStatusFilter() !== 'all') {
      const filterStatus = this.courseStatusFilter().toLowerCase();
      console.log('Filtering by status:', filterStatus);

      // Map 'active' to 'published' for compatibility
      const targetStatus = filterStatus === 'active' ? 'published' : filterStatus;

      filtered = filtered.filter((c) => {
        const courseStatus = c.status.toLowerCase();
        return courseStatus === targetStatus;
      });

      console.log(`After status filter (${targetStatus}):`, filtered.length);
      console.log(
        'Filtered courses:',
        filtered.map((c) => ({ id: c.id, title: c.title, status: c.status }))
      );
    }

    // Sort
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

    console.log('Final filtered courses count:', filtered.length);
    return filtered;
  }

  getPendingCoursesCount(): number {
    return this.pendingCoursesCount();
  }

  confirmApproveCourse(courseId: number, courseTitle: string) {
    this.selectedCourseId.set(courseId);
    this.selectedCourseName.set(courseTitle);
    this.showApproveCourseDialog.set(true);
  }

  cancelApproveCourse() {
    this.showApproveCourseDialog.set(false);
    this.selectedCourseId.set(null);
    this.selectedCourseName.set('');
  }

  approveCourse(): void {
    if (!this.selectedCourseId()) {
      console.error('No course selected for approval');
      return;
    }

    this.isApproving.set(true);

    this.adminService.approveCourse(this.selectedCourseId()!).subscribe({
      next: (response) => {
        console.log('Course approved successfully:', response);
        this.isApproving.set(false);
        this.showApproveCourseDialog.set(false);

        // FIXED: Wait for courses to reload before showing success
        this.adminService.loadCourses();

        // Show success message after a brief delay to ensure UI updates
        setTimeout(() => {
          this.successMessage.set('Course approved and published successfully!');
          this.showSuccessDialog.set(true);
        }, 300);

        this.selectedCourseId.set(null);
        this.selectedCourseName.set('');
      },
      error: (error) => {
        console.error('Error approving course:', error);
        this.isApproving.set(false);
        this.errorMessage.set(
          error?.error?.message || 'Failed to approve course. Please try again.'
        );
        this.showErrorDialog.set(true);
      },
    });
  }

  confirmRejectCourse(courseId: number, courseTitle: string) {
    this.selectedCourseId.set(courseId);
    this.selectedCourseName.set(courseTitle);
    this.rejectionReasonInput.set(''); // Clear previous reason
    this.showRejectCourseDialog.set(true);
  }

  cancelRejectCourse() {
    this.showRejectCourseDialog.set(false);
    this.selectedCourseId.set(null);
    this.selectedCourseName.set('');
    this.rejectionReasonInput.set('');
  }

  rejectCourse(): void {
    if (!this.selectedCourseId() || this.rejectionReasonInput().trim().length === 0) {
      console.error('No course selected or rejection reason is empty');
      return;
    }

    this.isRejecting.set(true);
    const reason = this.rejectionReasonInput().trim();

    this.adminService.rejectCourse(this.selectedCourseId()!, reason).subscribe({
      next: (response) => {
        console.log('Course rejected successfully:', response);
        this.isRejecting.set(false);
        this.showRejectCourseDialog.set(false);

        // FIXED: Wait for courses to reload before showing success
        this.adminService.loadCourses();

        // Show success message after a brief delay to ensure UI updates
        setTimeout(() => {
          this.successMessage.set('Course rejected and returned to draft for revision.');
          this.showSuccessDialog.set(true);
        }, 300);

        this.selectedCourseId.set(null);
        this.selectedCourseName.set('');
        this.rejectionReasonInput.set('');
      },
      error: (error) => {
        console.error('Error rejecting course:', error);
        this.isRejecting.set(false);
        this.errorMessage.set(
          error?.error?.message || 'Failed to reject course. Please try again.'
        );
        this.showErrorDialog.set(true);
      },
    });
  }

  // ============ COURSE ACTIONS ============
  viewCourse(courseId: number) {
    console.log('Viewing course:', courseId);
    // Navigate to course detail view
    this.router.navigate(['/dashboard/courses', courseId]);
  }

  editCourse(courseId: number) {
    console.log('Editing course:', courseId);
    // Navigate to course edit form
    this.router.navigate(['/dashboard/instructor/create-course'], {
      queryParams: { courseId: courseId },
    });
  }

  confirmDeleteCourse(courseId: number, courseTitle: string) {
    this.selectedCourseId.set(courseId);
    this.selectedCourseName.set(courseTitle);
    this.showDeleteCourseDialog.set(true);
  }

  cancelDeleteCourse() {
    this.showDeleteCourseDialog.set(false);
    this.selectedCourseId.set(null);
    this.selectedCourseName.set('');
  }

  deleteCourse() {
    const courseId = this.selectedCourseId();
    if (!courseId) return;

    this.isDeleting.set(true);
    this.adminService
      .deleteCourse(courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isDeleting.set(false);
          this.showDeleteCourseDialog.set(false);
          this.selectedCourseId.set(null);
          this.selectedCourseName.set('');

          this.successMessage.set('Course deleted successfully!');
          this.showSuccessDialog.set(true);

          this.adminService.loadCourses();
          this.adminService.loadPlatformStats();
        },
        error: (err) => {
          console.error('Error deleting course:', err);
          this.isDeleting.set(false);
          this.showDeleteCourseDialog.set(false);

          let errorMsg = 'Failed to delete course.';
          if (err.status === 404) {
            errorMsg = 'Course not found or you may not have permission to delete it.';
          } else if (err.status === 401 || err.status === 403) {
            errorMsg = 'You are not authorized to delete this course.';
          } else if (err.message) {
            errorMsg = err.message;
          }

          this.errorMessage.set(errorMsg);
          this.showErrorDialog.set(true);
        },
      });
  }

  closeSuccessDialog() {
    this.showSuccessDialog.set(false);
    this.successMessage.set('');
  }

  closeErrorDialog() {
    this.showErrorDialog.set(false);
    this.errorMessage.set('');
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
    this.showLogoutDialog.set(true);
  }

  confirmLogout() {
    this.showLogoutDialog.set(false);
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  cancelLogout() {
    this.showLogoutDialog.set(false);
  }
}
