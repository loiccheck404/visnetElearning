import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';

interface Course {
  id: number;
  title: string;
  instructor: string;
  progress: number;
  thumbnail: string;
  category: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  currentUser = signal<User | null>(null);

  // Mock data for now - will be replaced with API calls later
  enrolledCourses = signal<Course[]>([
    {
      id: 1,
      title: 'Introduction to Angular',
      instructor: 'John Doe',
      progress: 65,
      thumbnail: 'https://via.placeholder.com/300x200/667eea/ffffff?text=Angular',
      category: 'Web Development',
    },
    {
      id: 2,
      title: 'Node.js Fundamentals',
      instructor: 'Jane Smith',
      progress: 40,
      thumbnail: 'https://via.placeholder.com/300x200/764ba2/ffffff?text=Node.js',
      category: 'Backend Development',
    },
    {
      id: 3,
      title: 'PostgreSQL Database Design',
      instructor: 'Mike Johnson',
      progress: 80,
      thumbnail: 'https://via.placeholder.com/300x200/48bb78/ffffff?text=PostgreSQL',
      category: 'Database',
    },
  ]);

  recentActivity = signal([
    { type: 'completed', course: 'Angular Basics', date: '2 hours ago' },
    { type: 'started', course: 'Node.js Advanced', date: '1 day ago' },
    { type: 'quiz', course: 'Database Design', date: '2 days ago' },
  ]);

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.loadUserData();
  }

  loadUserData() {
    const user = this.authService.currentUserValue;
    if (user) {
      this.currentUser.set(user);
    }
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
    // TODO: Navigate to course detail page
    console.log('Continue course:', courseId);
  }

  viewAllCourses() {
    // TODO: Navigate to courses page
    console.log('View all courses');
  }
}
