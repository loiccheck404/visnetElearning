import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EnrollmentService {
  private apiUrl = `${environment.apiUrl}/enrollments`;

  constructor(private http: HttpClient) {}

  getMyEnrollments(): Observable<any> {
    return this.http.get(`${this.apiUrl}/my-courses`);
  }

  checkEnrollment(courseId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/check/${courseId}`);
  }

  enrollInCourse(courseId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${courseId}`, {});
  }

  unenrollFromCourse(courseId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${courseId}`);
  }
}
