import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CourseService } from '../../core/services/course.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-course-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ThemeToggleComponent],
  templateUrl: './course-create.component.html',
  styleUrl: './course-create.component.scss',
})
export class CourseCreateComponent implements OnInit {
  courseForm!: FormGroup;
  currentUser = signal<any>(null);
  categories = signal<any[]>([]);
  loading = signal<boolean>(false);
  currentStep = signal<number>(1);
  totalSteps = 3;

  constructor(
    private fb: FormBuilder,
    private courseService: CourseService,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadCategories();
    this.initializeForm();
  }

  loadUserData() {
    const user = this.authService.getCurrentUser();
    this.currentUser.set(user);
  }

  loadCategories() {
    this.courseService.getCategories().subscribe({
      next: (response) => {
        if (response.status === 'SUCCESS') {
          this.categories.set(response.data.categories);
        }
      },
      error: (error) => console.error('Error loading categories:', error),
    });
  }

  initializeForm() {
    this.courseForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      short_description: ['', [Validators.required, Validators.maxLength(500)]],
      description: ['', [Validators.required, Validators.minLength(50)]],
      category_id: ['', Validators.required],
      level: ['beginner', Validators.required],
      language: ['English', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      thumbnail_url: [''],
    });
  }

  nextStep() {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update((step) => step + 1);
    }
  }

  previousStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update((step) => step - 1);
    }
  }

  onSubmit() {
    if (this.courseForm.valid) {
      this.loading.set(true);
      console.log('Submitting course:', this.courseForm.value); // Debug log
      this.courseService.createCourse(this.courseForm.value).subscribe({
        next: (response) => {
          if (response.status === 'SUCCESS') {
            this.toastService.success('Course created successfully!');
            this.router.navigate(['/dashboard/instructor']);
          }
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error creating course:', error);
          this.toastService.error('Failed to create course. Please try again.');
          this.loading.set(false);
        },
      });
    } else {
      console.log('Form is invalid:', this.courseForm.errors); // Debug log
      console.log('Form values:', this.courseForm.value); // Debug log
      this.markFormGroupTouched(this.courseForm);
      this.toastService.warning('Please fill in all required fields correctly');
    }
  }

  markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.courseForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.courseForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength'])
        return `Minimum length is ${field.errors['minlength'].requiredLength}`;
      if (field.errors['maxlength'])
        return `Maximum length is ${field.errors['maxlength'].requiredLength}`;
      if (field.errors['min']) return `Minimum value is ${field.errors['min'].min}`;
    }
    return '';
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
}
