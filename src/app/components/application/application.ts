import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DormApplicationItem {
  application_id: number;
  user_id: number;
  submission_date: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
}

@Component({
  selector: 'app-application',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="application-component">
      @if (loading) {
        <p>Loading applications…</p>
      } @else if (error) {
        <p class="error">{{ error }}</p>
      } @else {
        <ul>
          @for (app of applications; track app.application_id) {
            <li>
              <span>#{{ app.application_id }}</span>
              <span class="badge badge--{{ app.status | lowercase }}">{{ app.status }}</span>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class ApplicationComponent {
  @Input() applications: DormApplicationItem[] = [];
  @Input() loading = false;
  @Input() error   = '';
  @Output() submitApplication  = new EventEmitter<{ date: string }>();
  @Output() uploadFiles        = new EventEmitter<{ appId: number; files: File[] }>();
  @Output() updateStatus       = new EventEmitter<{ id: number; status: string; extras?: any }>();
}
