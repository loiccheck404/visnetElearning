import { Component, OnInit, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CourseService } from '../../core/services/course.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { ToastService } from '../../core/services/toast.service';
import { StudentService, InstructorStudent } from '../../core/services/student.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  enrolled_courses: number;
  progress: number;
  last_active: string;
  enrolled_at: string;
}

interface CourseEnrollment {
  student_id: number;
  student_name: string;
  student_email: string;
  enrolled_at: string;
  progress: number;
  last_accessed_at: string;
  course_title: string;
  is_unenrolled: boolean; // ADD THIS LINE
}

@Component({
  selector: 'app-instructor-students',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ThemeToggleComponent,
    FormsModule,
    ConfirmationDialogComponent,
  ],
  templateUrl: './instructor-students.component.html',
  styleUrls: ['./instructor-students.component.scss'],
})
export class InstructorStudentsComponent implements OnInit {
  currentUser = signal<any>(null);
  students = signal<CourseEnrollment[]>([]);
  courses = signal<any[]>([]);
  isLoading = signal(true);
  selectedCourseId = signal<number | null>(null);
  searchQuery = signal('');
  showMobileMenu = signal(false);
  showUserDropdown = signal(false);
  showLogoutDialog = signal(false);

  // Filtered students based on search
  filteredStudents = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const allStudents = this.students(); // Don't filter out unenrolled students

    if (!query) return allStudents;

    return allStudents.filter(
      (student) =>
        student.student_name.toLowerCase().includes(query) ||
        student.student_email.toLowerCase().includes(query) ||
        student.course_title.toLowerCase().includes(query)
    );
  });

  // Statistics
  totalStudents = computed(() => {
    // COUNT ALL STUDENTS (don't filter by is_unenrolled)
    const allEnrollments = this.students();
    console.log('Students page - all students:', allEnrollments);

    // If a course is selected, count enrollments in that course
    // Otherwise count unique students across all courses
    if (this.selectedCourseId()) {
      return allEnrollments.length;
    }
    const uniqueStudents = new Set(allEnrollments.map((s) => s.student_id));
    console.log('Students page - unique IDs:', Array.from(uniqueStudents));
    console.log('Students page - unique count:', uniqueStudents.size);
    return uniqueStudents.size;
  });

  averageProgress = computed(() => {
    // Calculate progress for all students
    const allStudents = this.students();
    if (allStudents.length === 0) return 0;
    const total = allStudents.reduce((sum, student) => sum + (student.progress || 0), 0);
    return Math.round(total / allStudents.length);
  });

  constructor(
    private authService: AuthService,
    private courseService: CourseService,
    private studentService: StudentService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {}

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
    this.loadCourses();

    // Check if courseId is in query params
    this.route.queryParams.subscribe((params) => {
      if (params['courseId']) {
        this.selectedCourseId.set(Number(params['courseId']));
      }
      this.loadStudents();
    });
  }

  loadUserData() {
    const user = this.authService.currentUserValue;
    if (user) {
      this.currentUser.set(user);
    }
  }

  loadDashboardData() {
    this.isLoading.set(true);

    // Check if courseId is in query params
    this.route.queryParams.subscribe((params) => {
      if (params['courseId']) {
        this.selectedCourseId.set(Number(params['courseId']));
      }

      forkJoin({
        courses: this.courseService.getInstructorCourses().pipe(
          catchError((err) => {
            console.error('Error loading courses:', err);
            return of({ status: 'ERROR', data: { courses: [] } });
          })
        ),
        students: this.studentService
          .getInstructorStudents(this.selectedCourseId() || undefined)
          .pipe(
            catchError((err) => {
              console.error('Error loading students:', err);
              return of({ status: 'ERROR', data: { students: [] } });
            })
          ),
      }).subscribe({
        next: (results) => {
          if (results.courses.status === 'SUCCESS') {
            this.courses.set(results.courses.data.courses);
          }

          if (results.students.status === 'SUCCESS') {
            this.students.set(results.students.data.students);
          }

          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error loading dashboard data:', err);
          this.toastService.error('Failed to load students');
          this.isLoading.set(false);
        },
      });
    });
  }

  loadCourses() {
    this.courseService.getInstructorCourses().subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS') {
          this.courses.set(response.data.courses);
        }
      },
      error: (err) => {
        console.error('Error loading courses:', err);
      },
    });
  }

  loadStudents() {
    this.isLoading.set(true);
    this.studentService.getInstructorStudents(this.selectedCourseId() || undefined).subscribe({
      next: (response) => {
        console.log('Student Response:', response); // ADD THIS LINE TO DEBUG
        if (response.status === 'SUCCESS') {
          // Check if the data structure matches what you expect
          const students = response.data.students;
          console.log('Mapped Students:', students); // ADD THIS TOO
          this.students.set(students);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading students:', err);
        this.toastService.error('Failed to load students');
        this.isLoading.set(false);
      },
    });
  }

  onCourseFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const courseId = select.value ? Number(select.value) : null;
    this.selectedCourseId.set(courseId);
    this.loadStudents();
  }

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  viewStudentProfile(studentId: number) {
    this.router.navigate(['/dashboard/instructor/students/profile', studentId]);
  }

  sendMessage(student: CourseEnrollment, event: Event) {
    event.stopPropagation();
    this.toastService.info(`Send message to ${student.student_name} - Coming soon!`);
  }

  getProgressColor(progress: number): string {
    if (progress >= 75) return '#48bb78';
    if (progress >= 50) return '#4299e1';
    if (progress >= 25) return '#ed8936';
    return '#fc8181';
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

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  isStudentUnenrolled(student: CourseEnrollment): boolean {
    return student.is_unenrolled ?? false;
  }

  goBackToCourses() {
    this.router.navigate(['/dashboard/instructor/courses']);
  }

  getSelectedCourseName(): string {
    if (!this.selectedCourseId()) return 'Students';
    const course = this.courses().find((c) => c.id === this.selectedCourseId());
    return course ? course.title : 'Students';
  }

  onLogout() {
    this.showLogoutDialog.set(true);
  }

  confirmLogout() {
    this.showLogoutDialog.set(false);
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  cancelLogout() {
    this.showLogoutDialog.set(false);
  }

  goBackToDashboard() {
    this.router.navigate(['/dashboard/instructor']);
  }
}
