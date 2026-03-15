import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="progress-overlay">
        <div class="progress-modal">
          <h3>Generating Report…</h3>
          <div class="progress-bar-track">
            <div class="progress-bar-fill" [style.width.%]="percentage"></div>
          </div>
          <p>{{ percentage }}% — {{ status }}</p>
          <div class="progress-actions">
            @if (status === 'COMPLETED') {
              <button (click)="download.emit(reportId)">Download Report</button>
            }
            @if (status !== 'COMPLETED' && status !== 'CANCELLED' && status !== 'FAILED') {
              <button (click)="cancel.emit(reportId)">Cancel</button>
            }
            <button (click)="close.emit()">Close</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ProgressComponent {
  @Input() open       = false;
  @Input() percentage = 0;
  @Input() status     = '';
  @Input() reportId   = 0;
  @Output() cancel   = new EventEmitter<number>();
  @Output() download = new EventEmitter<number>();
  @Output() close    = new EventEmitter<void>();
}
