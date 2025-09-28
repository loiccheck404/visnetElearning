import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="register-container">
      <h2>Register</h2>
      <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
        <div>
          <label>First Name:</label>
          <input type="text" formControlName="firstName" />
        </div>
        <div>
          <label>Last Name:</label>
          <input type="text" formControlName="lastName" />
        </div>
        <div>
          <label>Email:</label>
          <input type="email" formControlName="email" />
        </div>
        <div>
          <label>Password:</label>
          <input type="password" formControlName="password" />
        </div>
        <div>
          <label>Role:</label>
          <select formControlName="role">
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
          </select>
        </div>
        <button type="submit" [disabled]="loading">
          {{ loading ? 'Registering...' : 'Register' }}
        </button>
        <div *ngIf="error" class="error">{{ error }}</div>
      </form>
      <p>Already have an account? <a (click)="goToLogin()">Login here</a></p>
    </div>
  `,
  styles: [
    `
      .register-container {
        max-width: 400px;
        margin: 50px auto;
        padding: 20px;
        border: 1px solid #ccc;
        border-radius: 5px;
      }
      div {
        margin-bottom: 15px;
      }
      label {
        display: block;
        margin-bottom: 5px;
      }
      input,
      select {
        width: 100%;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 3px;
        box-sizing: border-box;
      }
      button {
        width: 100%;
        padding: 10px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.6;
      }
      .error {
        color: red;
      }
      a {
        color: #007bff;
        cursor: pointer;
      }
    `,
  ],
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  error = '';

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {
    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['student', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.loading = true;
    this.error = '';

    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.error = error;
        this.loading = false;
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
