import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardComponent } from '../pages/dashboard/dashboard';
import { NavMenuComponent } from '../components/nav-menu/nav-menu';
import { ApplicationComponent } from '../components/application/application';
import { ContractComponent } from '../components/contract/contract';
import { ComplaintComponent } from '../components/complaint/complaint';
import { ReceiptComponent } from '../components/receipt/receipt';
import { ProgressComponent } from '../components/progress/progress';

/**
 * AdminModule — encapsulates administrator-specific components and functionality
 * including application review, complaint management, contract administration,
 * payment verification, and report generation.
 */
@NgModule({
  imports: [
    CommonModule,
    DashboardComponent,
    NavMenuComponent,
    ApplicationComponent,
    ContractComponent,
    ComplaintComponent,
    ReceiptComponent,
    ProgressComponent,
  ],
  exports: [DashboardComponent],
})
export class AdminModule {}
