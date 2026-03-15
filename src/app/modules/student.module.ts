import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentDashboardComponent } from '../pages/student-dashboard/student-dashboard';
import { NavMenuComponent } from '../components/nav-menu/nav-menu';
import { ApplicationComponent } from '../components/application/application';
import { ContractComponent } from '../components/contract/contract';
import { ComplaintComponent } from '../components/complaint/complaint';
import { DocumentsComponent } from '../components/documents/documents';
import { ReceiptComponent } from '../components/receipt/receipt';
import { ProgressComponent } from '../components/progress/progress';

/**
 * StudentModule — encapsulates student-specific components and functionality
 * including the student dashboard, application form, contract view,
 * complaints, documents, receipts, and progress tracking.
 */
@NgModule({
  imports: [
    CommonModule,
    StudentDashboardComponent,
    NavMenuComponent,
    ApplicationComponent,
    ContractComponent,
    ComplaintComponent,
    DocumentsComponent,
    ReceiptComponent,
    ProgressComponent,
  ],
  exports: [StudentDashboardComponent],
})
export class StudentModule {}
