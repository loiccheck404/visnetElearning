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
      email: ['', [Validators.required, Validators.email]], // Made editable with email validation
      bio: ['', [Validators.maxLength(500)]],
      phone: [''], // Removed pattern validator - make it optional
      dateOfBirth: [''],
      occupation: ['', [Validators.maxLength(100)]],
      education: [''],
      skills: ['', [Validators.maxLength(200)]],
      location: ['', [Validators.maxLength(100)]],
      website: [''], // Removed pattern validator - validate only when filled
      linkedin: [''], // Removed pattern validator
      github: [''], // Removed pattern validator
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
    const wasEditing = this.isEditing();
    this.isEditing.set(!this.isEditing());

    // Clear ALL messages when toggling edit mode
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.isEditing() && wasEditing) {
      // Cancel edit - clear all validation errors and reload original data
      Object.keys(this.profileForm.controls).forEach((key) => {
        const control = this.profileForm.get(key);
        control?.setErrors(null);
        control?.markAsUntouched();
        control?.markAsPristine();
      });
      this.loadUserProfile();
    }
  }

  onSubmit() {
    // Clear messages
    this.errorMessage.set('');
    this.successMessage.set('');

    // Get form values
    const firstName = this.profileForm.get('firstName')?.value?.trim() || '';
    const lastName = this.profileForm.get('lastName')?.value?.trim() || '';
    const bio = this.profileForm.get('bio')?.value?.trim() || '';
    const phone = this.profileForm.get('phone')?.value?.trim() || '';
    const dateOfBirth = this.profileForm.get('dateOfBirth')?.value || '';

    // Simple validation
    if (!firstName || firstName.length < 2) {
      this.errorMessage.set('First name must be at least 2 characters');
      return;
    }

    if (!lastName || lastName.length < 2) {
      this.errorMessage.set('Last name must be at least 2 characters');
      return;
    }

    // Prepare data - ONLY send what backend accepts
    const updateData: any = {
      firstName,
      lastName,
    };

    // Add optional fields only if they have values
    if (bio) updateData.bio = bio;
    if (phone) updateData.phone = phone;
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;

    console.log('Submitting:', updateData);
    this.isSaving.set(true);

    this.http
      .put(`${environment.apiUrl}/auth/profile`, updateData, {
        headers: {
          Authorization: `Bearer ${this.authService.tokenValue}`,
        },
      })
      .subscribe({
        next: (response: any) => {
          console.log('Success:', response);
          this.isSaving.set(false);
          this.isEditing.set(false);

          // Update local user data
          const updatedUser = {
            ...this.currentUser()!,
            firstName: updateData.firstName,
            lastName: updateData.lastName,
          };
          this.currentUser.set(updatedUser);
          localStorage.setItem('current_user', JSON.stringify(updatedUser));

          this.successMessage.set('Profile updated successfully!');
          this.toastService.success('Profile updated successfully!');

          // Reload profile to get updated data
          this.loadUserProfile();

          setTimeout(() => this.successMessage.set(''), 5000);
        },
        error: (error) => {
          console.error('Error:', error);
          this.isSaving.set(false);

          let errorMsg = 'Failed to update profile';
          if (error.error?.message) {
            errorMsg = error.error.message;
          } else if (error.error?.errors) {
            errorMsg = error.error.errors.map((e: any) => e.msg).join(', ');
          }

          this.errorMessage.set(errorMsg);
          this.toastService.error(errorMsg);
        },
      });
  }

  // Add this helper method
  private isValidEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
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

    if (!field) return '';

    if (field.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (field.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (field.hasError('minlength')) {
      const minLength = field.errors?.['minlength'].requiredLength;
      return `${this.getFieldLabel(fieldName)} must be at least ${minLength} characters`;
    }
    if (field.hasError('maxlength')) {
      const maxLength = field.errors?.['maxlength'].requiredLength;
      return `${this.getFieldLabel(fieldName)} cannot exceed ${maxLength} characters`;
    }
    if (field.hasError('pattern')) {
      if (fieldName === 'phone') {
        return 'Please enter a valid phone number (e.g., +1234567890)';
      }
      if (fieldName === 'website' || fieldName === 'linkedin' || fieldName === 'github') {
        return 'Please enter a valid URL starting with http:// or https://';
      }
    }

    return '';
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email', // Add this
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
