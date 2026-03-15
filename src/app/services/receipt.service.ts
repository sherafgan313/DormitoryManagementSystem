import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ReceiptService {
  constructor(private api: ApiService) {}

  recordPayment(month: string, amount: number, receipt?: File): Observable<any> {
    return this.api.recordPayment(month, amount, receipt);
  }

  getPayments(): Observable<any[]> {
    return this.api.getPayments();
  }

  verifyPayment(id: number): Observable<any> {
    return this.api.verifyPayment(id);
  }

  rejectPayment(id: number): Observable<any> {
    return this.api.rejectPayment(id);
  }

  downloadReceipt(paymentId: number): Observable<Blob> {
    return this.api.downloadReceipt(paymentId);
  }

  getOverduePayments(): Observable<{ overdueMonths: string[]; totalOverdue: number; monthlyRent: number }> {
    return this.api.getOverduePayments();
  }

  getPaymentSummary(month: string, year: number): Observable<any> {
    return this.api.getPaymentSummary(month, year);
  }
}
