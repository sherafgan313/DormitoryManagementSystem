import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ContractService {
  constructor(private api: ApiService) {}

  getContracts(): Observable<any> {
    return this.api.getContracts();
  }

  updateContractStatus(id: number, status: 'ACTIVE' | 'EXTENDED' | 'TERMINATED'): Observable<any> {
    return this.api.updateContractStatus(id, status);
  }

  downloadContract(): Observable<Blob> {
    return this.api.downloadContract();
  }

  uploadSignedContract(file: File): Observable<any> {
    return this.api.uploadSignedContract(file);
  }

  getActiveContractStudents(): Observable<any[]> {
    return this.api.getActiveContractStudents();
  }

  adminTerminateContract(
    contract_id: number,
    reason: string,
    requested_end_date: string
  ): Observable<any> {
    return this.api.adminTerminateContract(contract_id, reason, requested_end_date);
  }

  submitTerminationRequest(reason: string, requested_end_date: string): Observable<any> {
    return this.api.submitTerminationRequest(reason, requested_end_date);
  }

  getMyTerminationRequest(): Observable<any> {
    return this.api.getMyTerminationRequest();
  }

  getTerminationRequests(): Observable<any[]> {
    return this.api.getTerminationRequests();
  }

  acceptTerminationRequest(id: number): Observable<any> {
    return this.api.acceptTerminationRequest(id);
  }

  rejectTerminationRequest(id: number): Observable<any> {
    return this.api.rejectTerminationRequest(id);
  }
}
