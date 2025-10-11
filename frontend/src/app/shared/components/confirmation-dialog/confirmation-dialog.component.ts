import { Component, EventEmitter, Input, Output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
    <div class="dialog-overlay" (click)="onCancel()">
      <div class="dialog-container" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <div class="icon-wrapper" [class]="iconClass">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3>{{ title }}</h3>
          <button class="close-btn" (click)="onCancel()" [disabled]="isLoading()">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
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

        <div class="dialog-body">
          <p class="message">{{ message }}</p>
          @if (subMessage) {
          <p class="sub-message">{{ subMessage }}</p>
          }
        </div>

        <div class="dialog-actions">
          <button class="btn-cancel" (click)="onCancel()" [disabled]="isLoading()">
            {{ cancelText }}
          </button>
          <button
            class="btn-confirm"
            [class.danger]="type === 'danger'"
            (click)="onConfirm()"
            [disabled]="isLoading()"
          >
            @if (isLoading()) {
            <span class="spinner"></span>
            {{ loadingText }}
            } @else {
            {{ confirmText }}
            }
          </button>
        </div>
      </div>
    </div>
    }
  `,
  styles: [
    `
      .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.75);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 1rem;
        animation: fadeIn 0.2s ease-out;
        backdrop-filter: blur(4px);
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .dialog-container {
        background: linear-gradient(135deg, #2a3246 0%, #1e2332 100%);
        border-radius: 1rem;
        max-width: 480px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
        animation: slideUp 0.3s ease-out;
        overflow: hidden;
      }

      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .dialog-header {
        padding: 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        gap: 1rem;
        position: relative;

        .icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          &.warning {
            background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%);
            color: white;
          }

          &.danger {
            background: linear-gradient(135deg, #fc8181 0%, #f56565 100%);
            color: white;
          }

          &.info {
            background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
            color: white;
          }
        }

        h3 {
          flex: 1;
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.375rem;
          transition: all 0.2s;

          &:hover:not(:disabled) {
            color: white;
            background: rgba(255, 255, 255, 0.1);
          }

          &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }
        }
      }

      .dialog-body {
        padding: 1.5rem;

        .message {
          color: rgba(255, 255, 255, 0.9);
          font-size: 1rem;
          margin: 0 0 0.75rem 0;
          line-height: 1.6;
        }

        .sub-message {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
          margin: 0;
          line-height: 1.5;
        }
      }

      .dialog-actions {
        display: flex;
        gap: 0.75rem;
        padding: 1rem 1.5rem 1.5rem;

        button {
          flex: 1;
          padding: 0.875rem 1.5rem;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }

        .btn-cancel {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.2);

          &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
          }
        }

        .btn-confirm {
          background: linear-gradient(135deg, #8b7dff 0%, #b794f6 100%);
          color: white;

          &.danger {
            background: linear-gradient(135deg, #fc8181 0%, #f56565 100%);
          }

          &:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(139, 125, 255, 0.4);
          }

          &.danger:hover:not(:disabled) {
            box-shadow: 0 8px 20px rgba(252, 129, 129, 0.4);
          }
        }
      }

      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 640px) {
        .dialog-container {
          max-width: 100%;
          margin: 1rem;
        }

        .dialog-actions {
          flex-direction: column;

          button {
            width: 100%;
          }
        }
      }
    `,
  ],
})
export class ConfirmationDialogComponent {
  @Input() set openDialog(value: boolean) {
    this.isOpen.set(value);
  }

  @Input() isOpen = signal(false);
  @Input() isLoading = signal(false);

  @Input() title: string = 'Confirm Action';
  @Input() message: string = 'Are you sure you want to proceed?';
  @Input() subMessage: string = '';
  @Input() confirmText: string = 'Confirm';
  @Input() cancelText: string = 'Cancel';
  @Input() loadingText: string = 'Processing...';
  @Input() type: 'warning' | 'danger' | 'info' = 'warning';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  get iconClass(): string {
    return this.type;
  }

  onConfirm() {
    if (!this.isLoading()) {
      this.confirm.emit();
    }
  }

  onCancel() {
    if (!this.isLoading()) {
      this.cancel.emit();
    }
  }
}
