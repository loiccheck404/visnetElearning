import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CourseService, Course, Category, CourseFilters } from '../../core/services/course.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-course-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.scss'],
})
export class CourseListComponent implements OnInit {
  courses = signal<Course[]>([]);
  categories = signal<Category[]>([]);
  isLoading = signal(true);

  filters: CourseFilters = {
    page: 1,
    limit: 9,
  };

  totalPages = signal(1);
  searchTerm = '';
  router: any;

  constructor(private courseService: CourseService) {}

  ngOnInit() {
    this.loadCategories();
    this.loadCourses();
  }

  loadCategories() {
    this.courseService.getCategories().subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS') {
          this.categories.set(response.data.categories);
        }
      },
      error: (error) => console.error('Failed to load categories:', error),
    });
  }

  loadCourses() {
    this.isLoading.set(true);
    this.courseService.getAllCourses(this.filters).subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS') {
          this.courses.set(response.data.courses);
          this.totalPages.set(response.data.totalPages);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load courses:', error);
        this.isLoading.set(false);
      },
    });
  }

  onCategoryFilter(categoryId: number | null) {
    this.filters.category = categoryId || undefined;
    this.filters.page = 1;
    this.loadCourses();
  }

  onLevelFilter(level: string | null) {
    this.filters.level = level || undefined;
    this.filters.page = 1;
    this.loadCourses();
  }

  onSearch() {
    this.filters.search = this.searchTerm || undefined;
    this.filters.page = 1;
    this.loadCourses();
  }

  onPageChange(page: number) {
    this.filters.page = page;
    this.loadCourses();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  clearFilters() {
    this.filters = { page: 1, limit: 9 };
    this.searchTerm = '';
    this.loadCourses();
  }

  viewCourseDetails(courseId: number) {
  this.router.navigate(['/dashboard/courses', courseId]);
}
}
