// Create a new file: src/app/core/services/notification.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  status: 'unread' | 'read';
  created_at: string;
  data?: any;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/activities`;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get instructor notifications (course status updates)
   */
  getInstructorNotifications(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/notifications`);
  }

  /**
   * Load notifications and update subjects
   */
  loadNotifications(): void {
    this.http.get<any>(`${this.apiUrl}/notifications`).subscribe({
      next: (response) => {
        if (response?.data?.activities) {
          const notifications = response.data.activities
            .filter((activity: any) => activity.activity_type === 'course_status_notification')
            .map((activity: any) => ({
              id: activity.id,
              type: activity.activity_data?.status || 'info',
              title: activity.activity_data?.title || 'Course Update',
              message: activity.activity_data?.message || 'Your course status has been updated',
              status: 'unread',
              created_at: activity.created_at,
              data: activity.activity_data,
            }));

          this.notificationsSubject.next(notifications);
          this.unreadCountSubject.next(notifications.length);
        }
      },
      error: (err) => {
        console.error('Error loading notifications:', err);
      },
    });
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${notificationId}/read`, {});
  }

  /**
   * Clear all notifications
   */
  clearAll(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/notifications`);
  }
}
