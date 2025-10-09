import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CourseService } from '../../core/services/course.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { ToastService } from '../../core/services/toast.service';

interface InstructorCourse {
  id: number;
  title: string;
  student_count: number;
  status: 'published' | 'draft';
  category_name: string;
  created_at: string;
  enrollment_count: number;
}

@Component({
  selector: 'app-instructor-courses',
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent, ConfirmationDialogComponent],
  templateUrl: './instructor-courses.component.html',
  styleUrls: ['./instructor-courses.component.scss'],
})
export class InstructorCoursesComponent implements OnInit {
  currentUser = signal<any>(null);
  courses = signal<InstructorCourse[]>([]);
  isLoading = signal(true);
  showDeleteDialog = signal(false);
  selectedCourseForDelete = signal<InstructorCourse | null>(null);
  isDeleting = signal(false);
  filterStatus = signal<string>('all');

  // Filtered courses based on status
  filteredCourses = signal<InstructorCourse[]>([]);

  constructor(
    private courseService: CourseService,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadCourses();
  }

  loadUserData() {
    const user = this.authService.currentUserValue;
    if (user) {
      this.currentUser.set(user);
    }
  }

  loadCourses() {
    this.isLoading.set(true);
    this.courseService.getInstructorCourses().subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS') {
          this.courses.set(response.data.courses);
          this.applyFilter();
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading courses:', err);
        this.toastService.error('Failed to load courses');
        this.isLoading.set(false);
      },
    });
  }

  applyFilter() {
    const filter = this.filterStatus();
    if (filter === 'all') {
      this.filteredCourses.set(this.courses());
    } else {
      this.filteredCourses.set(this.courses().filter((c) => c.status === filter));
    }
  }

  setFilter(status: string) {
    this.filterStatus.set(status);
    this.applyFilter();
  }

  createCourse() {
    this.router.navigate(['/dashboard/instructor/create-course']);
  }

  editCourse(courseId: number) {
    this.router.navigate(['/dashboard/instructor/create-course'], {
      queryParams: { courseId: courseId },
    });
  }

  viewCourse(courseId: number) {
    this.router.navigate(['/dashboard/courses', courseId]);
  }

  viewStudents(courseId: number) {
    this.router.navigate(['/dashboard/instructor/students'], {
      queryParams: { courseId: courseId },
    });
  }

  confirmDelete(course: InstructorCourse, event: Event) {
    event.stopPropagation();
    this.selectedCourseForDelete.set(course);
    this.showDeleteDialog.set(true);
  }

  cancelDelete() {
    this.showDeleteDialog.set(false);
    this.selectedCourseForDelete.set(null);
  }

  deleteCourse() {
    const course = this.selectedCourseForDelete();
    if (!course) return;

    this.isDeleting.set(true);
    this.courseService.deleteCourse(course.id).subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS') {
          this.toastService.success('Course deleted successfully');
          const updatedCourses = this.courses().filter((c) => c.id !== course.id);
          this.courses.set(updatedCourses);
          this.applyFilter();
          this.showDeleteDialog.set(false);
          this.selectedCourseForDelete.set(null);
        }
        this.isDeleting.set(false);
      },
      error: (err) => {
        console.error('Error deleting course:', err);
        this.toastService.error('Failed to delete course');
        this.isDeleting.set(false);
      },
    });
  }

  publishCourse(courseId: number, event: Event) {
    event.stopPropagation();
    this.courseService.publishCourse(courseId).subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS') {
          this.toastService.success('Course published successfully');
          this.loadCourses();
        }
      },
      error: (err) => {
        console.error('Error publishing course:', err);
        this.toastService.error('Failed to publish course');
      },
    });
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  getStatusColor(status: string): string {
    return status === 'published' ? 'success' : 'warning';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}