import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CourseService } from '../../core/services/course.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { ToastService } from '../../core/services/toast.service';

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
}

@Component({
  selector: 'app-instructor-students',
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent, FormsModule],
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

  // Filtered students based on search
  filteredStudents = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.students();

    return this.students().filter(
      (student) =>
        student.student_name.toLowerCase().includes(query) ||
        student.student_email.toLowerCase().includes(query) ||
        student.course_title.toLowerCase().includes(query)
    );
  });

  // Statistics
  totalStudents = computed(() => {
    const uniqueStudents = new Set(this.students().map((s) => s.student_id));
    return uniqueStudents.size;
  });

  averageProgress = computed(() => {
    const students = this.students();
    if (students.length === 0) return 0;
    const total = students.reduce((sum, student) => sum + (student.progress || 0), 0);
    return Math.round(total / students.length);
  });

  constructor(
    private authService: AuthService,
    private courseService: CourseService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {}

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

    // For now, we'll use mock data. You'll need to create a backend endpoint
    // that returns students enrolled in instructor's courses
    setTimeout(() => {
      const mockStudents: CourseEnrollment[] = [
        {
          student_id: 1,
          student_name: 'John Doe',
          student_email: 'john@example.com',
          course_title: 'Sharp',
          enrolled_at: '2025-09-15T10:30:00Z',
          progress: 75,
          last_accessed_at: '2025-10-08T14:20:00Z',
        },
        {
          student_id: 2,
          student_name: 'Jane Smith',
          student_email: 'jane@example.com',
          course_title: 'Kokis',
          enrolled_at: '2025-09-20T09:15:00Z',
          progress: 45,
          last_accessed_at: '2025-10-09T11:45:00Z',
        },
        {
          student_id: 3,
          student_name: 'Mike Johnson',
          student_email: 'mike@example.com',
          course_title: 'Memes',
          enrolled_at: '2025-09-25T16:00:00Z',
          progress: 90,
          last_accessed_at: '2025-10-09T09:30:00Z',
        },
      ];

      this.students.set(mockStudents);
      this.isLoading.set(false);
    }, 500);
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
    this.toastService.info('Student profile view coming soon!');
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

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}