import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError, BehaviorSubject, Subject } from 'rxjs';
import { StudentDashboardComponent } from './student-dashboard';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

describe('StudentDashboardComponent', () => {
  let fixture: ComponentFixture<StudentDashboardComponent>;
  let component: StudentDashboardComponent;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let notifSpy: jasmine.SpyObj<NotificationService>;
  let router: Router;

  const notifications$ = new BehaviorSubject<any[]>([]);
  const toast$ = new Subject<any>();

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('ApiService', [
      'getProfile', 'updateProfile', 'getContracts', 'getApplications', 'submitApplication',
      'uploadApplicationFiles', 'getComplaints', 'submitComplaint',
      'getPayments', 'recordPayment', 'getOverduePayments', 'getMyFiles',
      'downloadFile', 'downloadContract', 'uploadSignedContract',
      'getMyTerminationRequest', 'submitTerminationRequest',
      'generateReport', 'getReportProgress', 'cancelReport', 'downloadReport',
      'getDormitorySettings',
    ]);

    apiSpy.getProfile.and.returnValue(of({ name: 'Test Student', email: 'stu@dms.com' }));
    apiSpy.updateProfile.and.returnValue(of({}));
    apiSpy.getContracts.and.returnValue(of(null));
    apiSpy.getApplications.and.returnValue(of([]));
    apiSpy.submitApplication.and.returnValue(of({ message: 'ok', applicationId: 1 }));
    apiSpy.uploadApplicationFiles.and.returnValue(of({ count: 1 }));
    apiSpy.getComplaints.and.returnValue(of([]));
    apiSpy.submitComplaint.and.returnValue(of({}));
    apiSpy.getPayments.and.returnValue(of([]));
    apiSpy.recordPayment.and.returnValue(of({}));
    apiSpy.getOverduePayments.and.returnValue(of({ overdueMonths: [], totalOverdue: 0, monthlyRent: 0 }));
    apiSpy.getMyFiles.and.returnValue(of([]));
    apiSpy.downloadFile.and.returnValue(of(new Blob()));
    apiSpy.downloadContract.and.returnValue(of(new Blob()));
    apiSpy.uploadSignedContract.and.returnValue(of({}));
    apiSpy.getMyTerminationRequest.and.returnValue(of(null));
    apiSpy.submitTerminationRequest.and.returnValue(of({}));
    apiSpy.generateReport.and.returnValue(of({ reportId: 1, progressId: 1 }));
    apiSpy.getReportProgress.and.returnValue(of({ percentage: 100, status: 'COMPLETED' }));
    apiSpy.cancelReport.and.returnValue(of({}));
    apiSpy.downloadReport.and.returnValue(of(new Blob()));
    apiSpy.getDormitorySettings.and.returnValue(of({ notifications_enabled: 1, payment_reminders_enabled: 1, maintenance_alerts_enabled: 1 }));

    authSpy = jasmine.createSpyObj('AuthService', ['getName', 'getEmail', 'getToken', 'logout']);
    authSpy.getName.and.returnValue('Test Student');
    authSpy.getEmail.and.returnValue('stu@dms.com');
    authSpy.getToken.and.returnValue('tok');

    notifSpy = jasmine.createSpyObj('NotificationService', ['connect', 'disconnect', 'load', 'markRead', 'markAllRead'], {
      notifications$,
      toast$,
      unreadCount: 0,
    });
    notifSpy.markRead.and.returnValue(of({}));
    notifSpy.markAllRead.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [StudentDashboardComponent],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: NotificationService, useValue: notifSpy },
        provideRouter([]),
        provideLocationMocks(),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture   = TestBed.createComponent(StudentDashboardComponent);
    component = fixture.componentInstance;
    router    = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    notifications$.next([]);
  });

  // ── Creation ──────────────────────────────────────────────────────
  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('sets student name and initials from auth on init', () => {
    expect(component.student.name).toBe('Test Student');
    expect(component.student.initials).toBe('TS');
  });

  it('loads all data sources on init', () => {
    expect(apiSpy.getProfile).toHaveBeenCalled();
    expect(apiSpy.getContracts).toHaveBeenCalled();
    expect(apiSpy.getApplications).toHaveBeenCalled();
    expect(apiSpy.getComplaints).toHaveBeenCalled();
    expect(apiSpy.getPayments).toHaveBeenCalled();
    expect(apiSpy.getMyFiles).toHaveBeenCalled();
  });

  // ── Profile ───────────────────────────────────────────────────────
  it('loadProfile() populates student fields', () => {
    apiSpy.getProfile.and.returnValue(of({
      name: 'Alice', email: 'alice@dms.com', phone: '09171234567',
      student_id_number: 'STU001', course: 'CS', university: 'UPD',
      room_number: '201', floor: 2, room_type: 'Double',
      dorm_contact_email: 'admin@dorm.com', dorm_contact_phone: '09180000000',
    }));
    component.loadProfile();
    expect(component.student.name).toBe('Alice');
    expect(component.student.course).toBe('CS');
    expect(component.roomInfo.number).toBe('201');
  });

  it('loadProfile() handles API error gracefully', () => {
    apiSpy.getProfile.and.returnValue(throwError(() => new Error('fail')));
    expect(() => component.loadProfile()).not.toThrow();
  });

  it('saveProfile() updates student name on success', fakeAsync(() => {
    component.profileForm.name = 'New Name';
    component.profileForm.email = 'new@dms.com';
    component.saveProfile();
    tick();
    expect(component.student.name).toBe('New Name');
    expect(component.profileMsg).toContain('successfully');
    expect(component.profileErr).toBeFalse();
  }));

  it('saveProfile() shows error on failure', () => {
    apiSpy.updateProfile.and.returnValue(throwError(() => ({ error: { message: 'Conflict' } })));
    component.saveProfile();
    expect(component.profileMsg).toBe('Conflict');
    expect(component.profileErr).toBeTrue();
  });

  // ── Contract ──────────────────────────────────────────────────────
  it('loadMyContract() populates contractInfo when data is returned', () => {
    apiSpy.getContracts.and.returnValue(of({
      contract_id: 10, status: 'ACTIVE', monthly_rent: 5000, due_day: 15,
      generated_doc_path: 'doc.pdf', signed_doc_path: null,
      start_date: '2025-01-01', end_date: '2026-01-01', created_at: '2025-01-01',
    }));
    component.loadMyContract();
    expect(component.contractLoaded).toBeTrue();
    expect(component.contractInfo.monthlyRent).toBe(5000);
    expect(component.contractInfo.hasGeneratedDoc).toBeTrue();
    expect(component.contractInfo.hasSignedDoc).toBeFalse();
  });

  it('loadMyContract() does nothing when data is null', () => {
    apiSpy.getContracts.and.returnValue(of(null));
    component.loadMyContract();
    expect(component.contractLoaded).toBeFalse();
  });

  it('loadMyContract() handles error gracefully', () => {
    apiSpy.getContracts.and.returnValue(throwError(() => new Error('fail')));
    expect(() => component.loadMyContract()).not.toThrow();
  });

  it('hasActiveContract returns true for ACTIVE status', () => {
    component.contractLoaded = true;
    component.contractInfo.status = 'ACTIVE';
    expect(component.hasActiveContract).toBeTrue();
  });

  it('hasActiveContract returns true for EXTENDED status', () => {
    component.contractLoaded = true;
    component.contractInfo.status = 'EXTENDED';
    expect(component.hasActiveContract).toBeTrue();
  });

  it('hasActiveContract returns false when not loaded', () => {
    component.contractLoaded = false;
    expect(component.hasActiveContract).toBeFalse();
  });

  it('hasActiveContract returns false for TERMINATED status', () => {
    component.contractLoaded = true;
    component.contractInfo.status = 'TERMINATED';
    expect(component.hasActiveContract).toBeFalse();
  });

  it('isNavDisabled() disables contract/payments when no active contract', () => {
    component.contractLoaded = false;
    expect(component.isNavDisabled('contract')).toBeTrue();
    expect(component.isNavDisabled('payments')).toBeTrue();
    expect(component.isNavDisabled('overview')).toBeFalse();
  });

  it('isNavDisabled() allows contract/payments when active contract exists', () => {
    component.contractLoaded = true;
    component.contractInfo.status = 'ACTIVE';
    expect(component.isNavDisabled('contract')).toBeFalse();
    expect(component.isNavDisabled('payments')).toBeFalse();
  });

  it('showRentBanner returns false when paymentRemindersEnabled is false', () => {
    component.contractLoaded = true;
    component.contractInfo.status = 'ACTIVE';
    component.paymentRemindersEnabled = false;
    component.nextPayment.daysLeft = 5;
    expect(component.showRentBanner).toBeFalse();
  });

  // ── Applications ──────────────────────────────────────────────────
  it('loadApplications() populates applications', () => {
    apiSpy.getApplications.and.returnValue(of([
      { application_id: 1, status: 'PENDING', submission_date: '2025-01-01' },
    ]));
    component.loadApplications();
    expect(component.applications.length).toBe(1);
  });

  it('loadApplications() sets error on failure', () => {
    apiSpy.getApplications.and.returnValue(throwError(() => new Error('fail')));
    component.loadApplications();
    expect(component.appsError).toContain('Could not load applications');
  });

  it('submitApplication() shows error when no date', () => {
    component.newAppDate = '';
    component.submitApplication();
    expect(component.appMsg).toContain('start date');
    expect(component.appErr).toBeTrue();
  });

  it('submitApplication() submits without files', fakeAsync(() => {
    component.newAppDate = '2025-06-01';
    component.contractLoaded = false;
    component.submitApplication();
    tick();
    expect(apiSpy.submitApplication).toHaveBeenCalledWith('2025-06-01', 'NEW');
    expect(component.appMsg).toContain('submitted');
  }));

  it('submitApplication() shows error on API failure', fakeAsync(() => {
    apiSpy.submitApplication.and.returnValue(throwError(() => new Error('fail')));
    component.newAppDate = '2025-06-01';
    component.submitApplication();
    tick();
    expect(component.appMsg).toBe('Failed to submit. Please try again.');
    expect(component.appErr).toBeTrue();
  }));

  // ── Complaints ─────────────────────────────────────────────────────
  it('loadComplaints() populates complaints and updates stats', () => {
    apiSpy.getComplaints.and.returnValue(of([
      { complaint_id: 1, description: 'Broken tap', status: 'SUBMITTED', created_at: new Date().toISOString() },
    ]));
    component.loadComplaints();
    expect(component.complaints.length).toBe(1);
    expect(component.stats[3].value).toBe(1);
  });

  it('loadComplaints() sets error on failure', () => {
    apiSpy.getComplaints.and.returnValue(throwError(() => new Error('fail')));
    component.loadComplaints();
    expect(component.complaintsError).toContain('Could not load complaints');
  });

  it('openComplaintDialog() shows error when description is empty', () => {
    component.newComplaint = '';
    component.openComplaintDialog();
    expect(component.complaintMsg).toContain('describe');
    expect(component.complaintErr).toBeTrue();
  });

  it('openComplaintDialog() opens dialog with description', () => {
    component.newComplaint = 'The heater is broken';
    component.newComplaintTitle = 'Heater issue';
    component.openComplaintDialog();
    expect(component.complaintDialog.open).toBeTrue();
    expect(component.complaintDialog.fullDesc).toContain('Heater issue');
  });

  it('openComplaintDialog() uses description without title when title is empty', () => {
    component.newComplaint = 'Water leak in bathroom';
    component.newComplaintTitle = '';
    component.openComplaintDialog();
    expect(component.complaintDialog.fullDesc).toBe('Water leak in bathroom');
    expect(component.complaintDialog.title).toBe('(no title)');
  });

  it('openComplaintDialog() truncates long descriptions in preview', () => {
    component.newComplaint = 'A'.repeat(150);
    component.openComplaintDialog();
    expect(component.complaintDialog.descriptionPreview.length).toBeLessThan(125);
    expect(component.complaintDialog.descriptionPreview).toContain('…');
  });

  it('confirmSubmitComplaint() succeeds and resets dialog', () => {
    component.complaintDialog.fullDesc = 'Issue desc';
    component.confirmSubmitComplaint();
    expect(apiSpy.submitComplaint).toHaveBeenCalledWith('Issue desc');
    expect(component.complaintDialog.phase).toBe('result');
    expect(component.complaintDialog.success).toBeTrue();
  });

  it('confirmSubmitComplaint() sets failure on error', () => {
    apiSpy.submitComplaint.and.returnValue(throwError(() => new Error('fail')));
    component.complaintDialog.fullDesc = 'Issue';
    component.confirmSubmitComplaint();
    expect(component.complaintDialog.success).toBeFalse();
  });

  it('closeComplaintDialog() closes dialog', () => {
    component.complaintDialog.open = true;
    component.closeComplaintDialog();
    expect(component.complaintDialog.open).toBeFalse();
  });

  // ── Payments ──────────────────────────────────────────────────────
  it('loadPayments() populates payments', () => {
    apiSpy.getPayments.and.returnValue(of([{ payment_id: 1, amount: 5000 }]));
    component.loadPayments();
    expect(component.payments.length).toBe(1);
  });

  it('loadPayments() sets error on failure', () => {
    apiSpy.getPayments.and.returnValue(throwError(() => new Error('fail')));
    component.loadPayments();
    expect(component.paymentsError).toContain('Could not load payments');
  });

  it('recordPayment() shows error when no month or amount', () => {
    component.paymentMonth = '';
    component.paymentAmount = null;
    component.recordPayment();
    expect(component.paymentMsg).toContain('all payment fields');
  });

  it('recordPayment() shows error when no receipt', () => {
    component.paymentMonth = 'Jan';
    component.paymentAmount = 5000;
    component.paymentReceipt = null;
    component.recordPayment();
    expect(component.paymentMsg).toContain('receipt');
  });

  it('recordPayment() submits successfully', fakeAsync(() => {
    component.paymentMonth   = 'Jan';
    component.paymentAmount  = 5000;
    component.paymentReceipt = new File([''], 'receipt.pdf');
    component.recordPayment();
    tick();
    expect(apiSpy.recordPayment).toHaveBeenCalled();
    expect(component.paymentMsg).toContain('submitted');
  }));

  it('recordPayment() shows error on API failure', fakeAsync(() => {
    apiSpy.recordPayment.and.returnValue(throwError(() => new Error('fail')));
    component.paymentMonth   = 'Jan';
    component.paymentAmount  = 5000;
    component.paymentReceipt = new File([''], 'r.pdf');
    component.recordPayment();
    tick();
    expect(component.paymentErr).toBeTrue();
  }));

  it('loadOverduePayments() sets overdueInfo on success', () => {
    apiSpy.getOverduePayments.and.returnValue(of({ overdueMonths: ['Jan', 'Feb'], totalOverdue: 10000, monthlyRent: 5000 }));
    component.loadOverduePayments();
    expect(component.overdueInfo.months.length).toBe(2);
  });

  it('loadOverduePayments() handles error gracefully', () => {
    apiSpy.getOverduePayments.and.returnValue(throwError(() => new Error('fail')));
    expect(() => component.loadOverduePayments()).not.toThrow();
  });

  // ── Documents ─────────────────────────────────────────────────────
  it('loadMyFiles() populates appFiles', () => {
    apiSpy.getMyFiles.and.returnValue(of([{ file_id: 1, stored_name: 'doc.pdf' }]));
    component.loadMyFiles();
    expect(component.appFiles.length).toBe(1);
  });

  it('loadMyFiles() sets error on failure', () => {
    apiSpy.getMyFiles.and.returnValue(throwError(() => new Error('fail')));
    component.loadMyFiles();
    expect(component.filesError).toContain('Could not load documents');
  });

  it('formatFileSize() formats bytes correctly', () => {
    expect(component.formatFileSize(500)).toBe('500 B');
    expect(component.formatFileSize(2048)).toBe('2.0 KB');
    expect(component.formatFileSize(1048576 * 2)).toBe('2.0 MB');
  });

  it('fileIcon() returns correct icons', () => {
    expect(component.fileIcon('application/pdf')).toBe('document-text.svg');
    expect(component.fileIcon('image/png')).toBe('identification.svg');
    expect(component.fileIcon('text/plain')).toBe('document.svg');
  });

  it('downloadFile() triggers blob download', () => {
    const mockLink = { href: '', download: '', click: jasmine.createSpy('click') } as any;
    const orig = document.createElement.bind(document);
    spyOn(document, 'createElement').and.callFake((t: string) => t === 'a' ? mockLink : orig(t));
    component.downloadFile(1, 'doc.pdf');
    expect(apiSpy.downloadFile).toHaveBeenCalledWith(1);
  });

  it('downloadFile() shows error on failure', () => {
    apiSpy.downloadFile.and.returnValue(throwError(() => new Error('fail')));
    component.downloadFile(1, 'doc.pdf');
    expect(component.docMsg).toContain('Download failed');
  });

  // ── Contract download/upload ───────────────────────────────────────
  it('downloadContract() triggers blob download', () => {
    const mockLink = { href: '', download: '', click: jasmine.createSpy('click') } as any;
    const orig = document.createElement.bind(document);
    spyOn(document, 'createElement').and.callFake((t: string) => t === 'a' ? mockLink : orig(t));
    component.downloadContract();
    expect(apiSpy.downloadContract).toHaveBeenCalled();
  });

  it('downloadContract() shows error when not available', () => {
    apiSpy.downloadContract.and.returnValue(throwError(() => new Error('fail')));
    component.downloadContract();
    expect(component.contractUploadMsg).toContain('not available');
    expect(component.contractUploadErr).toBeTrue();
  });

  it('uploadSignedContract() shows error when no file selected', () => {
    component.signedContractFile = null;
    component.uploadSignedContract();
    expect(component.contractUploadMsg).toContain('select a PDF');
    expect(component.contractUploadErr).toBeTrue();
  });

  it('uploadSignedContract() uploads successfully', fakeAsync(() => {
    component.signedContractFile = new File(['content'], 'signed.pdf');
    component.uploadSignedContract();
    tick();
    expect(apiSpy.uploadSignedContract).toHaveBeenCalled();
    expect(component.contractUploadMsg).toContain('successfully');
    expect(component.contractInfo.hasSignedDoc).toBeTrue();
  }));

  it('uploadSignedContract() shows error on failure', fakeAsync(() => {
    apiSpy.uploadSignedContract.and.returnValue(throwError(() => new Error('fail')));
    component.signedContractFile = new File(['content'], 'signed.pdf');
    component.uploadSignedContract();
    tick();
    expect(component.contractUploadMsg).toContain('Upload failed');
    expect(component.contractUploadErr).toBeTrue();
  }));

  it('removeSignedContract() clears the file', () => {
    component.signedContractFile = new File([''], 'file.pdf');
    component.removeSignedContract();
    expect(component.signedContractFile).toBeNull();
  });

  // ── Termination ───────────────────────────────────────────────────
  it('loadMyTerminationRequest() sets request on success', () => {
    apiSpy.getMyTerminationRequest.and.returnValue(of({ id: 1, reason: 'Moving out' }));
    component.loadMyTerminationRequest();
    expect(component.myTerminationRequest?.id).toBe(1);
  });

  it('openTerminationDialog() opens dialog', () => {
    component.openTerminationDialog();
    expect(component.terminationDialog.open).toBeTrue();
    expect(component.terminationDialog.phase).toBe('form');
  });

  it('proceedToTerminationConfirm() validates empty reason', () => {
    component.terminationDialog.reason = '';
    component.proceedToTerminationConfirm();
    expect(component.terminationDialog.errorMsg).toContain('reason');
  });

  it('proceedToTerminationConfirm() validates missing end date', () => {
    component.terminationDialog.reason = 'Moving';
    component.terminationDialog.requestedEndDate = '';
    component.proceedToTerminationConfirm();
    expect(component.terminationDialog.errorMsg).toContain('end date');
  });

  it('proceedToTerminationConfirm() advances to confirm when valid', () => {
    component.terminationDialog.reason = 'Moving out';
    component.terminationDialog.requestedEndDate = '2026-01-01';
    component.proceedToTerminationConfirm();
    expect(component.terminationDialog.phase).toBe('confirm');
  });

  it('confirmSubmitTerminationRequest() succeeds and reloads', () => {
    component.terminationDialog.reason = 'Reason';
    component.terminationDialog.requestedEndDate = '2026-01-01';
    component.confirmSubmitTerminationRequest();
    expect(apiSpy.submitTerminationRequest).toHaveBeenCalledWith('Reason', '2026-01-01');
    expect(component.terminationDialog.success).toBeTrue();
  });

  it('confirmSubmitTerminationRequest() shows failure on error', () => {
    apiSpy.submitTerminationRequest.and.returnValue(throwError(() => ({ error: { message: 'Duplicate' } })));
    component.terminationDialog.reason = 'Reason';
    component.terminationDialog.requestedEndDate = '2026-01-01';
    component.confirmSubmitTerminationRequest();
    expect(component.terminationDialog.success).toBeFalse();
    expect(component.terminationDialog.errorMsg).toBe('Duplicate');
  });

  it('closeTerminationDialog() closes dialog', () => {
    component.terminationDialog.open = true;
    component.closeTerminationDialog();
    expect(component.terminationDialog.open).toBeFalse();
  });

  // ── Report modal ──────────────────────────────────────────────────
  it('generateReport() opens modal and calls API', fakeAsync(() => {
    apiSpy.getReportProgress.and.returnValue(of({ percentage: 100, status: 'COMPLETED' }));
    component.generateReport();
    expect(component.reportModal.open).toBeTrue();
    expect(apiSpy.generateReport).toHaveBeenCalled();
    // clear the poll interval so it doesn't leak into other tests
    component.closeReportModal();
    tick(1000);
  }));

  it('generateReport() handles API error gracefully', () => {
    apiSpy.generateReport.and.returnValue(throwError(() => new Error('fail')));
    expect(() => component.generateReport()).not.toThrow();
  });

  it('closeReportModal() closes modal', () => {
    component.reportModal.open = true;
    component.closeReportModal();
    expect(component.reportModal.open).toBeFalse();
  });

  it('closeReportModal() clears poll interval', fakeAsync(() => {
    component.reportModal.pollInterval = setInterval(() => {}, 1000);
    component.closeReportModal();
    tick(2000);
    // If interval was cleared, no errors should occur
    expect(component.reportModal.pollInterval).toBeNull();
  }));

  it('cancelReport() calls API if reportId > 0', () => {
    component.reportModal.reportId = 3;
    component.cancelReport();
    expect(apiSpy.cancelReport).toHaveBeenCalledWith(3);
  });

  it('cancelReport() does nothing when reportId is 0', () => {
    component.reportModal.reportId = 0;
    component.cancelReport();
    expect(apiSpy.cancelReport).not.toHaveBeenCalled();
  });

  it('downloadGeneratedReport() triggers blob download', () => {
    const mockLink = { href: '', download: '', click: jasmine.createSpy('click') } as any;
    const orig = document.createElement.bind(document);
    spyOn(document, 'createElement').and.callFake((t: string) => t === 'a' ? mockLink : orig(t));
    component.reportModal.reportId = 5;
    component.downloadGeneratedReport();
    expect(apiSpy.downloadReport).toHaveBeenCalledWith(5);
  });

  // ── Helpers ───────────────────────────────────────────────────────
  it('badgeClass() maps statuses to CSS classes', () => {
    expect(component.badgeClass('PENDING')).toBe('badge--warning');
    expect(component.badgeClass('ACCEPTED')).toBe('badge--success');
    expect(component.badgeClass('REJECTED')).toBe('badge--danger');
    expect(component.badgeClass('SUBMITTED')).toBe('badge--info');
    expect(component.badgeClass('RESOLVED')).toBe('badge--success');
    expect(component.badgeClass('ACTIVE')).toBe('badge--success');
    expect(component.badgeClass('TERMINATED')).toBe('badge--danger');
    expect(component.badgeClass('UNKNOWN')).toBe('badge--default');
  });

  it('timeAgo() returns "Just now" for recent dates', () => {
    expect(component.timeAgo(new Date().toISOString())).toBe('Just now');
  });

  it('timeAgo() returns minutes for < 1hr', () => {
    const fiveAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(component.timeAgo(fiveAgo)).toBe('5 min ago');
  });

  it('timeAgo() returns hours for < 24hrs', () => {
    const twoHrsAgo = new Date(Date.now() - 2 * 3600000).toISOString();
    expect(component.timeAgo(twoHrsAgo)).toBe('2 hr ago');
  });

  it('timeAgo() returns Yesterday for 1 day ago', () => {
    const ydAgo = new Date(Date.now() - 25 * 3600000).toISOString();
    expect(component.timeAgo(ydAgo)).toBe('Yesterday');
  });

  it('timeAgo() returns days for > 1 day', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    expect(component.timeAgo(threeDaysAgo)).toBe('3 days ago');
  });

  it('toggleSidebar() flips sidebarOpen', () => {
    expect(component.sidebarOpen).toBeTrue();
    component.toggleSidebar();
    expect(component.sidebarOpen).toBeFalse();
  });

  it('logout() calls auth.logout() and navigates to /login', async () => {
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.logout();
    expect(authSpy.logout).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/login']);
  });

  it('pageName returns correct label', () => {
    component.activeNav = 'profile';
    expect(component.pageName).toBe('Profile');
    component.activeNav = 'payments';
    expect(component.pageName).toBe('Payments');
    component.activeNav = 'nonexistent';
    expect(component.pageName).toBe('Overview');
  });

  it('notifIcon() returns correct icon per type', () => {
    expect(component.notifIcon('application')).toBe('home.svg');
    expect(component.notifIcon('contract')).toBe('clipboard-list.svg');
    expect(component.notifIcon('payment')).toBe('credit-card.svg');
    expect(component.notifIcon('complaint')).toBe('wrench.svg');
    expect(component.notifIcon('unknown')).toBe('bell.svg');
  });

  it('markAllRead() delegates to notifService', () => {
    component.markAllRead();
    expect(notifSpy.markAllRead).toHaveBeenCalled();
  });

  it('paymentSummary getter computes totals correctly', () => {
    component.payments = [
      { payment_id: 1, amount: 5000, month: 'Jan', created_at: '2025-01-01' },
      { payment_id: 2, amount: 5000, month: 'Feb', created_at: '2025-02-01' },
    ];
    const summary = component.paymentSummary;
    expect(summary.totalPaid).toBe(10000);
  });

  it('allSelectedFiles getter combines checklist and extra files', () => {
    component.checklistItems[0].file = new File([''], 'enroll.pdf');
    component.extraFiles = [new File([''], 'extra.pdf')];
    expect(component.allSelectedFiles.length).toBe(2);
  });

  it('checklistDoneCount getter counts files in checklist', () => {
    component.checklistItems[0].file = new File([''], 'enroll.pdf');
    component.checklistItems[1].file = new File([''], 'id.pdf');
    expect(component.checklistDoneCount).toBe(2);
  });

  it('removeExtraFile() removes file at index', () => {
    component.extraFiles = [new File([''], 'a.pdf'), new File([''], 'b.pdf')];
    component.removeExtraFile(0);
    expect(component.extraFiles.length).toBe(1);
  });

  it('removeChecklistFile() clears file at index', () => {
    component.checklistItems[0].file = new File([''], 'enroll.pdf');
    component.removeChecklistFile(0);
    expect(component.checklistItems[0].file).toBeNull();
  });

  it('removeReceipt() clears paymentReceipt', () => {
    component.paymentReceipt = new File([''], 'r.pdf');
    component.removeReceipt();
    expect(component.paymentReceipt).toBeNull();
  });

  // ── Dormitory settings ────────────────────────────────────────────
  it('loadDormitorySettings() sets paymentRemindersEnabled', () => {
    apiSpy.getDormitorySettings.and.returnValue(of({
      notifications_enabled: 1, payment_reminders_enabled: 0, maintenance_alerts_enabled: 1,
    }));
    component.loadDormitorySettings();
    expect(component.paymentRemindersEnabled).toBeFalse();
  });

  it('loadDormitorySettings() handles error gracefully', () => {
    apiSpy.getDormitorySettings.and.returnValue(throwError(() => new Error('fail')));
    expect(() => component.loadDormitorySettings()).not.toThrow();
  });

  // ── setActive ──────────────────────────────────────────────────────
  it('setActive() does nothing when nav is disabled', () => {
    component.contractLoaded = false;
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.setActive('contract');
    expect(navSpy).not.toHaveBeenCalled();
  });

  it('setActive("overview") loads profile, contract, and overdue', () => {
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.setActive('overview');
    expect(apiSpy.getProfile).toHaveBeenCalledTimes(2);
    expect(apiSpy.getContracts).toHaveBeenCalledTimes(2);
    expect(apiSpy.getOverduePayments).toHaveBeenCalledTimes(2);
  });

  it('setActive("apply") loads applications', () => {
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.setActive('apply');
    expect(apiSpy.getApplications).toHaveBeenCalledTimes(2);
  });

  it('setActive("complaints") loads complaints', () => {
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.setActive('complaints');
    expect(apiSpy.getComplaints).toHaveBeenCalledTimes(2);
  });

  it('setActive("payments") loads payments and overdue', () => {
    component.contractLoaded = true;
    component.contractInfo.status = 'ACTIVE';
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.setActive('payments');
    expect(apiSpy.getPayments).toHaveBeenCalledTimes(2);
    expect(apiSpy.getOverduePayments).toHaveBeenCalledTimes(2);
  });

  it('setActive("contract") loads contract and termination request', () => {
    component.contractLoaded = true;
    component.contractInfo.status = 'ACTIVE';
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.setActive('contract');
    expect(apiSpy.getContracts).toHaveBeenCalledTimes(2);
    expect(apiSpy.getMyTerminationRequest).toHaveBeenCalledTimes(2);
  });

  it('setActive("profile") loads profile', () => {
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.setActive('profile');
    expect(apiSpy.getProfile).toHaveBeenCalledTimes(2);
  });

  it('setActive("documents") loads files', () => {
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.setActive('documents');
    expect(apiSpy.getMyFiles).toHaveBeenCalledTimes(2);
  });

  it('loadProfile() covers null fields gracefully', () => {
    apiSpy.getProfile.and.returnValue(of({ name: null, email: null, phone: null }));
    component.loadProfile();
    expect(component.profileForm.name).toBe('');
    expect(component.profileForm.email).toBe('');
    expect(component.profileForm.mobile).toBe('');
  });

  it('loadMyContract() covers date fields and dueDay branch', () => {
    apiSpy.getContracts.and.returnValue(of({
      contract_id: 10, status: null, monthly_rent: 5000, due_day: null,
      generated_doc_path: null, signed_doc_path: null,
      start_date: '2025-01-01', end_date: '2026-01-01', created_at: '2025-01-01',
    }));
    component.loadMyContract();
    expect(component.contractInfo.status).toBe('ACTIVE'); // fallback to 'ACTIVE'
    expect(component.contractInfo.dueDay).toBe(15); // fallback to 15
  });

  it('loadMyContract() handles room_number condition when roomInfo already set', () => {
    component.roomInfo.number = '101'; // not '—', so room_number branch won't set
    apiSpy.getContracts.and.returnValue(of({
      contract_id: 10, status: 'ACTIVE', monthly_rent: 5000, due_day: 15,
      generated_doc_path: null, signed_doc_path: null,
      start_date: '2025-01-01', end_date: '2026-01-01', created_at: '2025-01-01',
      room_number: '202',
    }));
    component.loadMyContract();
    expect(component.roomInfo.number).toBe('101'); // not overwritten
  });
});
