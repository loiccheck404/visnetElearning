import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StudentService } from '../../core/services/student.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { ToastService } from '../../core/services/toast.service';

interface StudentProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
}

interface StudentEnrollment {
  id: number;
  course_id: number;
  course_title: string;
  thumbnail_url?: string;
  level: string;
  category_name: string;
  enrolled_at: string;
  progress: number;
  last_accessed_at: string;
  completed_at?: string;
}

interface StudentStatistics {
  total_courses: number;
  average_progress: number;
  completed_courses: number;
  total_time_spent: number;
}

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent],
  templateUrl: './student-profile.component.html',
  styleUrls: ['./student-profile.component.scss'],
})
export class StudentProfileComponent implements OnInit {
  currentUser = signal<any>(null);
  student = signal<StudentProfile | null>(null);
  enrollments = signal<StudentEnrollment[]>([]);
  statistics = signal<StudentStatistics | null>(null);
  isLoading = signal(true);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private studentService: StudentService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.route.params.subscribe((params) => {
      const studentId = Number(params['id']);
      if (studentId) {
        this.loadStudentProfile(studentId);
      }
    });
  }

  loadUserData() {
    const user = this.authService.currentUserValue;
    if (user) {
      this.currentUser.set(user);
    }
  }

  loadStudentProfile(studentId: number) {
    this.isLoading.set(true);
    this.studentService.getStudentProfile(studentId).subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS') {
          this.student.set(response.data.student);
          this.enrollments.set(response.data.enrollments);
          this.statistics.set(response.data.statistics);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading student profile:', err);
        this.toastService.error('Failed to load student profile');
        this.isLoading.set(false);
      },
    });
  }

  viewCourseDetails(courseId: number) {
    const student = this.student();
    if (student) {
      this.router.navigate(['/dashboard/instructor/students/detail'], {
        queryParams: { studentId: student.id, courseId: courseId },
      });
    }
  }

  sendMessage() {
    const student = this.student();
    if (student) {
      this.toastService.info(`Send message to ${student.first_name} ${student.last_name} - Coming soon!`);
    }
  }

  goBack() {
    this.router.navigate(['/dashboard/instructor/students']);
  }

  getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  formatTimeSpent(seconds: number): string {
    if (!seconds) return '0h';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  getProgressColor(progress: number): string {
    if (progress >= 75) return '#48bb78';
    if (progress >= 50) return '#4299e1';
    if (progress >= 25) return '#ed8936';
    return '#fc8181';
  }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}