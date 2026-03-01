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

  // ── Admin: stats ──────────────────────────────────────────────────
  getStats(): Observable<{
    totalStudents: number;
    pendingApplications: number;
    openComplaints: number;
    activeContracts: number;
    totalPayments: number;
  }> {
    return this.http.get<any>(`${this.BASE}/stats`, { headers: this.headers });
  }

  // ── Admin: users ──────────────────────────────────────────────────
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/users`, { headers: this.headers });
  }

  // ── Applications ──────────────────────────────────────────────────
  getApplications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/applications`, { headers: this.headers });
  }

  submitApplication(submission_date: string): Observable<any> {
    return this.http.post(`${this.BASE}/applications`, { submission_date }, { headers: this.headers });
  }

  /** ADMIN only — update an application's status */
  updateApplicationStatus(id: number, status: 'ACCEPTED' | 'REJECTED' | 'PENDING'): Observable<any> {
    return this.http.patch(`${this.BASE}/applications/${id}/status`, { status }, { headers: this.headers });
  }

  // ── Contracts ─────────────────────────────────────────────────────
  /** ADMIN: all contracts | STUDENT: own contract (single object or null) */
  getContracts(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/contracts`, { headers: this.headers });
  }

  createContract(user_id: number, start_date: string, end_date: string, status: string): Observable<any> {
    return this.http.post(`${this.BASE}/contracts`, { user_id, start_date, end_date, status }, { headers: this.headers });
  }

  /** ADMIN only — update a contract's status */
  updateContractStatus(id: number, status: 'ACTIVE' | 'EXTENDED' | 'TERMINATED'): Observable<any> {
    return this.http.patch(`${this.BASE}/contracts/${id}/status`, { status }, { headers: this.headers });
  }

  // ── Complaints ────────────────────────────────────────────────────
  getComplaints(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/complaints`, { headers: this.headers });
  }

  submitComplaint(description: string): Observable<any> {
    return this.http.post(`${this.BASE}/complaints`, { description }, { headers: this.headers });
  }

  /** ADMIN only — update a complaint's status */
  updateComplaintStatus(id: number, status: 'SUBMITTED' | 'IN_PROGRESS' | 'RESOLVED'): Observable<any> {
    return this.http.patch(`${this.BASE}/complaints/${id}/status`, { status }, { headers: this.headers });
  }

  // ── Payments ──────────────────────────────────────────────────────
  getPayments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/payments`, { headers: this.headers });
  }

  recordPayment(month: string, amount: number): Observable<any> {
    return this.http.post(`${this.BASE}/payments`, { month, amount }, { headers: this.headers });
  }

  // ── Reports ───────────────────────────────────────────────────────
  getReports(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/reports`, { headers: this.headers });
  }

  generateReport(): Observable<any> {
    return this.http.post(`${this.BASE}/reports`, {}, { headers: this.headers });
  }

  // ── Student profile ───────────────────────────────────────────────
  /** STUDENT only — get own profile (users + student_profiles joined) */
  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/profile`, { headers: this.headers });
  }

  /** STUDENT only — update name, email, academic_details */
  updateProfile(data: { name: string; email: string; academic_details?: string }): Observable<any> {
    return this.http.put(`${this.BASE}/profile`, data, { headers: this.headers });
  }
}
