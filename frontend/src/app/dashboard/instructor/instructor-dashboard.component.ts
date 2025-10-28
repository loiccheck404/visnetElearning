import { Component, OnInit, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { CourseService } from '../../core/services/course.service';
import { ActivityService } from '../../core/services/activity.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StudentService } from '../../core/services/student.service';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';

interface InstructorCourse {
  id: number;
  title: string;
  student_count: number;
  status: 'published' | 'draft' | 'pending';
  progress: number;
  rejection_reason?: string;
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
  imports: [CommonModule, RouterModule, ThemeToggleComponent, ConfirmationDialogComponent],
  templateUrl: './instructor-dashboard.component.html',
  styleUrls: ['./instructor-dashboard.component.scss'],
})
export class InstructorDashboardComponent implements OnInit {
  uniqueStudentCount = signal(0); // ADD THIS
  currentUser = signal<User | null>(null);
  myCourses = signal<InstructorCourse[]>([]);
  recentActivity = signal<any[]>([]);
  isLoading = signal(true);

  // Computed values
  totalStudents = computed(() => {
    return this.uniqueStudentCount();
  });

  publishedCourses = computed(() => {
    return this.myCourses().filter((c) => c.status === 'published').length;
  });

  showMobileMenu = signal(false);
  showUserDropdown = signal(false);
  showLogoutDialog = signal(false);
  showSubmitCourseDialog = signal(false);
  selectedCourseForSubmit = signal<number | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router,
    private courseService: CourseService,
    private activityService: ActivityService,
    private studentService: StudentService
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    // Don't close if clicking on the hamburger button or inside the menu
    if (!target.closest('.mobile-menu-toggle') && !target.closest('.nav-links')) {
      this.showMobileMenu.set(false);
    }

    // Close user dropdown when clicking outside
    if (!target.closest('.user-info') && !target.closest('.user-dropdown')) {
      this.showUserDropdown.set(false);
    }
  }

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
      students: this.studentService.getInstructorStudents().pipe(
        catchError((err) => {
          console.error('Error loading students:', err);
          return of({ status: 'ERROR', data: { students: [] } });
        })
      ),
    }).subscribe({
      next: (results) => {
        // Load courses with rejection_reason
        if (results.courses.status === 'SUCCESS') {
          const courses = results.courses.data.courses.map((course: any) => ({
            id: course.id,
            title: course.title,
            student_count: course.student_count || 0,
            status: course.status,
            progress: this.calculateCourseProgress(course),
            rejection_reason: course.rejection_reason || null, // INCLUDE THIS
          }));

          console.log('Loaded courses:', courses); // Debug
          this.myCourses.set(courses);
        }

        // Load activities (unchanged)
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

        // Calculate unique students (unchanged)
        if (results.students.status === 'SUCCESS') {
          const allEnrollments = results.students.data.students;
          const uniqueStudentIds = new Set(allEnrollments.map((s: any) => s.student_id));
          this.uniqueStudentCount.set(uniqueStudentIds.size);
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

  mapActivityType(activityType: string): 'enrollment' | 'question' | 'completion' | 'unenrolled' {
    if (activityType === 'course_enrolled') return 'enrollment';
    if (activityType === 'course_completed' || activityType === 'lesson_completed')
      return 'completion';
    if (activityType === 'course_unenrolled') return 'unenrolled';
    if (activityType === 'quiz_completed' || activityType === 'quiz_started') return 'question';
    return 'question'; // default fallback
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

  confirmSubmitCourse(courseId: number): void {
    console.log('📋 Opening confirmation dialog for course:', courseId);
    this.selectedCourseForSubmit.set(courseId);
    this.showSubmitCourseDialog.set(true);
  }

  // Add method to submit:
  submitCourseForApproval(): void {
    const courseId = this.selectedCourseForSubmit();
    if (!courseId) {
      console.warn('⚠️ No course selected for submission');
      return;
    }

    console.log('📤 Submitting course for approval:', courseId);

    this.courseService.publishCourse(courseId).subscribe({
      next: (response) => {
        console.log('✅ Course submitted successfully:', response);

        // Close dialog
        this.showSubmitCourseDialog.set(false);
        this.selectedCourseForSubmit.set(null);

        // Reload dashboard to see updated status
        this.loadDashboardData();
      },
      error: (err) => {
        console.error('❌ Error submitting course:', err);
        this.showSubmitCourseDialog.set(false);

        // Show error in a user-friendly way (you could use a toast notification instead)
        const errorMsg = err.error?.message || 'Failed to submit course. Please try again.';

        // IMPORTANT: Do NOT use alert() here
        // Instead, you could set an error signal to show in UI
        // For now, just log it
        console.error('Error message:', errorMsg);
      },
    });
  }

  // Method 4: Cancel submission
  cancelSubmitCourse(): void {
    console.log('❌ Course submission canceled');
    this.showSubmitCourseDialog.set(false);
    this.selectedCourseForSubmit.set(null);
  }

  onSubmitButtonClick(courseId: number, event: Event): void {
    // CRITICAL: Stop all propagation
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    // Additional safety: Check if it's a real click event
    if (event.type === 'click') {
      console.log('🔘 Submit button clicked for course:', courseId);
      this.confirmSubmitCourse(courseId);
    }

    // Return false to be extra sure
    return;
  }
}
