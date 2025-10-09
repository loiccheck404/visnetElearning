import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { CourseService } from '../../core/services/course.service';
import { ActivityService } from '../../core/services/activity.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface InstructorCourse {
  id: number;
  title: string;
  student_count: number;
  status: 'published' | 'draft';
  progress: number;
}

interface InstructorActivity {
  id: number;
  activity_type: string;
  course_title: string;
  student_name: string;
  created_at: string;
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
  myCourses = signal<InstructorCourse[]>([]);
  recentActivity = signal<any[]>([]);
  isLoading = signal(true);

  // Computed values
  totalStudents = computed(() => {
    return this.myCourses().reduce((sum, course) => sum + (Number(course.student_count) || 0), 0);
  });

  publishedCourses = computed(() => {
    return this.myCourses().filter((c) => c.status === 'published').length;
  });

  constructor(
    private authService: AuthService,
    private router: Router,
    private courseService: CourseService,
    private activityService: ActivityService
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadDashboardData();
  }

  loadUserData() {
    const user = this.authService.currentUserValue;
    if (user) {
      this.currentUser.set(user);
    }
  }

  loadDashboardData() {
    this.isLoading.set(true);

    forkJoin({
      courses: this.courseService.getInstructorCourses().pipe(
        catchError((err) => {
          console.error('Error loading courses:', err);
          return of({ status: 'ERROR', data: { courses: [] } });
        })
      ),
      activities: this.activityService.getInstructorActivities(10).pipe(
        catchError((err) => {
          console.error('Error loading activities:', err);
          return of({ status: 'ERROR', data: { activities: [] } });
        })
      ),
    }).subscribe({
      next: (results) => {
        // Load courses
        if (results.courses.status === 'SUCCESS') {
          const courses = results.courses.data.courses.map((course: any) => ({
            id: course.id,
            title: course.title,
            student_count: course.student_count || 0,
            status: course.status,
            progress: this.calculateCourseProgress(course),
          }));
          this.myCourses.set(courses);
        }

        // Load activities
        if (results.activities.status === 'SUCCESS') {
          const activities = results.activities.data.activities.map(
            (activity: InstructorActivity) => ({
              type: this.mapActivityType(activity.activity_type),
              student: activity.student_name,
              course: activity.course_title,
              date: this.getRelativeTime(activity.created_at),
            })
          );
          this.recentActivity.set(activities);
        }

        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading dashboard:', err);
        this.isLoading.set(false);
      },
    });
  }

  calculateCourseProgress(course: any): number {
    // Calculate based on whether course has lessons, content, etc.
    // For now, return 100% if published, 50% if has content but draft
    if (course.status === 'published') return 100;
    if (course.description && course.title) return 50;
    return 25;
  }

  mapActivityType(activityType: string): 'enrollment' | 'question' | 'completion' {
    if (activityType === 'course_enrolled') return 'enrollment';
    if (activityType === 'course_completed' || activityType === 'lesson_completed')
      return 'completion';
    return 'question';
  }

  getRelativeTime(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
    if (diffHours < 24) return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    if (diffDays < 7) return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    return then.toLocaleDateString();
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  getTotalStudents(): number {
    return this.totalStudents();
  }

  getPublishedCourses(): number {
    return this.publishedCourses();
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  createCourse() {
    this.router.navigate(['/dashboard/instructor/create-course']);
  }

  editCourse(courseId: number) {
    // Navigate to create-course page with course ID for editing
    this.router.navigate(['/dashboard/instructor/create-course'], {
      queryParams: { courseId: courseId },
    });
  }

  viewStudents(courseId: number) {
    this.router.navigate(['/dashboard/instructor/students'], {
      queryParams: { courseId: courseId },
    });
  }
}
