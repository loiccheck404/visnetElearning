import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
      <div class="toast" [class]="'toast-' + toast.type">
        <div class="toast-icon">
          @if (toast.type === 'success') {
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          } @if (toast.type === 'error') {
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          } @if (toast.type === 'warning') {
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            ></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          } @if (toast.type === 'info') {
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          }
        </div>
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" (click)="toastService.remove(toast.id)">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-width: 400px;
      }

      .toast {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        border-radius: 0.5rem;
        box-shadow: var(--shadow-lg);
        animation: slideIn 0.66s ease-out;
        min-width: 300px;
      }

      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      .toast-success {
        background: var(--success-light);
        color: var(--success-dark);
        border: 1px solid var(--success);
      }

      .toast-error {
        background: var(--error-light);
        color: var(--error-dark);
        border: 1px solid var(--error);
      }

      .toast-warning {
        background: red;
        color: black;
        border: 2px solid var(--warning);
      }

      .toast-info {
        background: var(--info-light);
        color: var(--info-dark);
        border: 1px solid var(--info);
      }

      .toast-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .toast-message {
        flex: 1;
        font-size: 0.95rem;
        font-weight: 700;
        color: black;
      }

      .toast-close {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.7;
        transition: opacity 0.2s;
        flex-shrink: 0;

        &:hover {
          opacity: 1;
        }
      }

      @media (max-width: 640px) {
        .toast-container {
          left: 20px;
          right: 20px;
          max-width: none;
        }

        .toast {
          min-width: auto;
        }
      }
    `,
  ],
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}
