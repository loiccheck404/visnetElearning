import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface InstructorStudent {
  enrollment_id: number;
  student_id: number;
  course_id: number;
  student_name: string;
  student_email: string;
  first_name: string;
  last_name: string;
  course_title: string;
  enrolled_at: string;
  progress: number;
  last_accessed_at: string;
  completed_at?: string;
  is_unenrolled: boolean; // Add this
}

export interface StudentResponse {
  status: string;
  data: {
    students: InstructorStudent[];
  };
}

@Injectable({
  providedIn: 'root',
})
export class StudentService {
  private apiUrl = `${environment.apiUrl}/students`;

  constructor(private http: HttpClient) {}

  getInstructorStudents(courseId?: number): Observable<StudentResponse> {
    let params = new HttpParams();
    if (courseId) {
      params = params.set('courseId', courseId.toString());
    }
    return this.http.get<StudentResponse>(this.apiUrl, { params });
  }

  getStudentDetails(studentId: number, courseId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${studentId}/course/${courseId}`);
  }

  getStudentProfile(studentId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/profile/${studentId}`);
  }
}
