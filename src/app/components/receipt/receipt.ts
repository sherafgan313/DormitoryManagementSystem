import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PaymentRecord {
  payment_id: number;
  user_id: number;
  month: string;
  amount: number;
  receipt_path: string;
  created_at: string;
  verification_status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
}

@Component({
  selector: 'app-receipt',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="receipt-component">
      @if (loading) {
        <p>Loading payments…</p>
      } @else if (error) {
        <p class="error">{{ error }}</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Month</th><th>Amount</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (p of payments; track p.payment_id) {
              <tr>
                <td>{{ p.month }}</td>
                <td>€{{ p.amount }}</td>
                <td><span class="badge">{{ p.verification_status }}</span></td>
                <td>
                  <button (click)="downloadReceipt.emit(p.payment_id)">Receipt</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class ReceiptComponent {
  @Input() payments: PaymentRecord[] = [];
  @Input() loading = false;
  @Input() error   = '';
  @Output() recordPayment   = new EventEmitter<{ month: string; amount: number; receipt?: File }>();
  @Output() downloadReceipt = new EventEmitter<number>();
  @Output() verifyPayment   = new EventEmitter<number>();
  @Output() rejectPayment   = new EventEmitter<number>();
}
