import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/services/toast.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';

interface ProfileData {
  bio?: string;
  phone?: string;
  dateOfBirth?: string;
  occupation?: string;
  education?: string;
  skills?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  profilePicture?: string;
  followersCount?: number;
  followingCount?: number;
  coursesEnrolled?: number;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, ThemeToggleComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  currentUser = signal<User | null>(null);
  profileData = signal<ProfileData>({});
  isEditing = signal(false);
  isSaving = signal(false);
  isUploading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  profilePictureUrl = signal<string>('');

  profileForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private toastService: ToastService
  ) {
    this.profileForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: [{ value: '', disabled: true }],
      bio: ['', [Validators.maxLength(500)]],
      phone: ['', [Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
      dateOfBirth: [''],
      occupation: ['', [Validators.maxLength(100)]],
      education: [''],
      skills: ['', [Validators.maxLength(200)]],
      location: ['', [Validators.maxLength(100)]],
      website: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      linkedin: ['', [Validators.pattern(/^https?:\/\/.+/)]],
      github: ['', [Validators.pattern(/^https?:\/\/.+/)]],
    });
  }

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    const user = this.authService.currentUserValue;
    if (user) {
      this.currentUser.set(user);

      // Load extended profile data from backend
      this.http
        .get<any>(`${environment.apiUrl}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${this.authService.tokenValue}`,
          },
        })
        .subscribe({
          next: (response) => {
            if (response.status === 'SUCCESS') {
              const profile = response.data.profile;
              this.profileData.set({
                bio: profile.bio,
                phone: profile.phone,
                dateOfBirth: profile.dateOfBirth,
                occupation: profile.occupation,
                education: profile.education,
                skills: profile.skills,
                location: profile.location,
                website: profile.website,
                linkedin: profile.linkedin,
                github: profile.github,
                profilePicture: profile.profilePicture,
                followersCount: profile.followersCount || 0,
                followingCount: profile.followingCount || 0,
                coursesEnrolled: profile.coursesEnrolled || 0,
              });

              if (profile.profilePicture) {
                this.profilePictureUrl.set(profile.profilePicture);
              }

              this.profileForm.patchValue({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                bio: profile.bio || '',
                phone: profile.phone || '',
                dateOfBirth: profile.dateOfBirth || '',
                occupation: profile.occupation || '',
                education: profile.education || '',
                skills: profile.skills || '',
                location: profile.location || '',
                website: profile.website || '',
                linkedin: profile.linkedin || '',
                github: profile.github || '',
              });
            }
          },
          error: (error) => {
            console.error('Error loading profile:', error);
            // Use basic user data if extended profile fails
            this.profileForm.patchValue({
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
            });
          },
        });
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.toastService.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.toastService.error('Image size should not exceed 5MB');
      return;
    }

    this.uploadProfilePicture(file);
  }

  uploadProfilePicture(file: File) {
    this.isUploading.set(true);
    const formData = new FormData();
    formData.append('profilePicture', file);

    this.http
      .post<any>(`${environment.apiUrl}/auth/profile/picture`, formData, {
        headers: {
          Authorization: `Bearer ${this.authService.tokenValue}`,
        },
      })
      .subscribe({
        next: (response) => {
          if (response.status === 'SUCCESS') {
            this.profilePictureUrl.set(response.data.profilePictureUrl);
            this.toastService.success('Profile picture updated successfully!');
          }
          this.isUploading.set(false);
        },
        error: (error) => {
          console.error('Error uploading profile picture:', error);
          this.toastService.error(
            error.error?.message || 'Failed to upload profile picture. Please try again.'
          );
          this.isUploading.set(false);
        },
      });
  }

  toggleEdit() {
    this.isEditing.set(!this.isEditing());
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.isEditing()) {
      // Cancel edit - reload original data
      this.loadUserProfile();
    }
  }

  onSubmit() {
    if (this.profileForm.invalid) {
      Object.keys(this.profileForm.controls).forEach((key) => {
        this.profileForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const updateData = {
      firstName: this.profileForm.get('firstName')?.value,
      lastName: this.profileForm.get('lastName')?.value,
      bio: this.profileForm.get('bio')?.value,
      phone: this.profileForm.get('phone')?.value,
      dateOfBirth: this.profileForm.get('dateOfBirth')?.value,
      occupation: this.profileForm.get('occupation')?.value,
      education: this.profileForm.get('education')?.value,
      skills: this.profileForm.get('skills')?.value,
      location: this.profileForm.get('location')?.value,
      website: this.profileForm.get('website')?.value,
      linkedin: this.profileForm.get('linkedin')?.value,
      github: this.profileForm.get('github')?.value,
    };

    this.http
      .put(`${environment.apiUrl}/auth/profile`, updateData, {
        headers: {
          Authorization: `Bearer ${this.authService.tokenValue}`,
        },
      })
      .subscribe({
        next: (response: any) => {
          this.isSaving.set(false);
          this.toastService.success('Profile updated successfully!');
          this.successMessage.set('Profile updated successfully!');
          this.isEditing.set(false);

          // Update stored user data
          const updatedUser = {
            ...this.currentUser()!,
            firstName: updateData.firstName,
            lastName: updateData.lastName,
          };
          this.currentUser.set(updatedUser);
          localStorage.setItem('current_user', JSON.stringify(updatedUser));

          // Update profile data
          this.profileData.update((data) => ({
            ...data,
            ...updateData,
          }));

          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: (error) => {
          this.isSaving.set(false);
          this.errorMessage.set(
            error.error?.message || 'Failed to update profile. Please try again.'
          );
          this.toastService.error(
            error.error?.message || 'Failed to update profile. Please try again.'
          );
        },
      });
  }

  getDashboardLink(): string {
    const role = this.currentUser()?.role;
    switch (role) {
      case 'admin':
        return '/dashboard/admin';
      case 'instructor':
        return '/dashboard/instructor';
      default:
        return '/dashboard/home';
    }
  }

  getFieldError(fieldName: string): string {
    const field = this.profileForm.get(fieldName);

    if (field?.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (field?.hasError('minlength')) {
      const minLength = field.errors?.['minlength'].requiredLength;
      return `${this.getFieldLabel(fieldName)} must be at least ${minLength} characters`;
    }
    if (field?.hasError('maxlength')) {
      const maxLength = field.errors?.['maxlength'].requiredLength;
      return `${this.getFieldLabel(fieldName)} cannot exceed ${maxLength} characters`;
    }
    if (field?.hasError('pattern')) {
      if (fieldName === 'phone') {
        return 'Please enter a valid phone number';
      }
      if (fieldName === 'website' || fieldName === 'linkedin' || fieldName === 'github') {
        return 'Please enter a valid URL (e.g., https://example.com)';
      }
    }

    return '';
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'First name',
      lastName: 'Last name',
      bio: 'Bio',
      phone: 'Phone',
      dateOfBirth: 'Date of birth',
      occupation: 'Occupation',
      education: 'Education',
      skills: 'Skills',
      location: 'Location',
      website: 'Website',
      linkedin: 'LinkedIn',
      github: 'GitHub',
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.profileForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}
