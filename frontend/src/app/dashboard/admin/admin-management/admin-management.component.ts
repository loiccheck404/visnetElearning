// admin-management.component.ts
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastLogin?: string;
}

interface Course {
  id: number;
  title: string;
  instructor: string;
  category: string;
  students: number;
  status: 'published' | 'draft' | 'archived';
  createdAt: string;
  revenue?: number;
}

interface AnalyticsData {
  totalRevenue: number;
  totalEnrollments: number;
  avgCourseRating: number;
  userGrowth: { month: string; count: number }[];
  coursePerformance: { title: string; enrollments: number; revenue: number }[];
  topInstructors: { name: string; courses: number; students: number; revenue: number }[];
}

type TabType = 'users' | 'courses' | 'analytics';

@Component({
  selector: 'app-admin-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-management.component.html',
  styleUrls: ['./admin-management.component.scss'],
})
export class AdminManagementComponent implements OnInit {
  activeTab = signal<TabType>('users');

  // Users Management
  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  userSearchQuery = signal('');
  userRoleFilter = signal<string>('all');
  userStatusFilter = signal<string>('all');
  showUserModal = signal(false);
  selectedUser = signal<User | null>(null);
  isLoadingUsers = signal(false);

  // Courses Management
  courses = signal<Course[]>([]);
  filteredCourses = signal<Course[]>([]);
  courseSearchQuery = signal('');
  courseCategoryFilter = signal<string>('all');
  courseStatusFilter = signal<string>('all');
  showCourseModal = signal(false);
  selectedCourse = signal<Course | null>(null);
  isLoadingCourses = signal(false);

  // Analytics
  analytics = signal<AnalyticsData | null>(null);
  isLoadingAnalytics = signal(false);

  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadUsers();
    this.loadCourses();
    this.loadAnalytics();
  }

  // ========== USERS MANAGEMENT ==========
  loadUsers() {
    this.isLoadingUsers.set(true);
    this.http.get<any>(`${this.apiUrl}/users`).subscribe({
      next: (response) => {
        if (response.data && Array.isArray(response.data)) {
          this.users.set(response.data);
          this.filterUsers();
        }
        this.isLoadingUsers.set(false);
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.isLoadingUsers.set(false);
      },
    });
  }

  filterUsers() {
    let filtered = this.users();

    // Search filter
    if (this.userSearchQuery()) {
      const query = this.userSearchQuery().toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.firstName.toLowerCase().includes(query) ||
          u.lastName.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (this.userRoleFilter() !== 'all') {
      filtered = filtered.filter((u) => u.role === this.userRoleFilter());
    }

    // Status filter
    if (this.userStatusFilter() !== 'all') {
      filtered = filtered.filter((u) => u.status === this.userStatusFilter());
    }

    this.filteredUsers.set(filtered);
  }

  onUserSearchChange() {
    this.filterUsers();
  }

  onUserRoleFilterChange() {
    this.filterUsers();
  }

  onUserStatusFilterChange() {
    this.filterUsers();
  }

  openUserModal(user?: User) {
    this.selectedUser.set(user || null);
    this.showUserModal.set(true);
  }

  closeUserModal() {
    this.showUserModal.set(false);
    this.selectedUser.set(null);
  }

  deleteUser(userId: number) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.http.delete<any>(`${this.apiUrl}/users/${userId}`).subscribe({
        next: () => {
          this.loadUsers();
        },
        error: (err) => console.error('Error deleting user:', err),
      });
    }
  }

  changeUserStatus(userId: number, newStatus: string) {
    this.http.patch<any>(`${this.apiUrl}/users/${userId}/status`, { status: newStatus }).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (err) => console.error('Error updating user status:', err),
    });
  }

  // ========== COURSES MANAGEMENT ==========
  loadCourses() {
    this.isLoadingCourses.set(true);
    this.http.get<any>(`${this.apiUrl}/courses`).subscribe({
      next: (response) => {
        if (response.data && Array.isArray(response.data)) {
          this.courses.set(response.data);
          this.filterCourses();
        }
        this.isLoadingCourses.set(false);
      },
      error: (err) => {
        console.error('Error loading courses:', err);
        this.isLoadingCourses.set(false);
      },
    });
  }

  filterCourses() {
    let filtered = this.courses();

    // Search filter
    if (this.courseSearchQuery()) {
      const query = this.courseSearchQuery().toLowerCase();
      filtered = filtered.filter(
        (c) => c.title.toLowerCase().includes(query) || c.instructor.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (this.courseCategoryFilter() !== 'all') {
      filtered = filtered.filter((c) => c.category === this.courseCategoryFilter());
    }

    // Status filter
    if (this.courseStatusFilter() !== 'all') {
      filtered = filtered.filter((c) => c.status === this.courseStatusFilter());
    }

    this.filteredCourses.set(filtered);
  }

  onCourseSearchChange() {
    this.filterCourses();
  }

  onCourseCategoryFilterChange() {
    this.filterCourses();
  }

  onCourseStatusFilterChange() {
    this.filterCourses();
  }

  openCourseModal(course?: Course) {
    this.selectedCourse.set(course || null);
    this.showCourseModal.set(true);
  }

  closeCourseModal() {
    this.showCourseModal.set(false);
    this.selectedCourse.set(null);
  }

  deleteCourse(courseId: number) {
    if (confirm('Are you sure you want to delete this course?')) {
      this.http.delete<any>(`${this.apiUrl}/courses/${courseId}`).subscribe({
        next: () => {
          this.loadCourses();
        },
        error: (err) => console.error('Error deleting course:', err),
      });
    }
  }

  changeCourseStatus(courseId: number, newStatus: string) {
    this.http
      .patch<any>(`${this.apiUrl}/courses/${courseId}/status`, { status: newStatus })
      .subscribe({
        next: () => {
          this.loadCourses();
        },
        error: (err) => console.error('Error updating course status:', err),
      });
  }

  // ========== ANALYTICS ==========
  loadAnalytics() {
    this.isLoadingAnalytics.set(true);
    this.http.get<any>(`${this.apiUrl}/admin/analytics`).subscribe({
      next: (response) => {
        if (response.data) {
          this.analytics.set(response.data);
        }
        this.isLoadingAnalytics.set(false);
      },
      error: (err) => {
        console.error('Error loading analytics:', err);
        this.isLoadingAnalytics.set(false);
      },
    });
  }

  exportAnalytics() {
    const data = this.analytics();
    if (!data) return;

    const csv = `
Platform Analytics Report
Generated: ${new Date().toLocaleDateString()}

Total Revenue: $${data.totalRevenue.toLocaleString()}
Total Enrollments: ${data.totalEnrollments}
Average Course Rating: ${data.avgCourseRating.toFixed(2)}/5

Top Courses:
${data.coursePerformance
  .map((c) => `${c.title},${c.enrollments} enrollments,$${c.revenue}`)
  .join('\n')}

Top Instructors:
${data.topInstructors
  .map((i) => `${i.name},${i.courses} courses,${i.students} students,$${i.revenue}`)
  .join('\n')}
    `;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${Date.now()}.csv`;
    link.click();
  }

  // Tab switching
  switchTab(tab: TabType) {
    this.activeTab.set(tab);
  }
}
