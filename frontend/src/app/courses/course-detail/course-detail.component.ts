import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CourseService, Course } from '../../core/services/course.service';
import { AuthService } from '../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ToastService } from '../../core/services/toast.service';
import { EnrollmentService } from '../../core/services/enrollment.service';

interface Lesson {
  id: number;
  title: string;
  description: string;
  duration_minutes: number;
  order_index: number;
  is_preview: boolean;
}

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LoadingSpinnerComponent],
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.scss'],
})
export class CourseDetailComponent implements OnInit {
  course = signal<Course | null>(null);
  lessons = signal<Lesson[]>([]);
  isLoading = signal(true);
  isEnrolled = signal(false);
  enrolling = signal<boolean>(false);
  currentUser = signal<any>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    public authService: AuthService,
    private enrollmentService: EnrollmentService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    const courseId = this.route.snapshot.paramMap.get('id');
    if (courseId) {
      this.loadCourseDetails(courseId);
    }
    this.loadUserData();
    this.loadCourse();
  }

  loadUserData() {
    const user = this.authService.getCurrentUser();
    this.currentUser.set(user);
  }

  loadCourse() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/dashboard/courses']);
      return;
    }

    this.isLoading.set(true);
    this.courseService.getCourseById(id).subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS') {
          this.course.set(response.data.course);
          this.lessons.set(response.data.lessons);
          this.checkEnrollment(response.data.course.id);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading course:', error);
        this.toastService.error('Failed to load course details');
        this.isLoading.set(false);
      },
    });
  }

  checkEnrollment(courseId: number) {
    if (!this.currentUser() || this.currentUser().role !== 'student') {
      return;
    }

    this.enrollmentService.checkEnrollment(courseId).subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS') {
          this.isEnrolled.set(response.data.isEnrolled);
        }
      },
      error: (error) => console.error('Error checking enrollment:', error),
    });
  }

  enrollInCourse() {
    if (!this.currentUser()) {
      this.toastService.warning('Please login to enroll in this course');
      this.router.navigate(['/auth/login']);
      return;
    }

    if (this.currentUser().role !== 'student') {
      this.toastService.info('Only students can enroll in courses');
      return;
    }

    const courseId = this.course()?.id;
    if (!courseId) return;

    this.enrolling.set(true);
    this.enrollmentService.enrollInCourse(courseId).subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS') {
          this.toastService.success('Successfully enrolled in course!');
          this.isEnrolled.set(true);
        }
        this.enrolling.set(false);
      },
      error: (error) => {
        console.error('Enrollment error:', error);
        this.toastService.error(error.error?.message || 'Failed to enroll in course');
        this.enrolling.set(false);
      },
    });
  }

  loadCourseDetails(id: string) {
    this.isLoading.set(true);
    this.courseService.getCourseById(id).subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS') {
          this.course.set(response.data.course);
          this.lessons.set(response.data.lessons || []);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load course:', error);
        this.isLoading.set(false);
      },
    });
  }

  startCourse() {
    const firstLesson = this.lessons()[0];
    if (firstLesson) {
      // Navigate to lesson viewer (implement this later)
      this.toastService.info('Lesson viewer coming soon!');
    }
  }

  goBack() {
    this.router.navigate(['/dashboard/courses']);
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  getTotalDuration(): string {
    const total = this.lessons().reduce((sum, lesson) => sum + (lesson.duration_minutes || 0), 0);
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
}
