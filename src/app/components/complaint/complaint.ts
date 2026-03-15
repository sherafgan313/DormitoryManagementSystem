import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ComplaintItem {
  complaint_id: number;
  user_id: number;
  description: string;
  status: 'SUBMITTED' | 'IN_PROGRESS' | 'RESOLVED';
  created_at: string;
}

@Component({
  selector: 'app-complaint',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="complaint-component">
      @if (loading) {
        <p>Loading complaints…</p>
      } @else if (error) {
        <p class="error">{{ error }}</p>
      } @else {
        <ul>
          @for (c of complaints; track c.complaint_id) {
            <li>
              <span>#{{ c.complaint_id }}</span>
              <span>{{ c.description | slice:0:80 }}</span>
              <span class="badge">{{ c.status }}</span>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class ComplaintComponent {
  @Input() complaints: ComplaintItem[] = [];
  @Input() loading = false;
  @Input() error   = '';
  @Output() submitComplaint  = new EventEmitter<string>();
  @Output() updateStatus     = new EventEmitter<{ id: number; status: string }>();
}
