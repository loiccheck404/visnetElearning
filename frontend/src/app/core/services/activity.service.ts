import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface StudentActivity {
  id: number;
  activity_type:
    | 'course_enrolled'
    | 'lesson_started'
    | 'lesson_completed'
    | 'quiz_started'
    | 'quiz_completed'
    | 'course_completed';
  course_title: string;
  course_id: number;
  lesson_title?: string;
  created_at: string;
  metadata?: any;
}

export interface ActivityResponse {
  status: string;
  data: {
    activities: StudentActivity[];
  };
}

@Injectable({
  providedIn: 'root',
})
export class ActivityService {
  private apiUrl = `${environment.apiUrl}/activities`;

  constructor(private http: HttpClient) {}

  getMyActivities(limit: number = 10): Observable<ActivityResponse> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ActivityResponse>(`${this.apiUrl}/my-activities`, { params });
  }

  getCourseActivities(courseId: number, limit: number = 20): Observable<ActivityResponse> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<ActivityResponse>(`${this.apiUrl}/courses/${courseId}`, { params });
  }

  getActivityStats(period: number = 30): Observable<any> {
    const params = new HttpParams().set('period', period.toString());
    return this.http.get(`${this.apiUrl}/stats`, { params });
  }
}
