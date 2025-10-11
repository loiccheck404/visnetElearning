import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

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

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
})
export class AdminDashboardComponent implements OnInit {
  currentUser = signal<User | null>(null);
  activeSection = signal<string>('dashboard');
  sidebarCollapsed = signal(false);
  showUserDropdown = signal(false);

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
  activityFilter = signal('all');

  // Analytics
  userGrowthData = signal<ChartData | null>(null);
  courseStatsData = signal<ChartData | null>(null);
  enrollmentTrendsData = signal<ChartData | null>(null);

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
    // Auto-collapse sidebar on desktop when resizing
    if (window.innerWidth <= 1200 && window.innerWidth > 1024) {
      this.sidebarCollapsed.set(true);
    }
  }

  ngOnInit() {
    this.loadUserData();
    this.loadAllData();
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
    this.loadAnalyticsData();
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

  // Data Loading
  loadPlatformStats() {
    this.http.get<any>(`${this.apiUrl}/admin/stats`).subscribe({
      next: (response) => {
        if (response.data) {
          this.platformStats.set({
            totalUsers: response.data.totalUsers || 0,
            totalCourses: response.data.totalCourses || 0,
            totalInstructors: response.data.totalInstructors || 0,
            totalStudents: response.data.totalStudents || 0,
          });
        }
      },
      error: (err) => this.setMockPlatformStats(),
    });
  }

  setMockPlatformStats() {
    this.platformStats.set({
      totalUsers: 247,
      totalCourses: 38,
      totalInstructors: 12,
      totalStudents: 235,
    });
  }

  loadUsers() {
    this.http.get<any>(`${this.apiUrl}/users`).subscribe({
      next: (response) => {
        if (response.data && Array.isArray(response.data)) {
          const users = response.data.map((user: any) => ({
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: (user.role || 'student').toLowerCase(),
            status: user.status || 'active',
            joinedDate: this.formatDate(user.createdAt),
          }));
          this.allUsers.set(users);
          this.applyUserFilters();
        }
      },
      error: (err) => this.setMockUsers(),
    });
  }

  setMockUsers() {
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
      {
        id: 3,
        name: 'Mike Johnson',
        email: 'mike@example.com',
        role: 'student',
        status: 'inactive',
        joinedDate: '1 week ago',
      },
      {
        id: 4,
        name: 'Sarah Williams',
        email: 'sarah@example.com',
        role: 'instructor',
        status: 'active',
        joinedDate: '3 days ago',
      },
    ];
    this.allUsers.set(mockUsers);
    this.applyUserFilters();
  }

  loadCourses() {
    this.http.get<any>(`${this.apiUrl}/courses`).subscribe({
      next: (response) => {
        if (response.data && Array.isArray(response.data)) {
          const courses = response.data.map((course: any) => ({
            id: course.id,
            title: course.title,
            instructor: `${course.instructor?.firstName || ''} ${
              course.instructor?.lastName || ''
            }`.trim(),
            status: course.status || 'active',
            students: course.enrollmentCount || 0,
            createdDate: this.formatDate(course.createdAt),
          }));
          this.allCourses.set(courses);
          this.applyCourseFilters();
        }
      },
      error: (err) => this.setMockCourses(),
    });
  }

  setMockCourses() {
    const mockCourses: Course[] = [
      {
        id: 1,
        title: 'Web Development Fundamentals',
        instructor: 'Jane Smith',
        status: 'active',
        students: 45,
        createdDate: '1 week ago',
      },
      {
        id: 2,
        title: 'Advanced JavaScript',
        instructor: 'Sarah Williams',
        status: 'active',
        students: 32,
        createdDate: '3 days ago',
      },
      {
        id: 3,
        title: 'Python for Beginners',
        instructor: 'Jane Smith',
        status: 'pending',
        students: 0,
        createdDate: '1 day ago',
      },
      {
        id: 4,
        title: 'Data Structures',
        instructor: 'Sarah Williams',
        status: 'active',
        students: 28,
        createdDate: '2 weeks ago',
      },
    ];
    this.allCourses.set(mockCourses);
    this.applyCourseFilters();
  }

  loadRecentActivity() {
    this.http.get<any>(`${this.apiUrl}/admin/activities?limit=10`).subscribe({
      next: (response) => {
        if (response.data && Array.isArray(response.data)) {
          const activities = response.data.map((activity: any, index: number) => ({
            id: index,
            type: activity.type || 'user',
            action: activity.action || activity.description || 'Activity logged',
            user: activity.user || 'System',
            time: this.formatDate(activity.createdAt || activity.timestamp),
            icon: this.getActivityIcon(activity.type),
          }));
          this.recentActivity.set(activities);
        }
      },
      error: (err) => this.setMockActivity(),
    });
  }

  setMockActivity() {
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
      {
        id: 4,
        type: 'user',
        action: 'User profile updated',
        user: 'Sarah Williams',
        time: '3 hours ago',
        icon: 'edit',
      },
      {
        id: 5,
        type: 'course',
        action: 'Course content updated',
        user: 'Jane Smith',
        time: '5 hours ago',
        icon: 'book',
      },
    ];
    this.recentActivity.set(mockActivity);
  }

  loadAuditLogs() {
    const mockLogs: AuditLog[] = [
      {
        id: 1,
        action: 'User Login',
        user: 'admin@visnet.com',
        timestamp: '2025-10-11 14:30:22',
        details: 'Successful login',
        ipAddress: '192.168.1.1',
      },
      {
        id: 2,
        action: 'Course Approved',
        user: 'admin@visnet.com',
        timestamp: '2025-10-11 13:15:10',
        details: 'Approved Web Development course',
        ipAddress: '192.168.1.1',
      },
      {
        id: 3,
        action: 'User Created',
        user: 'admin@visnet.com',
        timestamp: '2025-10-11 12:00:05',
        details: 'Created new instructor account',
        ipAddress: '192.168.1.1',
      },
      {
        id: 4,
        action: 'Settings Updated',
        user: 'admin@visnet.com',
        timestamp: '2025-10-11 11:45:30',
        details: 'Updated platform settings',
        ipAddress: '192.168.1.1',
      },
    ];
    this.auditLogs.set(mockLogs);
  }

  loadAnalyticsData() {
    // User Growth Chart
    this.userGrowthData.set({
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Users',
          data: [45, 78, 125, 167, 203, 247],
          borderColor: '#8b7dff',
          backgroundColor: 'rgba(139, 125, 255, 0.1)',
          borderWidth: 2,
        },
      ],
    });

    // Course Stats Chart
    this.courseStatsData.set({
      labels: ['Active', 'Pending', 'Draft'],
      datasets: [
        {
          label: 'Courses',
          data: [28, 6, 4],
          backgroundColor: ['#48bb78', '#ed8936', '#4299e1'],
          borderWidth: 0,
        },
      ],
    });

    // Enrollment Trends Chart
    this.enrollmentTrendsData.set({
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [
        {
          label: 'Enrollments',
          data: [32, 45, 38, 52],
          borderColor: '#48bb78',
          backgroundColor: 'rgba(72, 187, 120, 0.1)',
          borderWidth: 2,
        },
      ],
    });
  }

  // Filtering and Sorting
  applyUserFilters() {
    let users = [...this.allUsers()];

    // Search
    if (this.userSearchQuery()) {
      const query = this.userSearchQuery().toLowerCase();
      users = users.filter(
        (u) => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (this.userRoleFilter() !== 'all') {
      users = users.filter((u) => u.role === this.userRoleFilter());
    }

    // Status filter
    if (this.userStatusFilter() !== 'all') {
      users = users.filter((u) => u.status === this.userStatusFilter());
    }

    // Sort
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

  applyCourseFilters() {
    let courses = [...this.allCourses()];

    // Search
    if (this.courseSearchQuery()) {
      const query = this.courseSearchQuery().toLowerCase();
      courses = courses.filter(
        (c) => c.title.toLowerCase().includes(query) || c.instructor.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (this.courseStatusFilter() !== 'all') {
      courses = courses.filter((c) => c.status === this.courseStatusFilter());
    }

    // Sort
    courses.sort((a, b) => {
      const aVal = a[this.courseSortBy() as keyof Course];
      const bVal = b[this.courseSortBy() as keyof Course];
      const order = this.courseSortOrder() === 'asc' ? 1 : -1;
      return aVal > bVal ? order : -order;
    });

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
    // Implement user detail view
  }

  editUser(userId: number) {
    console.log('Edit user:', userId);
    // Implement user edit
  }

  deleteUser(userId: number) {
    if (confirm('Are you sure you want to delete this user?')) {
      console.log('Delete user:', userId);
      // Implement user deletion
    }
  }

  viewCourse(courseId: number) {
    console.log('View course:', courseId);
    // Implement course detail view
  }

  editCourse(courseId: number) {
    console.log('Edit course:', courseId);
    // Implement course edit
  }

  approveCourse(courseId: number) {
    this.http.patch<any>(`${this.apiUrl}/courses/${courseId}/approve`, {}).subscribe({
      next: () => {
        console.log('Course approved:', courseId);
        this.loadCourses();
      },
      error: (err) => console.error('Error approving course:', err),
    });
  }

  deleteCourse(courseId: number) {
    if (confirm('Are you sure you want to delete this course?')) {
      console.log('Delete course:', courseId);
      // Implement course deletion
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
    };
    return icons[type] || 'activity';
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
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
  }
}
