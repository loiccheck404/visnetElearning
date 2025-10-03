import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LessonProgress {
  id: number;
  title: string;
  duration_minutes: number;
  order_index: number;
  is_completed: boolean;
  completed_at?: string;
  time_spent_seconds: number;
}

export interface CourseProgress {
  enrollment: {
    id: number;
    progress: number;
    enrolled_at: string;
    last_accessed_at: string;
  };
  lessons: LessonProgress[];
  totalLessons: number;
  completedLessons: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProgressService {
  private apiUrl = `${environment.apiUrl}/progress`;

  constructor(private http: HttpClient) {}

  getMyProgress(): Observable<any> {
    return this.http.get(`${this.apiUrl}/my-progress`);
  }

  getCourseProgress(courseId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/courses/${courseId}`);
  }

  markLessonComplete(courseId: number, lessonId: number, timeSpent: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/courses/${courseId}/lessons/${lessonId}/complete`, {
      timeSpent,
    });
  }

  updateLessonTime(courseId: number, lessonId: number, timeSpent: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/courses/${courseId}/lessons/${lessonId}/time`, {
      timeSpent,
    });
  }
}
