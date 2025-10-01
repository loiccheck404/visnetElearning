import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CourseService, Course } from '../../core/services/course.service';
import { AuthService } from '../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private courseService: CourseService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    const courseId = this.route.snapshot.paramMap.get('id');
    if (courseId) {
      this.loadCourseDetails(courseId);
    }
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

  enrollCourse() {
    if (!this.authService.isAuthenticated) {
      this.router.navigate(['/auth/login']);
      return;
    }
    // TODO: Implement enrollment
    console.log('Enroll in course:', this.course()?.id);
  }

  getTotalDuration(): string {
    const total = this.lessons().reduce((sum, lesson) => sum + (lesson.duration_minutes || 0), 0);
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
}
