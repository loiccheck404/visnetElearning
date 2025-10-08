import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EnrollmentService {
  private apiUrl = `${environment.apiUrl}/enrollments`;

  constructor(private http: HttpClient) {}

  // Returns just the Set of course IDs for filtering
  getMyEnrollments(): Observable<Set<number>> {
    return this.http.get<any>(`${this.apiUrl}/my-courses`).pipe(
      map((response) => {
        if (response.status === 'SUCCESS' && response.data?.courses) {
          return new Set(response.data.courses.map((course: any) => course.id));
        }
        return new Set<number>();
      })
    );
  }

  // Returns full course details for the dashboard
  getMyEnrolledCourses(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/my-courses`);
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
