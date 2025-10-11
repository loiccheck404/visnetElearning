import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
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
  joinedDate: string;
}

interface PendingCourse {
  id: number;
  title: string;
  instructor: string;
  submittedDate: string;
}

interface Activity {
  type: string;
  action: string;
  time: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
})
export class AdminDashboardComponent implements OnInit {
  currentUser = signal<User | null>(null);

  platformStats = signal<PlatformStats>({
    totalUsers: 0,
    totalCourses: 0,
    totalInstructors: 0,
    totalStudents: 0,
  });

  recentUsers = signal<RecentUser[]>([]);
  pendingCourses = signal<PendingCourse[]>([]);
  recentActivity = signal<Activity[]>([]);

  showMobileMenu = signal(false);
  showUserDropdown = signal(false);

  private apiUrl = `${environment.apiUrl}`;

  constructor(private authService: AuthService, private router: Router, private http: HttpClient) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (!target.closest('.mobile-menu-toggle') && !target.closest('.nav-links')) {
      this.showMobileMenu.set(false);
    }

    if (!target.closest('.user-info') && !target.closest('.user-dropdown')) {
      this.showUserDropdown.set(false);
    }
  }

  toggleMobileMenu(event: Event) {
    event.stopPropagation();
    this.showMobileMenu.update((show) => !show);
  }

  toggleUserDropdown() {
    this.showUserDropdown.update((show) => !show);
    this.showMobileMenu.set(false);
  }

  closeUserDropdown() {
    this.showUserDropdown.set(false);
  }

  ngOnInit() {
    this.loadUserData();
    this.loadPlatformStats();
    this.loadPendingCourses();
    this.loadRecentUsers();
    this.loadRecentActivity();
  }

  loadUserData() {
    const user = this.authService.currentUserValue;
    if (user) {
      this.currentUser.set(user);
    }
  }

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
      error: (err) => console.error('Error loading stats:', err),
    });
  }

  loadPendingCourses() {
    this.http.get<any>(`${this.apiUrl}/courses/pending`).subscribe({
      next: (response) => {
        if (response.data && Array.isArray(response.data)) {
          this.pendingCourses.set(
            response.data.map((course: any) => ({
              id: course.id,
              title: course.title,
              instructor: `${course.instructor?.firstName || ''} ${
                course.instructor?.lastName || ''
              }`.trim(),
              submittedDate: this.formatDate(course.createdAt),
            }))
          );
        }
      },
      error: (err) => console.error('Error loading pending courses:', err),
    });
  }

  loadRecentUsers() {
    this.http.get<any>(`${this.apiUrl}/users?limit=4`).subscribe({
      next: (response) => {
        if (response.data && Array.isArray(response.data)) {
          this.recentUsers.set(
            response.data.map((user: any) => ({
              id: user.id,
              name: `${user.firstName} ${user.lastName}`,
              email: user.email,
              role: (user.role || 'student').toLowerCase(),
              joinedDate: this.formatDate(user.createdAt),
            }))
          );
        }
      },
      error: (err) => console.error('Error loading recent users:', err),
    });
  }

  loadRecentActivity() {
    this.http.get<any>(`${this.apiUrl}/admin/activities?limit=5`).subscribe({
      next: (response) => {
        if (response.data && Array.isArray(response.data)) {
          this.recentActivity.set(
            response.data.map((activity: any) => ({
              type: activity.type || 'user',
              action: activity.action || activity.description || 'Activity logged',
              time: this.formatDate(activity.createdAt || activity.timestamp),
            }))
          );
        }
      },
      error: (err) => console.error('Error loading recent activity:', err),
    });
  }

  approveCourse(courseId: number) {
    this.http.patch<any>(`${this.apiUrl}/courses/${courseId}/approve`, {}).subscribe({
      next: () => {
        console.log('Course approved:', courseId);
        this.loadPendingCourses();
      },
      error: (err) => console.error('Error approving course:', err),
    });
  }

  rejectCourse(courseId: number) {
    this.http.patch<any>(`${this.apiUrl}/courses/${courseId}/reject`, {}).subscribe({
      next: () => {
        console.log('Course rejected:', courseId);
        this.loadPendingCourses();
      },
      error: (err) => console.error('Error rejecting course:', err),
    });
  }

  manageUsers() {
    this.router.navigate(['/dashboard/admin/users']);
  }

  manageCourses() {
    this.router.navigate(['/dashboard/admin/courses']);
  }

  viewUser(userId: number) {
    this.router.navigate(['/dashboard/admin/users', userId]);
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  formatDate(dateString: string): string {
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
