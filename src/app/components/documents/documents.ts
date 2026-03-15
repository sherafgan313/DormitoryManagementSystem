import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DocumentFile {
  file_id: number;
  original_name: string;
  stored_name: string;
  file_type: string;
  file_size: number;
  upload_date: string;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="documents-component">
      @if (loading) {
        <p>Loading documents…</p>
      } @else if (error) {
        <p class="error">{{ error }}</p>
      } @else {
        <table>
          <thead>
            <tr><th>Document</th><th>Uploaded</th><th>Action</th></tr>
          </thead>
          <tbody>
            @for (file of files; track file.file_id) {
              <tr>
                <td>{{ file.original_name }}</td>
                <td>{{ file.upload_date | date }}</td>
                <td><button (click)="download.emit(file)">Download</button></td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
})
export class DocumentsComponent {
  @Input() files: DocumentFile[] = [];
  @Input() loading = false;
  @Input() error   = '';
  @Output() download = new EventEmitter<DocumentFile>();
  @Output() upload   = new EventEmitter<File[]>();
}
