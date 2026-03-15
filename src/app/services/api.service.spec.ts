import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  let authSpy: jasmine.SpyObj<AuthService>;

  const BASE = 'http://localhost:3000/api';

  beforeEach(() => {
    authSpy = jasmine.createSpyObj('AuthService', ['getToken']);
    authSpy.getToken.and.returnValue('test-token');

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ApiService,
        { provide: AuthService, useValue: authSpy },
      ],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // headers: no token
  it('uses empty string for Authorization when no token', () => {
    authSpy.getToken.and.returnValue(null);
    service.getStats().subscribe();
    const req = httpMock.expectOne(`${BASE}/stats`);
    expect(req.request.headers.get('Authorization')).toBe('');
    req.flush({});
  });

  // ── Stats & activity ──────────────────────────────────────────────
  it('getStats() GETs /api/stats with auth header', () => {
    service.getStats().subscribe(data => expect(data).toBeTruthy());
    const req = httpMock.expectOne(`${BASE}/stats`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('test-token');
    req.flush({ totalRooms: 10 });
  });

  it('getActivity() GETs /api/activity', () => {
    service.getActivity().subscribe();
    const req = httpMock.expectOne(`${BASE}/activity`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  // ── Rooms ─────────────────────────────────────────────────────────
  it('getRooms() GETs /api/rooms', () => {
    service.getRooms().subscribe(r => expect(r).toEqual([]));
    httpMock.expectOne(`${BASE}/rooms`).flush([]);
  });

  it('getVacantRooms() GETs /api/rooms/vacant', () => {
    service.getVacantRooms().subscribe();
    httpMock.expectOne(`${BASE}/rooms/vacant`).flush([]);
  });

  it('clearRoomMaintenance() PATCHes /api/rooms/:id/status', () => {
    service.clearRoomMaintenance(5).subscribe();
    const req = httpMock.expectOne(`${BASE}/rooms/5/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'vacant' });
    req.flush({ success: true });
  });

  // ── Applications ──────────────────────────────────────────────────
  it('getApplications() GETs /api/applications', () => {
    service.getApplications().subscribe(a => expect(a).toEqual([]));
    httpMock.expectOne(`${BASE}/applications`).flush([]);
  });

  it('submitApplication() POSTs /api/applications with NEW type by default', () => {
    service.submitApplication('2025-01-01').subscribe();
    const req = httpMock.expectOne(`${BASE}/applications`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ submission_date: '2025-01-01', application_type: 'NEW' });
    req.flush({ message: 'ok', applicationId: 1 });
  });

  it('submitApplication() POSTs with EXTENSION type when specified', () => {
    service.submitApplication('2025-06-01', 'EXTENSION').subscribe();
    const req = httpMock.expectOne(`${BASE}/applications`);
    expect(req.request.body.application_type).toBe('EXTENSION');
    req.flush({ message: 'ok', applicationId: 2 });
  });

  it('updateApplicationStatus() PATCHes /api/applications/:id/status', () => {
    service.updateApplicationStatus(3, 'ACCEPTED', { room_id: 10 }).subscribe();
    const req = httpMock.expectOne(`${BASE}/applications/3/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'ACCEPTED', room_id: 10 });
    req.flush({ success: true });
  });

  it('getApplicationFiles() GETs /api/applications/:id/files', () => {
    service.getApplicationFiles(7).subscribe();
    httpMock.expectOne(`${BASE}/applications/7/files`).flush([]);
  });

  it('getMyFiles() GETs /api/my-files', () => {
    service.getMyFiles().subscribe();
    httpMock.expectOne(`${BASE}/my-files`).flush([]);
  });

  it('downloadFile() GETs /api/files/:id/download as blob', () => {
    service.downloadFile(2).subscribe();
    const req = httpMock.expectOne(`${BASE}/files/2/download`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob());
  });

  // ── Complaints ────────────────────────────────────────────────────
  it('getComplaints() GETs /api/complaints', () => {
    service.getComplaints().subscribe();
    httpMock.expectOne(`${BASE}/complaints`).flush([]);
  });

  it('submitComplaint() POSTs /api/complaints', () => {
    service.submitComplaint('Broken pipe').subscribe();
    const req = httpMock.expectOne(`${BASE}/complaints`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ description: 'Broken pipe' });
    req.flush({ success: true });
  });

  it('updateComplaintStatus() PATCHes /api/complaints/:id/status', () => {
    service.updateComplaintStatus(11, 'RESOLVED').subscribe();
    const req = httpMock.expectOne(`${BASE}/complaints/11/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'RESOLVED' });
    req.flush({});
  });

  // ── Payments ─────────────────────────────────────────────────────
  it('getPayments() GETs /api/payments', () => {
    service.getPayments().subscribe();
    httpMock.expectOne(`${BASE}/payments`).flush([]);
  });

  it('verifyPayment() PATCHes /api/payments/:id/verify', () => {
    service.verifyPayment(8).subscribe();
    const req = httpMock.expectOne(`${BASE}/payments/8/verify`);
    expect(req.request.method).toBe('PATCH');
    req.flush({});
  });

  it('rejectPayment() PATCHes /api/payments/:id/reject', () => {
    service.rejectPayment(8).subscribe();
    const req = httpMock.expectOne(`${BASE}/payments/8/reject`);
    expect(req.request.method).toBe('PATCH');
    req.flush({});
  });

  it('downloadReceipt() GETs /api/payments/:id/receipt as blob', () => {
    service.downloadReceipt(4).subscribe();
    const req = httpMock.expectOne(`${BASE}/payments/4/receipt`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob());
  });

  it('getOverduePayments() GETs /api/payments/overdue', () => {
    service.getOverduePayments().subscribe();
    httpMock.expectOne(`${BASE}/payments/overdue`).flush({ overdueMonths: [], totalOverdue: 0, monthlyRent: 0 });
  });

  it('getPaymentSummary() GETs /api/payments/summary with query params', () => {
    service.getPaymentSummary('Jan', 2025).subscribe();
    const req = httpMock.expectOne(`${BASE}/payments/summary?month=Jan&year=2025`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  // ── Reports ───────────────────────────────────────────────────────
  it('getReports() GETs /api/reports', () => {
    service.getReports().subscribe();
    httpMock.expectOne(`${BASE}/reports`).flush([]);
  });

  it('generateReport() POSTs /api/reports', () => {
    service.generateReport().subscribe();
    const req = httpMock.expectOne(`${BASE}/reports`);
    expect(req.request.method).toBe('POST');
    req.flush({ reportId: 1, progressId: 1 });
  });

  it('getReportProgress() GETs /api/reports/:id/progress', () => {
    service.getReportProgress(3).subscribe();
    httpMock.expectOne(`${BASE}/reports/3/progress`).flush({ percentage: 50, status: 'PENDING' });
  });

  it('downloadReport() GETs /api/reports/:id/download as blob', () => {
    service.downloadReport(3).subscribe();
    const req = httpMock.expectOne(`${BASE}/reports/3/download`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob());
  });

  it('cancelReport() DELETEs /api/reports/:id', () => {
    service.cancelReport(3).subscribe();
    const req = httpMock.expectOne(`${BASE}/reports/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('generateAdminReport() POSTs /api/admin/reports with payload', () => {
    const payload = { stats: {}, chartImages: { occupancy: '', finances: '', maintenance: '' } };
    service.generateAdminReport(payload).subscribe();
    const req = httpMock.expectOne(`${BASE}/admin/reports`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ fileName: 'report.pdf' });
  });

  it('downloadAdminReport() returns a URL string (synchronous)', () => {
    const url = service.downloadAdminReport('report.pdf');
    expect(url).toBe('http://localhost:3000/uploads/reports/report.pdf');
  });

  // ── Contracts ─────────────────────────────────────────────────────
  it('getContracts() GETs /api/contracts', () => {
    service.getContracts().subscribe();
    httpMock.expectOne(`${BASE}/contracts`).flush({});
  });

  it('updateContractStatus() PATCHes /api/contracts/:id/status', () => {
    service.updateContractStatus(2, 'TERMINATED').subscribe();
    const req = httpMock.expectOne(`${BASE}/contracts/2/status`);
    expect(req.request.body).toEqual({ status: 'TERMINATED' });
    req.flush({});
  });

  it('downloadContract() GETs /api/contracts/download as blob', () => {
    service.downloadContract().subscribe();
    const req = httpMock.expectOne(`${BASE}/contracts/download`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob());
  });

  it('getActiveContractStudents() GETs /api/contracts/active-students', () => {
    service.getActiveContractStudents().subscribe();
    httpMock.expectOne(`${BASE}/contracts/active-students`).flush([]);
  });

  it('adminTerminateContract() POSTs /api/contracts/admin-terminate', () => {
    service.adminTerminateContract(5, 'Reason', '2025-12-01').subscribe();
    const req = httpMock.expectOne(`${BASE}/contracts/admin-terminate`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  // ── Termination requests ──────────────────────────────────────────
  it('submitTerminationRequest() POSTs /api/termination-requests', () => {
    service.submitTerminationRequest('Moving out', '2025-12-31').subscribe();
    const req = httpMock.expectOne(`${BASE}/termination-requests`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('getMyTerminationRequest() GETs /api/termination-requests/mine', () => {
    service.getMyTerminationRequest().subscribe();
    httpMock.expectOne(`${BASE}/termination-requests/mine`).flush(null);
  });

  it('getTerminationRequests() GETs /api/termination-requests', () => {
    service.getTerminationRequests().subscribe();
    httpMock.expectOne(`${BASE}/termination-requests`).flush([]);
  });

  it('acceptTerminationRequest() PATCHes /api/termination-requests/:id/accept', () => {
    service.acceptTerminationRequest(12).subscribe();
    const req = httpMock.expectOne(`${BASE}/termination-requests/12/accept`);
    expect(req.request.method).toBe('PATCH');
    req.flush({});
  });

  it('rejectTerminationRequest() PATCHes /api/termination-requests/:id/reject', () => {
    service.rejectTerminationRequest(12).subscribe();
    const req = httpMock.expectOne(`${BASE}/termination-requests/12/reject`);
    expect(req.request.method).toBe('PATCH');
    req.flush({});
  });

  // ── Admin profile ─────────────────────────────────────────────────
  it('getAdminProfile() GETs /api/admin/profile', () => {
    service.getAdminProfile().subscribe();
    httpMock.expectOne(`${BASE}/admin/profile`).flush({});
  });

  it('updateAdminProfile() PUTs /api/admin/profile', () => {
    const data = { name: 'Admin', email: 'a@dms.com', dormitory_name: 'Dorm A' };
    service.updateAdminProfile(data).subscribe();
    const req = httpMock.expectOne(`${BASE}/admin/profile`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('getUsers() GETs /api/users', () => {
    service.getUsers().subscribe();
    httpMock.expectOne(`${BASE}/users`).flush([]);
  });

  // ── uploadApplicationFiles (multipart, direct headers) ───────────
  it('uploadApplicationFiles() POSTs files with Authorization header', () => {
    const files = [new File(['a'], 'a.pdf'), new File(['b'], 'b.pdf')];
    service.uploadApplicationFiles(1, files).subscribe();
    const req = httpMock.expectOne(`${BASE}/applications/1/files`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('test-token');
    req.flush({ count: 2 });
  });

  it('uploadApplicationFiles() uses empty Authorization when no token', () => {
    authSpy.getToken.and.returnValue(null);
    service.uploadApplicationFiles(1, [new File(['x'], 'x.pdf')]).subscribe();
    const req = httpMock.expectOne(`${BASE}/applications/1/files`);
    expect(req.request.headers.get('Authorization')).toBe('');
    req.flush({});
  });

  // ── uploadSignedContract ──────────────────────────────────────────
  it('uploadSignedContract() POSTs with Authorization header', () => {
    service.uploadSignedContract(new File(['data'], 'signed.pdf')).subscribe();
    const req = httpMock.expectOne(`${BASE}/contracts/sign`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('test-token');
    req.flush({});
  });

  it('uploadSignedContract() uses empty Authorization when no token', () => {
    authSpy.getToken.and.returnValue(null);
    service.uploadSignedContract(new File(['data'], 'signed.pdf')).subscribe();
    const req = httpMock.expectOne(`${BASE}/contracts/sign`);
    expect(req.request.headers.get('Authorization')).toBe('');
    req.flush({});
  });

  // ── recordPayment (optional receipt) ─────────────────────────────
  it('recordPayment() POSTs without receipt when omitted', () => {
    service.recordPayment('Jan', 5000).subscribe();
    const req = httpMock.expectOne(`${BASE}/payments`);
    expect(req.request.method).toBe('POST');
    expect((req.request.body as FormData).has('receipt')).toBeFalse();
    req.flush({});
  });

  it('recordPayment() POSTs with receipt when provided', () => {
    service.recordPayment('Jan', 5000, new File(['r'], 'r.pdf')).subscribe();
    const req = httpMock.expectOne(`${BASE}/payments`);
    expect((req.request.body as FormData).has('receipt')).toBeTrue();
    req.flush({});
  });

  it('recordPayment() uses empty Authorization when no token', () => {
    authSpy.getToken.and.returnValue(null);
    service.recordPayment('Jan', 5000).subscribe();
    const req = httpMock.expectOne(`${BASE}/payments`);
    expect(req.request.headers.get('Authorization')).toBe('');
    req.flush({});
  });

  // ── Student profile ───────────────────────────────────────────────
  it('getProfile() GETs /api/profile', () => {
    service.getProfile().subscribe();
    httpMock.expectOne(`${BASE}/profile`).flush({});
  });

  it('updateProfile() PUTs /api/profile', () => {
    const data = { name: 'Student', email: 's@dms.com' };
    service.updateProfile(data).subscribe();
    const req = httpMock.expectOne(`${BASE}/profile`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  // ── Dormitory settings ────────────────────────────────────────────
  it('getDormitorySettings() GETs /api/dormitory-settings', () => {
    service.getDormitorySettings().subscribe();
    httpMock.expectOne(`${BASE}/dormitory-settings`).flush({});
  });

  it('updateDormitorySettings() PUTs /api/dormitory-settings', () => {
    const settings = { notifications_enabled: true, payment_reminders_enabled: true, maintenance_alerts_enabled: true };
    service.updateDormitorySettings(settings).subscribe();
    const req = httpMock.expectOne(`${BASE}/dormitory-settings`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });
});
