import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ReportService {
  constructor(private api: ApiService) {}

  getReports(): Observable<any[]> {
    return this.api.getReports();
  }

  generateReport(): Observable<{ reportId: number; progressId: number }> {
    return this.api.generateReport();
  }

  getReportProgress(id: number): Observable<{ percentage: number; status: string }> {
    return this.api.getReportProgress(id);
  }

  downloadReport(id: number): Observable<Blob> {
    return this.api.downloadReport(id);
  }

  cancelReport(id: number): Observable<any> {
    return this.api.cancelReport(id);
  }

  generateAdminReport(payload: {
    stats: any;
    chartImages: { occupancy: string; finances: string; maintenance: string };
  }): Observable<any> {
    return this.api.generateAdminReport(payload);
  }

  downloadAdminReport(fileName: string): string {
    return this.api.downloadAdminReport(fileName);
  }
}
