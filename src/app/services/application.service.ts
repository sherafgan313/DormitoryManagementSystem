import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  constructor(private api: ApiService) {}

  getApplications(): Observable<any[]> {
    return this.api.getApplications();
  }

  submitApplication(
    submission_date: string,
    application_type: 'NEW' | 'EXTENSION' = 'NEW'
  ): Observable<{ message: string; applicationId: number }> {
    return this.api.submitApplication(submission_date, application_type);
  }

  uploadApplicationFiles(appId: number, files: File[]): Observable<any> {
    return this.api.uploadApplicationFiles(appId, files);
  }

  getApplicationFiles(appId: number): Observable<any[]> {
    return this.api.getApplicationFiles(appId);
  }

  updateApplicationStatus(
    id: number,
    status: 'ACCEPTED' | 'REJECTED' | 'PENDING',
    extras?: {
      room_id?: number; start_date?: string; end_date?: string;
      monthly_rent?: number; due_day?: number; remarks?: string;
    }
  ): Observable<any> {
    return this.api.updateApplicationStatus(id, status, extras);
  }
}
