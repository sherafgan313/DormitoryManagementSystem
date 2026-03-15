import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ComplaintService {
  constructor(private api: ApiService) {}

  getComplaints(): Observable<any[]> {
    return this.api.getComplaints();
  }

  submitComplaint(description: string): Observable<any> {
    return this.api.submitComplaint(description);
  }

  updateComplaintStatus(
    id: number,
    status: 'SUBMITTED' | 'IN_PROGRESS' | 'RESOLVED'
  ): Observable<any> {
    return this.api.updateComplaintStatus(id, status);
  }
}
