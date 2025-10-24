import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators'; // ADD THIS IMPORT
import { environment } from '../../../environments/environment';

export interface Course {
  id: number;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  instructor_id: number;
  instructor_name?: string;
  category_id: number;
  category_name?: string;
  thumbnail_url?: string;
  level: string;
  language: string;
  price: number;
  status: string;
  is_featured: boolean;
  enrollment_count: number;
  rating: number;
  rating_count: number;
  duration_hours?: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  slug: string;
}

export interface CourseFilters {
  category?: number;
  level?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CoursesResponse {
  status: string;
  data: {
    courses: Course[];
    total: number;
    page: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class CourseService {
  private apiUrl = `${environment.apiUrl}/courses`;

  constructor(private http: HttpClient) {}

  getAllCourses(filters: CourseFilters = {}): Observable<CoursesResponse> {
    let params = new HttpParams();

    if (filters.category) params = params.set('category', filters.category.toString());
    if (filters.level) params = params.set('level', filters.level);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());

    // Add timestamp to prevent caching
    params = params.set('_t', Date.now().toString());

    return this.http.get<CoursesResponse>(this.apiUrl, { params });
  }

  getCourseById(id: string | number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  getCategories(): Observable<any> {
    return this.http.get(`${this.apiUrl}/categories`);
  }

  createCourse(courseData: any): Observable<any> {
    return this.http.post(this.apiUrl, courseData);
  }

  updateCourse(id: number, courseData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, courseData);
  }

  publishCourse(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/publish`, {});
  }

  deleteCourse(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // UPDATED: Add sorting logic here
  getInstructorCourses(): Observable<any> {
    return this.http.get(`${this.apiUrl}/instructor/my-courses`).pipe(
      map((response: any) => {
        if (response.status === 'SUCCESS' && response.data?.courses) {
          // Sort courses: pending → published → draft
          const courses = [...response.data.courses].sort((a: any, b: any) => {
            const statusPriority: { [key: string]: number } = {
              pending: 1,
              published: 2,
              draft: 3,
            };

            const priorityA = statusPriority[a.status?.toLowerCase()] || 4;
            const priorityB = statusPriority[b.status?.toLowerCase()] || 4;

            if (priorityA !== priorityB) {
              return priorityA - priorityB;
            }

            // Within same status, sort by created date (newest first)
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA;
          });

          return { ...response, data: { courses } };
        }
        return response;
      })
    );
  }
}
