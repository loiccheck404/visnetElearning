import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';

interface Course {
  id: number;
  title: string;
  students: number;
  progress: number;
  status: 'published' | 'draft';
}

@Component({
  selector: 'app-instructor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent],
  templateUrl: './instructor-dashboard.component.html',
  styleUrls: ['./instructor-dashboard.component.scss'],
})
export class InstructorDashboardComponent implements OnInit {
  currentUser = signal<User | null>(null);

  myCourses = signal<Course[]>([
    {
      id: 1,
      title: 'Introduction to Angular',
      students: 234,
      progress: 100,
      status: 'published',
    },
    {
      id: 2,
      title: 'Advanced TypeScript',
      students: 156,
      progress: 100,
      status: 'published',
    },
    {
      id: 3,
      title: 'Node.js Masterclass',
      students: 0,
      progress: 45,
      status: 'draft',
    },
  ]);

  recentActivity = signal([
    {
      type: 'enrollment',
      student: 'John Doe',
      course: 'Introduction to Angular',
      date: '2 hours ago',
    },
    { type: 'question', student: 'Jane Smith', course: 'Advanced TypeScript', date: '5 hours ago' },
    {
      type: 'completion',
      student: 'Mike Johnson',
      course: 'Introduction to Angular',
      date: '1 day ago',
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

  getTotalStudents(): number {
    return this.myCourses().reduce((sum, course) => sum + course.students, 0);
  }

  getPublishedCourses(): number {
    return this.myCourses().filter((c) => c.status === 'published').length;
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  createCourse() {
    console.log('Create new course');
  }

  editCourse(courseId: number) {
    console.log('Edit course:', courseId);
  }

  viewStudents(courseId: number) {
    console.log('View students for course:', courseId);
  }
}
