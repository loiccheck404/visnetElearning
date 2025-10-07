import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { EnrollmentService } from '../../core/services/enrollment.service';
import { ProgressService } from '../../core/services/progress.service';
import { ActivityService, StudentActivity } from '../../core/services/activity.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface EnrolledCourse {
  id: number;
  title: string;
  instructor_name: string;
  progress: number;
  thumbnail_url: string;
  category_name: string;
  enrolled_at: string;
  last_accessed_at: string;
}

interface Activity {
  type: 'completed' | 'started' | 'quiz';
  course: string;
  date: string;
  timestamp: Date;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  currentUser = signal<User | null>(null);
  enrolledCourses = signal<EnrolledCourse[]>([]);
  recentActivity = signal<Activity[]>([]);
  isLoading = signal(true);

  // Computed statistics
  totalEnrolled = computed(() => this.enrolledCourses().length);

  averageProgress = computed(() => {
    const courses = this.enrolledCourses();
    if (courses.length === 0) return 0;
    const total = courses.reduce((sum, course) => sum + (course.progress || 0), 0);
    return Math.round(total / courses.length);
  });

  totalLearningTime = signal('0h');

  completedCourses = computed(() => {
    return this.enrolledCourses().filter((course) => course.progress >= 100).length;
  });

  inProgressCourses = computed(() => {
    return this.enrolledCourses().filter((course) => course.progress > 0 && course.progress < 100)
      .length;
  });

  constructor(
    private authService: AuthService,
    private router: Router,
    private enrollmentService: EnrollmentService,
    private progressService: ProgressService,
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

    // Load enrollments, progress data, and activities with fallback
    forkJoin({
      enrollments: this.enrollmentService.getMyEnrollments().pipe(
        catchError((err) => {
          console.error('Error loading enrollments:', err);
          return of({ status: 'ERROR', data: { courses: [] } });
        })
      ),
      progress: this.progressService.getMyProgress().pipe(
        catchError((err) => {
          console.error('Error loading progress:', err);
          return of({
            status: 'ERROR',
            data: { courses: [], totalLearningTime: { formatted: '0h' } },
          });
        })
      ),
      activities: this.activityService.getMyActivities(10).pipe(
        catchError((err) => {
          console.error('Error loading activities:', err);
          return of({ status: 'ERROR', data: { activities: [] } });
        })
      ),
    }).subscribe({
      next: (results) => {
        console.log('Dashboard data loaded:', results);

        // Load enrolled courses
        if (results.enrollments.status === 'SUCCESS' && results.enrollments.data.courses) {
          const courses = results.enrollments.data.courses.map((course: any) => ({
            id: course.id,
            title: course.title,
            instructor_name: course.instructor_name,
            category_name: course.category_name,
            progress: Math.round(course.progress || 0),
            thumbnail_url: course.thumbnail_url || this.getPlaceholderImage(course.category_name),
            enrolled_at: course.enrolled_at,
            last_accessed_at: course.last_accessed_at,
          }));
          this.enrolledCourses.set(courses);
          console.log('Enrolled courses set:', courses);
        }

        // Set learning time from progress data
        if (results.progress.status === 'SUCCESS' && results.progress.data.totalLearningTime) {
          this.totalLearningTime.set(results.progress.data.totalLearningTime.formatted);
        }

        // Set real activities from backend
        if (results.activities.status === 'SUCCESS' && results.activities.data.activities) {
          const activities = results.activities.data.activities.map(
            (activity: StudentActivity) => ({
              type: this.mapActivityType(activity.activity_type),
              course: activity.course_title,
              date: this.getRelativeTime(activity.created_at),
              timestamp: new Date(activity.created_at),
            })
          );
          this.recentActivity.set(activities);
          console.log('Activities set:', activities);
        } else {
          // Fallback: Generate activities from enrollment data
          this.generateActivitiesFromEnrollments();
        }

        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.isLoading.set(false);
      },
    });
  }

  generateActivitiesFromEnrollments() {
    const courses = this.enrolledCourses();
    if (courses.length === 0) return;

    const activities: Activity[] = courses.slice(0, 3).map((course) => ({
      type: 'started' as const,
      course: course.title,
      date: this.getRelativeTime(course.enrolled_at),
      timestamp: new Date(course.enrolled_at),
    }));

    this.recentActivity.set(activities);
  }

  mapActivityType(activityType: string): 'completed' | 'started' | 'quiz' {
    if (activityType === 'lesson_completed' || activityType === 'course_completed') {
      return 'completed';
    } else if (activityType === 'quiz_completed' || activityType === 'quiz_started') {
      return 'quiz';
    }
    return 'started';
  }

  getRelativeTime(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    } else {
      return then.toLocaleDateString();
    }
  }

  getPlaceholderImage(category: string): string {
    const colors: Record<string, string> = {
      'Web Development': '667eea',
      'Backend Development': '764ba2',
      Database: '48bb78',
      'Data Science': '4299e1',
      Design: 'ed8936',
      Business: 'f6ad55',
      Marketing: 'fc8181',
    };

    const color = colors[category] || '8b7dff';
    return `https://via.placeholder.com/300x200/${color}/ffffff?text=${encodeURIComponent(
      category
    )}`;
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

  continueCourse(courseId: number) {
    this.router.navigate(['/dashboard/courses', courseId]);
  }

  viewAllCourses() {
    this.router.navigate(['/dashboard/courses']);
  }
}
