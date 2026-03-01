import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly BASE = 'http://localhost:3000/api';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private get headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: this.auth.getToken() ?? '' });
  }

  getApplications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/applications`, { headers: this.headers });
  }

  submitApplication(submission_date: string): Observable<any> {
    return this.http.post(`${this.BASE}/applications`, { submission_date }, { headers: this.headers });
  }

  getComplaints(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/complaints`, { headers: this.headers });
  }

  submitComplaint(description: string): Observable<any> {
    return this.http.post(`${this.BASE}/complaints`, { description }, { headers: this.headers });
  }

  getPayments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/payments`, { headers: this.headers });
  }

  recordPayment(month: string, amount: number): Observable<any> {
    return this.http.post(`${this.BASE}/payments`, { month, amount }, { headers: this.headers });
  }

  createContract(user_id: number, start_date: string, end_date: string, status: string): Observable<any> {
    return this.http.post(`${this.BASE}/contracts`, { user_id, start_date, end_date, status }, { headers: this.headers });
  }

  getReports(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/reports`, { headers: this.headers });
  }

  generateReport(): Observable<any> {
    return this.http.post(`${this.BASE}/reports`, {}, { headers: this.headers });
  }
}
