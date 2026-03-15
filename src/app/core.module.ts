import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { ApiService } from './services/api.service';
import { NotificationService } from './services/notification.service';
import { ApplicationService } from './services/application.service';
import { ContractService } from './services/contract.service';
import { ComplaintService } from './services/complaint.service';
import { ReceiptService } from './services/receipt.service';
import { FileService } from './services/file.service';
import { ReportService } from './services/report.service';
import { ProgressService } from './services/progress.service';

/**
 * CoreModule — provides singleton services shared across the application.
 * Authentication, route guards, HTTP interceptor, and all domain services
 * are registered here. Uses Angular providedIn:'root' pattern for singletons.
 */
@NgModule({
  imports: [CommonModule],
  providers: [
    AuthService,
    ApiService,
    NotificationService,
    ApplicationService,
    ContractService,
    ComplaintService,
    ReceiptService,
    FileService,
    ReportService,
    ProgressService,
  ],
  exports: [CommonModule],
})
export class CoreModule {}
