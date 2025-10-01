import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';

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
    totalUsers: 1247,
    totalCourses: 89,
    totalInstructors: 45,
    totalStudents: 1202,
  });

  recentUsers = signal<RecentUser[]>([
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      role: 'student',
      joinedDate: '2 hours ago',
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'instructor',
      joinedDate: '5 hours ago',
    },
    {
      id: 3,
      name: 'Mike Johnson',
      email: 'mike@example.com',
      role: 'student',
      joinedDate: '1 day ago',
    },
    {
      id: 4,
      name: 'Sarah Williams',
      email: 'sarah@example.com',
      role: 'instructor',
      joinedDate: '2 days ago',
    },
  ]);

  pendingCourses = signal([
    {
      id: 1,
      title: 'Machine Learning Basics',
      instructor: 'Dr. Smith',
      submittedDate: '1 day ago',
    },
    {
      id: 2,
      title: 'Web Design Fundamentals',
      instructor: 'Jane Doe',
      submittedDate: '3 days ago',
    },
  ]);

  recentActivity = signal([
    { type: 'user', action: 'New user registration', user: 'John Doe', time: '2 hours ago' },
    { type: 'course', action: 'Course published', course: 'Angular Advanced', time: '5 hours ago' },
    {
      type: 'approval',
      action: 'Course approved',
      course: 'React Fundamentals',
      time: '1 day ago',
    },
  ]);

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.loadUserData();
  }

  loadUserData() {
    const user = this.authService.currentUserValue;
    if (user) {
      this.currentUser.set(user);
    }
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

  manageUsers() {
    console.log('Navigate to user management');
  }

  manageCourses() {
    console.log('Navigate to course management');
  }

  approveCourse(courseId: number) {
    console.log('Approve course:', courseId);
  }

  rejectCourse(courseId: number) {
    console.log('Reject course:', courseId);
  }

  viewUser(userId: number) {
    console.log('View user:', userId);
  }
}
