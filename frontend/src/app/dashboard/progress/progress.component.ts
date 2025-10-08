import { Component, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ProgressService } from '../../core/services/progress.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent],
  templateUrl: './progress.component.html',
  styleUrl: './progress.component.scss',
})
export class ProgressComponent implements OnInit {
  currentUser = signal<any>(null);
  enrolledCourses = signal<any[]>([]);
  loading = signal<boolean>(false);
  stats = signal({
    totalCourses: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    averageProgress: 0,
    totalTimeSpent: 0,
  });
  showMobileMenu = signal(false);
  showUserDropdown = signal(false);

  constructor(
    private progressService: ProgressService,
    private authService: AuthService,
    private router: Router
  ) {}

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    // Don't close if clicking on the hamburger button or inside the menu
    if (!target.closest('.mobile-menu-toggle') && !target.closest('.nav-links')) {
      this.showMobileMenu.set(false);
    }
  }

  ngOnInit() {
    // Add a small delay to ensure proper initialization
    setTimeout(() => {
      this.loadUserData();
      this.loadProgress();
    }, 0);
  }

  loadUserData() {
    const user = this.authService.getCurrentUser();
    console.log('Progress - Current User:', user);
    this.currentUser.set(user);
  }

  loadProgress() {
    this.loading.set(true);
    this.progressService.getMyProgress().subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS') {
          this.enrolledCourses.set(response.data.courses);
          this.calculateStats(response.data.courses);
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading progress:', error);
        this.loading.set(false);
      },
    });
  }

  calculateStats(courses: any[]) {
    const totalCourses = courses.length;
    const completedCourses = courses.filter((c) => c.progress >= 100).length;
    const inProgressCourses = courses.filter((c) => c.progress > 0 && c.progress < 100).length;
    const averageProgress =
      totalCourses > 0
        ? Math.round(courses.reduce((sum, c) => sum + (c.progress || 0), 0) / totalCourses)
        : 0;

    this.stats.set({
      totalCourses,
      completedCourses,
      inProgressCourses,
      averageProgress,
      totalTimeSpent: 0, // Calculate from lesson progress if needed
    });
  }

  viewCourse(courseId: number) {
    this.router.navigate(['/dashboard/courses', courseId]);
  }

  continueCourse(courseId: number) {
    this.router.navigate(['/dashboard/courses', courseId]);
  }

  getProgressColor(progress: number): string {
    if (progress >= 100) return '#48bb78';
    if (progress >= 50) return '#4299e1';
    return '#ed8936';
  }

  getProgressLabel(progress: number): string {
    if (progress >= 100) return 'Completed';
    if (progress > 0) return 'In Progress';
    return 'Not Started';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
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
    this.showMobileMenu.set(false);
    this.showUserDropdown.set(false);
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }
}
