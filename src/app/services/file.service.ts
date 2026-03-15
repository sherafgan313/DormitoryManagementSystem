import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class FileService {
  constructor(private api: ApiService) {}

  uploadApplicationFiles(appId: number, files: File[]): Observable<any> {
    return this.api.uploadApplicationFiles(appId, files);
  }

  downloadFile(fileId: number): Observable<Blob> {
    return this.api.downloadFile(fileId);
  }

  getMyFiles(): Observable<any[]> {
    return this.api.getMyFiles();
  }

  uploadSignedContract(file: File): Observable<any> {
    return this.api.uploadSignedContract(file);
  }

  downloadContract(): Observable<Blob> {
    return this.api.downloadContract();
  }

  downloadReceipt(paymentId: number): Observable<Blob> {
    return this.api.downloadReceipt(paymentId);
  }
}
