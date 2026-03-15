import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ProgressService {
  constructor(private api: ApiService) {}

  getProgress(reportId: number): Observable<{ percentage: number; status: string }> {
    return this.api.getReportProgress(reportId);
  }

  startPolling(
    reportId: number,
    onTick: (data: { percentage: number; reportStatus: string }) => void,
    intervalMs = 600
  ): ReturnType<typeof setInterval> {
    return setInterval(() => {
      this.api.getReportProgress(reportId).subscribe({
        next: (data: any) => onTick(data),
        error: () => {},
      });
    }, intervalMs);
  }

  stopPolling(handle: ReturnType<typeof setInterval> | null): void {
    if (handle) clearInterval(handle);
  }
}
