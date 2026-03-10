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
    totalRooms: number; occupiedRooms: number; vacantRooms: number; maintenanceRooms: number;
    totalStudents: number; pendingApplications: number; openComplaints: number;
    activeContracts: number; totalPayments: number;
  }> {
    return this.http.get<any>(`${this.BASE}/stats`, { headers: this.headers });
  }

  // ── Admin: rooms ──────────────────────────────────────────────────
  getRooms(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/rooms`, { headers: this.headers });
  }

  getVacantRooms(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/rooms/vacant`, { headers: this.headers });
  }

  // ── Admin: activity feed ──────────────────────────────────────────
  getActivity(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/activity`, { headers: this.headers });
  }

  // ── Admin: profile ────────────────────────────────────────────────
  getAdminProfile(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/admin/profile`, { headers: this.headers });
  }

  updateAdminProfile(data: {
    name: string; email: string; position?: string; phone?: string;
    dormitory_name: string; address?: string; contact_email?: string;
    contact_phone?: string; max_capacity?: number;
  }): Observable<any> {
    return this.http.put(`${this.BASE}/admin/profile`, data, { headers: this.headers });
  }

  // ── Admin: users ──────────────────────────────────────────────────
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/users`, { headers: this.headers });
  }

  // ── Applications ──────────────────────────────────────────────────
  getApplications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/applications`, { headers: this.headers });
  }

  submitApplication(submission_date: string): Observable<{ message: string; applicationId: number }> {
    return this.http.post<{ message: string; applicationId: number }>(
      `${this.BASE}/applications`, { submission_date }, { headers: this.headers }
    );
  }

  uploadApplicationFiles(appId: number, files: File[]): Observable<any> {
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    // Don't set Content-Type — browser sets it with multipart boundary
    const headers = new HttpHeaders({ Authorization: this.auth.getToken() ?? '' });
    return this.http.post(`${this.BASE}/applications/${appId}/files`, form, { headers });
  }

  getApplicationFiles(appId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/applications/${appId}/files`, { headers: this.headers });
  }

  getMyFiles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/my-files`, { headers: this.headers });
  }

  downloadFile(fileId: number): Observable<Blob> {
    return this.http.get(`${this.BASE}/files/${fileId}/download`, {
      headers: this.headers,
      responseType: 'blob',
    });
  }

  /** ADMIN only — update an application's status. room_id required when accepting. */
  updateApplicationStatus(
    id: number,
    status: 'ACCEPTED' | 'REJECTED' | 'PENDING',
    room_id?: number
  ): Observable<any> {
    return this.http.patch(
      `${this.BASE}/applications/${id}/status`,
      { status, room_id },
      { headers: this.headers }
    );
  }

  // ── Contracts ─────────────────────────────────────────────────────
  getContracts(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/contracts`, { headers: this.headers });
  }

  createContract(user_id: number, start_date: string, end_date: string, status: string): Observable<any> {
    return this.http.post(`${this.BASE}/contracts`, { user_id, start_date, end_date, status }, { headers: this.headers });
  }

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

  updateComplaintStatus(id: number, status: 'SUBMITTED' | 'IN_PROGRESS' | 'RESOLVED'): Observable<any> {
    return this.http.patch(`${this.BASE}/complaints/${id}/status`, { status }, { headers: this.headers });
  }

  // ── Payments ──────────────────────────────────────────────────────
  getPayments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/payments`, { headers: this.headers });
  }

  recordPayment(month: string, amount: number, receipt?: File): Observable<any> {
    const form = new FormData();
    form.append('month', month);
    form.append('amount', String(amount));
    if (receipt) form.append('receipt', receipt);
    const headers = new HttpHeaders({ Authorization: this.auth.getToken() ?? '' });
    return this.http.post(`${this.BASE}/payments`, form, { headers });
  }

  verifyPayment(id: number): Observable<any> {
    return this.http.patch(`${this.BASE}/payments/${id}/verify`, {}, { headers: this.headers });
  }

  rejectPayment(id: number): Observable<any> {
    return this.http.patch(`${this.BASE}/payments/${id}/reject`, {}, { headers: this.headers });
  }

  downloadReceipt(paymentId: number): Observable<Blob> {
    return this.http.get(`${this.BASE}/payments/${paymentId}/receipt`, {
      headers: this.headers,
      responseType: 'blob',
    });
  }

  // ── Reports ───────────────────────────────────────────────────────
  getReports(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/reports`, { headers: this.headers });
  }

  generateReport(): Observable<{ reportId: number; progressId: number }> {
    return this.http.post<{ reportId: number; progressId: number }>(
      `${this.BASE}/reports`, {}, { headers: this.headers }
    );
  }

  getReportProgress(id: number): Observable<{ percentage: number; status: string }> {
    return this.http.get<any>(`${this.BASE}/reports/${id}/progress`, { headers: this.headers });
  }

  downloadReport(id: number): Observable<Blob> {
    return this.http.get(`${this.BASE}/reports/${id}/download`, {
      headers: this.headers,
      responseType: 'blob',
    });
  }

  cancelReport(id: number): Observable<any> {
    return this.http.delete(`${this.BASE}/reports/${id}`, { headers: this.headers });
  }

  // ── Student profile ───────────────────────────────────────────────
  getProfile(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/profile`, { headers: this.headers });
  }

  updateProfile(data: {
    name: string; email: string;
    phone?: string; student_id_number?: string; course?: string; university?: string;
  }): Observable<any> {
    return this.http.put(`${this.BASE}/profile`, data, { headers: this.headers });
  }
}
