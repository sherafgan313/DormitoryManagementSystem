import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ContractInfo {
  contractId: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'EXTENDED' | 'TERMINATED';
  monthlyRent: number;
  hasGeneratedDoc: boolean;
  hasSignedDoc: boolean;
}

@Component({
  selector: 'app-contract',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="contract-component">
      @if (contractInfo) {
        <div class="contract-details">
          <p><strong>Contract ID:</strong> {{ contractInfo.contractId }}</p>
          <p><strong>Status:</strong> {{ contractInfo.status }}</p>
          <p><strong>Start:</strong> {{ contractInfo.startDate }}</p>
          <p><strong>End:</strong> {{ contractInfo.endDate }}</p>
          <p><strong>Monthly Rent:</strong> €{{ contractInfo.monthlyRent }}</p>
        </div>
        <div class="contract-actions">
          <button (click)="downloadContract.emit()">Download Contract</button>
          <button (click)="uploadSigned.emit()">Upload Signed Contract</button>
        </div>
      }
    </div>
  `,
})
export class ContractComponent {
  @Input() contractInfo: ContractInfo | null = null;
  @Input() signedContractFile: File | null   = null;
  @Output() downloadContract = new EventEmitter<void>();
  @Output() uploadSigned     = new EventEmitter<File>();
  @Output() updateStatus     = new EventEmitter<{ id: number; status: string }>();
}
