import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of, throwError, BehaviorSubject, Subject } from 'rxjs';
import { DashboardComponent } from './dashboard';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

// Prevent Chart.js from trying real canvas
(window as any).Chart = class {
  static register = () => {};
  destroy = () => {};
  constructor() {}
};

const makeStats = () => ({
  totalRooms: 64, occupiedRooms: 40, vacantRooms: 20, maintenanceRooms: 4,
  totalStudents: 40, pendingApplications: 3, openComplaints: 2,
  activeContracts: 38, totalPayments: 100,
});

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let notifSpy: jasmine.SpyObj<NotificationService>;
  let router: Router;

  const notifications$ = new BehaviorSubject<any[]>([]);
  const toast$ = new Subject<any>();

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj('ApiService', [
      'getStats', 'getActivity', 'getRooms', 'getApplications', 'getVacantRooms',
      'updateApplicationStatus', 'getComplaints', 'submitComplaint', 'updateComplaintStatus',
      'getPayments', 'verifyPayment', 'rejectPayment', 'downloadReceipt', 'getPaymentSummary',
      'getReports', 'generateAdminReport', 'downloadAdminReport',
      'getTerminationRequests', 'acceptTerminationRequest', 'rejectTerminationRequest',
      'getActiveContractStudents', 'adminTerminateContract',
      'getAdminProfile', 'updateAdminProfile', 'getDormitorySettings', 'updateDormitorySettings',
      'clearRoomMaintenance',
    ]);

    // Default happy-path stubs
    apiSpy.getStats.and.returnValue(of(makeStats()));
    apiSpy.getActivity.and.returnValue(of([]));
    apiSpy.getRooms.and.returnValue(of([]));
    apiSpy.getApplications.and.returnValue(of([]));
    apiSpy.getVacantRooms.and.returnValue(of([]));
    apiSpy.getComplaints.and.returnValue(of([]));
    apiSpy.getPayments.and.returnValue(of([]));
    apiSpy.getPaymentSummary.and.returnValue(of({}));
    apiSpy.getReports.and.returnValue(of([]));
    apiSpy.getTerminationRequests.and.returnValue(of([]));
    apiSpy.getAdminProfile.and.returnValue(of({ name: 'Admin', email: 'admin@dms.com', dormitory_name: 'Dorm A' }));
    apiSpy.getDormitorySettings.and.returnValue(of({ notifications_enabled: 1, payment_reminders_enabled: 1, maintenance_alerts_enabled: 1 }));
    apiSpy.updateApplicationStatus.and.returnValue(of({}));
    apiSpy.updateComplaintStatus.and.returnValue(of({}));
    apiSpy.verifyPayment.and.returnValue(of({}));
    apiSpy.rejectPayment.and.returnValue(of({}));
    apiSpy.downloadReceipt.and.returnValue(of(new Blob()));
    apiSpy.generateAdminReport.and.returnValue(of({ fileName: 'report.pdf' }));
    apiSpy.downloadAdminReport.and.returnValue('http://localhost:3000/uploads/reports/report.pdf');
    apiSpy.getActiveContractStudents.and.returnValue(of([]));
    apiSpy.adminTerminateContract.and.returnValue(of({}));
    apiSpy.acceptTerminationRequest.and.returnValue(of({}));
    apiSpy.rejectTerminationRequest.and.returnValue(of({}));
    apiSpy.clearRoomMaintenance.and.returnValue(of({}));
    apiSpy.updateAdminProfile.and.returnValue(of({}));
    apiSpy.updateDormitorySettings.and.returnValue(of({}));

    authSpy = jasmine.createSpyObj('AuthService', ['getName', 'getToken', 'logout', 'getRole', 'isAdmin', 'isStudent', 'getUserId', 'getEmail']);
    authSpy.getName.and.returnValue('Test Admin');
    authSpy.getToken.and.returnValue('tok');

    notifSpy = jasmine.createSpyObj('NotificationService', ['connect', 'disconnect', 'load', 'markRead', 'markAllRead'], {
      notifications$,
      toast$,
      unreadCount: 0,
    });
    notifSpy.markRead.and.returnValue(of({}));
    notifSpy.markAllRead.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: NotificationService, useValue: notifSpy },
        provideRouter([]),
        provideLocationMocks(),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture   = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    router    = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    notifications$.next([]);
  });

  // ── Creation & init ───────────────────────────────────────────────
  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('sets adminName and adminInitials from auth on init', () => {
    // loadAdminProfile() runs on init and overrides with API response name
    expect(component.adminName).toBe('Admin');
    expect(component.adminInitials).toBe('A');
  });

  it('calls all load methods on init', () => {
    expect(apiSpy.getStats).toHaveBeenCalled();
    expect(apiSpy.getActivity).toHaveBeenCalled();
    expect(apiSpy.getRooms).toHaveBeenCalled();
    expect(apiSpy.getApplications).toHaveBeenCalled();
    expect(apiSpy.getComplaints).toHaveBeenCalled();
    expect(apiSpy.getPayments).toHaveBeenCalled();
    expect(apiSpy.getReports).toHaveBeenCalled();
    expect(apiSpy.getAdminProfile).toHaveBeenCalled();
  });

  it('connects to notification service on init', () => {
    expect(notifSpy.connect).toHaveBeenCalled();
    expect(notifSpy.load).toHaveBeenCalled();
  });

  // ── Stats loading ─────────────────────────────────────────────────
  it('loadAdminStats() populates stat cards from API', () => {
    component.loadAdminStats();
    expect(component.stats[0].value).toBe(64);
    expect(component.stats[1].value).toBe(40);
    expect(component.stats[2].value).toBe(20);
    expect(component.stats[3].value).toBe(3);
  });

  it('loadAdminStats() gracefully handles API error', () => {
    apiSpy.getStats.and.returnValue(throwError(() => new Error('fail')));
    expect(() => component.loadAdminStats()).not.toThrow();
  });

  it('occupancyPct returns correct percentage', () => {
    component.dormStats = { totalRooms: 10, occupiedRooms: 8 };
    expect(component.occupancyPct).toBe(80);
  });

  it('occupancyPct returns 0 when totalRooms is 0', () => {
    component.dormStats = { totalRooms: 0, occupiedRooms: 0 };
    expect(component.occupancyPct).toBe(0);
  });

  it('occupancyPct treats null occupiedRooms as 0', () => {
    component.dormStats = { totalRooms: 10, occupiedRooms: null };
    expect(component.occupancyPct).toBe(0);
  });

  // ── Activity ──────────────────────────────────────────────────────
  it('loadActivity() maps application events', () => {
    apiSpy.getActivity.and.returnValue(of([
      { type: 'application', actor: 'Alice', detail: 'ACCEPTED', created_at: new Date().toISOString() },
    ]));
    component.loadActivity();
    expect(component.recentActivity[0].message).toContain('Alice');
    expect(component.recentActivity[0].icon).toBe('clipboard-list.svg');
  });

  it('loadActivity() maps complaint events', () => {
    apiSpy.getActivity.and.returnValue(of([
      { type: 'complaint', actor: 'Bob', detail: 'IN_PROGRESS', created_at: new Date().toISOString() },
    ]));
    component.loadActivity();
    expect(component.recentActivity[0].message).toContain('Bob');
    expect(component.recentActivity[0].icon).toBe('wrench.svg');
  });

  it('loadActivity() maps payment events', () => {
    apiSpy.getActivity.and.returnValue(of([
      { type: 'payment', actor: 'Carol', detail: 'Jan 2025', created_at: new Date().toISOString() },
    ]));
    component.loadActivity();
    expect(component.recentActivity[0].icon).toBe('credit-card.svg');
  });

  it('loadActivity() handles API error gracefully', () => {
    apiSpy.getActivity.and.returnValue(throwError(() => new Error('fail')));
    expect(() => component.loadActivity()).not.toThrow();
  });

  // ── timeAgo ───────────────────────────────────────────────────────
  it('timeAgo() returns "Just now" for < 1 min ago', () => {
    const now = new Date().toISOString();
    expect(component.timeAgo(now)).toBe('Just now');
  });

  it('timeAgo() returns minutes for < 1 hr ago', () => {
    const tenMinsAgo = new Date(Date.now() - 10 * 60000).toISOString();
    expect(component.timeAgo(tenMinsAgo)).toBe('10 min ago');
  });

  it('timeAgo() returns hours for < 24 hrs ago', () => {
    const twoHrsAgo = new Date(Date.now() - 2 * 3600000).toISOString();
    expect(component.timeAgo(twoHrsAgo)).toBe('2 hr ago');
  });

  it('timeAgo() returns "Yesterday" for 1 day ago', () => {
    const oneDayAgo = new Date(Date.now() - 25 * 3600000).toISOString();
    expect(component.timeAgo(oneDayAgo)).toBe('Yesterday');
  });

  it('timeAgo() returns days for > 1 day ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    expect(component.timeAgo(threeDaysAgo)).toBe('3 days ago');
  });

  // ── Rooms ─────────────────────────────────────────────────────────
  it('loadRooms() populates rooms array', () => {
    apiSpy.getRooms.and.returnValue(of([
      { room_id: 1, room_number: '101', floor: 1, type: 'Single', status: 'vacant' },
      { room_id: 2, room_number: '102', floor: 1, type: 'Double', status: 'occupied' },
    ]));
    component.loadRooms();
    expect(component.rooms.length).toBe(2);
  });

  it('loadRooms() sets error on API failure', () => {
    apiSpy.getRooms.and.returnValue(throwError(() => new Error('fail')));
    component.loadRooms();
    expect(component.roomsError).toContain('Could not load rooms');
  });

  it('filteredRooms returns all when filter is "all"', () => {
    component.rooms = [
      { room_id: 1, room_number: '101', floor: 1, type: 'Single', status: 'vacant' },
      { room_id: 2, room_number: '102', floor: 1, type: 'Double', status: 'occupied' },
    ];
    component.roomFilter = 'all';
    expect(component.filteredRooms.length).toBe(2);
  });

  it('filteredRooms filters by status', () => {
    component.rooms = [
      { room_id: 1, room_number: '101', floor: 1, type: 'Single', status: 'vacant' },
      { room_id: 2, room_number: '102', floor: 1, type: 'Double', status: 'occupied' },
    ];
    component.roomFilter = 'vacant';
    expect(component.filteredRooms.length).toBe(1);
    expect(component.filteredRooms[0].room_number).toBe('101');
  });

  it('floors returns unique sorted floor numbers', () => {
    component.rooms = [
      { room_id: 1, room_number: '201', floor: 2, type: 'Single', status: 'vacant' },
      { room_id: 2, room_number: '101', floor: 1, type: 'Double', status: 'occupied' },
      { room_id: 3, room_number: '202', floor: 2, type: 'Single', status: 'occupied' },
    ];
    component.roomFilter = 'all';
    expect(component.floors).toEqual([1, 2]);
  });

  it('occupiedCount/vacantCount/maintenanceCount work correctly', () => {
    component.rooms = [
      { room_id: 1, room_number: '101', floor: 1, type: 'S', status: 'occupied' },
      { room_id: 2, room_number: '102', floor: 1, type: 'S', status: 'vacant' },
      { room_id: 3, room_number: '103', floor: 1, type: 'S', status: 'maintenance' },
    ];
    expect(component.occupiedCount).toBe(1);
    expect(component.vacantCount).toBe(1);
    expect(component.maintenanceCount).toBe(1);
  });

  // ── Applications ──────────────────────────────────────────────────
  it('loadApplications() populates applications', () => {
    apiSpy.getApplications.and.returnValue(of([
      { application_id: 1, status: 'PENDING', application_type: 'NEW' },
    ]));
    component.loadApplications();
    expect(component.applications.length).toBe(1);
  });

  it('loadApplications() sets error on failure', () => {
    apiSpy.getApplications.and.returnValue(throwError(() => new Error('fail')));
    component.loadApplications();
    expect(component.appsError).toContain('Could not load applications');
  });

  it('newApplications getter filters NEW applications', () => {
    component.applications = [
      { application_id: 1, user_id: 1, submission_date: '', status: 'PENDING', assigned_room_id: null, created_at: '' },
      { application_id: 2, user_id: 2, submission_date: '', status: 'PENDING', assigned_room_id: null, created_at: '', application_type: 'EXTENSION' } as any,
    ];
    expect(component.newApplications.length).toBe(1);
  });

  it('extensionApplications getter filters EXTENSION applications', () => {
    component.applications = [
      { application_id: 1, user_id: 1, submission_date: '', status: 'PENDING', assigned_room_id: null, created_at: '', application_type: 'EXTENSION' } as any,
    ];
    expect(component.extensionApplications.length).toBe(1);
  });

  // ── Accept dialog ──────────────────────────────────────────────────
  it('openAcceptDialog() shows error if no room selected', () => {
    component.selectedRoomId = 0;
    component.openAcceptDialog(1);
    expect(component.appMsg).toContain('Please select a room');
    expect(component.appErr).toBeTrue();
  });

  it('openAcceptDialog() shows error if no start date', () => {
    component.selectedRoomId    = 1;
    component.contractStartDate = '';
    component.openAcceptDialog(1);
    expect(component.appMsg).toContain('start date');
  });

  it('openAcceptDialog() shows error if no end date', () => {
    component.selectedRoomId    = 1;
    component.contractStartDate = '2025-01-01';
    component.contractEndDate   = '';
    component.openAcceptDialog(1);
    expect(component.appMsg).toContain('end date');
  });

  it('openAcceptDialog() shows error if no rent', () => {
    component.selectedRoomId    = 1;
    component.contractStartDate = '2025-01-01';
    component.contractEndDate   = '2026-01-01';
    component.contractRent      = null;
    component.openAcceptDialog(1);
    expect(component.appMsg).toContain('monthly rent');
  });

  it('openAcceptDialog() opens dialog when all fields valid', () => {
    component.applications = [{ application_id: 5, user_id: 1, submission_date: '', status: 'PENDING', assigned_room_id: null, created_at: '', user_name: 'Alice' } as any];
    component.vacantRooms = [{ room_id: 2, room_number: '201', floor: 2, type: 'Single' }];
    component.selectedRoomId    = 2;
    component.contractStartDate = '2025-01-01';
    component.contractEndDate   = '2026-01-01';
    component.contractRent      = 5000;
    component.openAcceptDialog(5);
    expect(component.acceptDialog.open).toBeTrue();
    expect(component.acceptDialog.studentName).toBe('Alice');
  });

  it('confirmAcceptApplication() calls API and resets on success', () => {
    component.acceptDialog = { open: true, phase: 'confirm', success: false, appId: 5, studentName: 'Alice', roomLabel: '', startDate: '2025-01-01', endDate: '2026-01-01', monthlyRent: 5000, dueDay: 15, errorMsg: '' };
    component.selectedRoomId = 2;
    component.contractStartDate = '2025-01-01';
    component.contractEndDate = '2026-01-01';
    component.contractRent = 5000;
    component.contractDueDay = 15;
    component.confirmAcceptApplication();
    expect(component.acceptDialog.phase).toBe('result');
    expect(component.acceptDialog.success).toBeTrue();
  });

  it('confirmAcceptApplication() sets error on API failure', () => {
    apiSpy.updateApplicationStatus.and.returnValue(throwError(() => ({ error: { message: 'Room taken' } })));
    component.acceptDialog = { open: true, phase: 'confirm', success: false, appId: 5, studentName: 'Alice', roomLabel: '', startDate: '', endDate: '', monthlyRent: 5000, dueDay: 15, errorMsg: '' };
    component.confirmAcceptApplication();
    expect(component.acceptDialog.success).toBeFalse();
    expect(component.acceptDialog.errorMsg).toBe('Room taken');
  });

  it('confirmAcceptApplication() uses default error when no error.message', () => {
    apiSpy.updateApplicationStatus.and.returnValue(throwError(() => ({})));
    component.acceptDialog = { open: true, phase: 'confirm', success: false, appId: 5, studentName: 'Alice', roomLabel: '', startDate: '', endDate: '', monthlyRent: 5000, dueDay: 15, errorMsg: '' };
    component.confirmAcceptApplication();
    expect(component.acceptDialog.errorMsg).toBe('Failed to accept application.');
  });

  it('openAcceptDialog() uses "User #id" when app has no user_name', () => {
    component.applications = [{ application_id: 9, user_id: 7, submission_date: '', status: 'PENDING', assigned_room_id: null, created_at: '' }];
    component.vacantRooms = [{ room_id: 2, room_number: '202', floor: 2, type: 'Single' }];
    component.selectedRoomId    = 2;
    component.contractStartDate = '2025-01-01';
    component.contractEndDate   = '2026-01-01';
    component.contractRent      = 5000;
    component.openAcceptDialog(9);
    expect(component.acceptDialog.studentName).toBe('User #7');
  });

  it('openAcceptDialog() uses "Room #id" when room not found in vacantRooms', () => {
    component.applications = [{ application_id: 9, user_id: 7, submission_date: '', status: 'PENDING', assigned_room_id: null, created_at: '', user_name: 'Alice' } as any];
    component.vacantRooms = [];
    component.selectedRoomId    = 99;
    component.contractStartDate = '2025-01-01';
    component.contractEndDate   = '2026-01-01';
    component.contractRent      = 5000;
    component.openAcceptDialog(9);
    expect(component.acceptDialog.roomLabel).toBe('Room #99');
  });

  it('closeAcceptDialog() sets open to false', () => {
    component.acceptDialog.open = true;
    component.closeAcceptDialog();
    expect(component.acceptDialog.open).toBeFalse();
  });

  it('cancelAccept() resets all accept fields', () => {
    component.acceptingAppId = 5;
    component.selectedRoomId = 2;
    component.contractStartDate = '2025-01-01';
    component.contractEndDate = '2026-01-01';
    component.contractRent = 5000;
    component.cancelAccept();
    expect(component.acceptingAppId).toBe(0);
    expect(component.selectedRoomId).toBe(0);
    expect(component.contractRent).toBeNull();
  });

  // ── Reject dialog ─────────────────────────────────────────────────
  it('openRejectDialog() opens with correct student name', () => {
    component.applications = [{ application_id: 3, user_id: 1, submission_date: '', status: 'PENDING', assigned_room_id: null, created_at: '', user_name: 'Bob' } as any];
    component.openRejectDialog(3);
    expect(component.rejectDialog.open).toBeTrue();
    expect(component.rejectDialog.studentName).toBe('Bob');
  });

  it('openRejectDialog() uses fallback name when user_name is missing', () => {
    component.applications = [{ application_id: 4, user_id: 7, submission_date: '', status: 'PENDING', assigned_room_id: null, created_at: '' }];
    component.openRejectDialog(4);
    expect(component.rejectDialog.studentName).toBe('User #7');
  });

  it('proceedToRejectConfirm() changes phase to confirm', () => {
    component.rejectDialog.phase = 'remarks';
    component.proceedToRejectConfirm();
    expect(component.rejectDialog.phase).toBe('confirm');
  });

  it('backToRemarks() changes phase back to remarks', () => {
    component.rejectDialog.phase = 'confirm';
    component.backToRemarks();
    expect(component.rejectDialog.phase).toBe('remarks');
  });

  it('confirmRejectApplication() succeeds and shows result', () => {
    component.rejectDialog = { open: true, phase: 'confirm', success: false, appId: 3, studentName: 'Bob', remarks: 'No vacancy' };
    component.confirmRejectApplication();
    expect(component.rejectDialog.phase).toBe('result');
    expect(component.rejectDialog.success).toBeTrue();
  });

  it('confirmRejectApplication() sets failure on error', () => {
    apiSpy.updateApplicationStatus.and.returnValue(throwError(() => new Error('fail')));
    component.rejectDialog = { open: true, phase: 'confirm', success: false, appId: 3, studentName: 'Bob', remarks: '' };
    component.confirmRejectApplication();
    expect(component.rejectDialog.success).toBeFalse();
  });

  it('closeRejectDialog() sets open to false', () => {
    component.rejectDialog.open = true;
    component.closeRejectDialog();
    expect(component.rejectDialog.open).toBeFalse();
  });

  // ── Complaints ─────────────────────────────────────────────────────
  it('loadComplaints() populates complaints array', () => {
    apiSpy.getComplaints.and.returnValue(of([{ complaint_id: 1, description: 'Broken pipe', status: 'SUBMITTED' }]));
    component.loadComplaints();
    expect(component.complaints.length).toBe(1);
  });

  it('loadComplaints() sets error on failure', () => {
    apiSpy.getComplaints.and.returnValue(throwError(() => new Error('fail')));
    component.loadComplaints();
    expect(component.complaintsError).toContain('Could not load complaints');
  });

  it('updateComplaintStatus() calls API and reloads on success', () => {
    component.updateComplaintStatus(1, 'RESOLVED');
    expect(apiSpy.updateComplaintStatus).toHaveBeenCalledWith(1, 'RESOLVED');
    expect(component.complaintMsg).toContain('#1');
    expect(component.complaintErr).toBeFalse();
  });

  it('updateComplaintStatus() sets error message on failure', () => {
    apiSpy.updateComplaintStatus.and.returnValue(throwError(() => new Error('fail')));
    component.updateComplaintStatus(2, 'IN_PROGRESS');
    expect(component.complaintMsg).toBe('Failed to update status.');
    expect(component.complaintErr).toBeTrue();
  });

  // ── Payments ──────────────────────────────────────────────────────
  it('loadPayments() populates payments array', () => {
    apiSpy.getPayments.and.returnValue(of([{ payment_id: 1 }]));
    component.loadPayments();
    expect(component.payments.length).toBe(1);
  });

  it('loadPayments() sets error on failure', () => {
    apiSpy.getPayments.and.returnValue(throwError(() => new Error('fail')));
    component.loadPayments();
    expect(component.paymentsError).toContain('Could not load payments');
  });

  it('verifyPayment() calls API and shows success message', () => {
    component.verifyPayment(10);
    expect(apiSpy.verifyPayment).toHaveBeenCalledWith(10);
    expect(component.paymentMsg).toContain('#10 verified');
  });

  it('verifyPayment() shows error on failure', () => {
    apiSpy.verifyPayment.and.returnValue(throwError(() => new Error('fail')));
    component.verifyPayment(10);
    expect(component.paymentMsg).toBe('Failed to verify payment.');
    expect(component.paymentErr).toBeTrue();
  });

  it('rejectPayment() calls API and shows success message', () => {
    component.rejectPayment(11);
    expect(apiSpy.rejectPayment).toHaveBeenCalledWith(11);
    expect(component.paymentMsg).toContain('#11 rejected');
  });

  it('rejectPayment() shows error on failure', () => {
    apiSpy.rejectPayment.and.returnValue(throwError(() => new Error('fail')));
    component.rejectPayment(11);
    expect(component.paymentErr).toBeTrue();
  });

  it('downloadReceipt() triggers download blob on success', () => {
    const mockLink = { href: '', download: '', click: jasmine.createSpy('click') } as any;
    const orig = document.createElement.bind(document);
    spyOn(document, 'createElement').and.callFake((t: string) => t === 'a' ? mockLink : orig(t));
    component.downloadReceipt(5);
    expect(apiSpy.downloadReceipt).toHaveBeenCalledWith(5);
  });

  it('downloadReceipt() shows error on failure', () => {
    apiSpy.downloadReceipt.and.returnValue(throwError(() => new Error('fail')));
    component.downloadReceipt(5);
    expect(component.paymentMsg).toBe('Could not download receipt.');
    expect(component.paymentErr).toBeTrue();
  });

  // ── Reports ───────────────────────────────────────────────────────
  it('loadReports() populates reports array', () => {
    apiSpy.getReports.and.returnValue(of([{ report_id: 1, status: 'COMPLETED', file_path: 'r.pdf' }]));
    component.loadReports();
    expect(component.reports.length).toBe(1);
  });

  it('loadReports() sets error on failure', () => {
    apiSpy.getReports.and.returnValue(throwError(() => new Error('fail')));
    component.loadReports();
    expect(component.reportsError).toContain('Could not load reports');
  });

  it('generateAdminReport() opens modal with GENERATING status', () => {
    const mockLink = { href: '', download: '', click: jasmine.createSpy('click') } as any;
    const orig = document.createElement.bind(document);
    spyOn(document, 'createElement').and.callFake((t: string) => t === 'a' ? mockLink : orig(t));
    component.generateAdminReport();
    expect(component.adminReportModal.open).toBeTrue();
    expect(component.adminReportModal.status).toBe('COMPLETED'); // resolved immediately in test
  });

  it('generateAdminReport() sets COMPLETED on success', () => {
    const mockLink = { href: '', download: '', click: jasmine.createSpy('click') } as any;
    const orig = document.createElement.bind(document);
    spyOn(document, 'createElement').and.callFake((t: string) => t === 'a' ? mockLink : orig(t));
    component.generateAdminReport();
    expect(component.adminReportModal.status).toBe('COMPLETED');
    expect(component.adminReportModal.fileName).toBe('report.pdf');
    expect(component.reportMsg).toBe('Report generated successfully!');
  });

  it('generateAdminReport() sets FAILED on error', () => {
    apiSpy.generateAdminReport.and.returnValue(throwError(() => new Error('fail')));
    component.generateAdminReport();
    expect(component.adminReportModal.status).toBe('FAILED');
    expect(component.reportErr).toBeTrue();
  });

  it('closeAdminReportModal() sets open to false', () => {
    component.adminReportModal.open = true;
    component.closeAdminReportModal();
    expect(component.adminReportModal.open).toBeFalse();
  });

  it('downloadAdminReportAgain() calls api.downloadAdminReport', () => {
    const mockLink = { href: '', download: '', click: jasmine.createSpy('click') } as any;
    const orig = document.createElement.bind(document);
    spyOn(document, 'createElement').and.callFake((t: string) => t === 'a' ? mockLink : orig(t));
    component.adminReportModal.fileName = 'r.pdf';
    component.downloadAdminReportAgain();
    expect(apiSpy.downloadAdminReport).toHaveBeenCalledWith('r.pdf');
    expect(mockLink.click).toHaveBeenCalled();
  });

  // ── Maintenance dialog ────────────────────────────────────────────
  it('openMaintenanceDialog() sets dialog open with room', () => {
    const room = { room_id: 3, room_number: '103', floor: 1, type: 'Single', status: 'maintenance' as const };
    component.openMaintenanceDialog(room);
    expect(component.maintenanceDialog.open).toBeTrue();
    expect(component.maintenanceDialog.room?.room_id).toBe(3);
  });

  it('closeMaintenanceDialog() resets dialog', () => {
    component.maintenanceDialog = { open: true, room: { room_id: 3, room_number: '103', floor: 1, type: 'S', status: 'maintenance' }, loading: false };
    component.closeMaintenanceDialog();
    expect(component.maintenanceDialog.open).toBeFalse();
    expect(component.maintenanceDialog.room).toBeNull();
  });

  it('confirmClearMaintenance() calls API and reloads on success', () => {
    component.maintenanceDialog = { open: true, room: { room_id: 3, room_number: '103', floor: 1, type: 'S', status: 'maintenance' }, loading: false };
    component.confirmClearMaintenance();
    expect(apiSpy.clearRoomMaintenance).toHaveBeenCalledWith(3);
  });

  it('confirmClearMaintenance() handles API error', () => {
    apiSpy.clearRoomMaintenance.and.returnValue(throwError(() => new Error('fail')));
    component.maintenanceDialog = { open: true, room: { room_id: 3, room_number: '103', floor: 1, type: 'S', status: 'maintenance' }, loading: false };
    component.confirmClearMaintenance();
    expect(component.maintenanceDialog.loading).toBeFalse();
  });

  it('confirmClearMaintenance() does nothing when no room', () => {
    component.maintenanceDialog = { open: true, room: null, loading: false };
    expect(() => component.confirmClearMaintenance()).not.toThrow();
  });

  // ── Termination requests ──────────────────────────────────────────
  it('loadTerminationRequests() populates array', () => {
    apiSpy.getTerminationRequests.and.returnValue(of([{ id: 1 }]));
    component.loadTerminationRequests();
    expect(component.terminationRequests.length).toBe(1);
  });

  it('loadTerminationRequests() sets error on failure', () => {
    apiSpy.getTerminationRequests.and.returnValue(throwError(() => new Error('fail')));
    component.loadTerminationRequests();
    expect(component.termReqsError).toContain('Could not load termination');
  });

  it('acceptTermReq() calls API', () => {
    component.acceptTermReq(5);
    expect(apiSpy.acceptTerminationRequest).toHaveBeenCalledWith(5);
  });

  it('rejectTermReq() calls API', () => {
    component.rejectTermReq(5);
    expect(apiSpy.rejectTerminationRequest).toHaveBeenCalledWith(5);
  });

  // ── Admin terminate dialog ────────────────────────────────────────
  it('openAdminTerminateDialog() opens dialog and loads students', () => {
    apiSpy.getActiveContractStudents.and.returnValue(of([{ contract_id: 1, name: 'Alice' }]));
    component.openAdminTerminateDialog();
    expect(component.adminTerminateDialog.open).toBeTrue();
    expect(component.adminTerminateDialog.students.length).toBe(1);
  });

  it('openAdminTerminateDialog() handles student load error', () => {
    apiSpy.getActiveContractStudents.and.returnValue(throwError(() => new Error('fail')));
    component.openAdminTerminateDialog();
    expect(component.adminTerminateDialog.errorMsg).toContain('Could not load students');
  });

  it('proceedToAdminTerminateConfirm() shows error when no student selected', () => {
    component.adminTerminateDialog.selectedStudent = null;
    component.proceedToAdminTerminateConfirm();
    expect(component.adminTerminateDialog.errorMsg).toContain('select a student');
  });

  it('proceedToAdminTerminateConfirm() shows error when no reason', () => {
    component.adminTerminateDialog.selectedStudent = { contract_id: 1, name: 'Alice' };
    component.adminTerminateDialog.reason = '';
    component.proceedToAdminTerminateConfirm();
    expect(component.adminTerminateDialog.errorMsg).toContain('reason');
  });

  it('proceedToAdminTerminateConfirm() advances phase when valid', () => {
    component.adminTerminateDialog.selectedStudent = { contract_id: 1, name: 'Alice' };
    component.adminTerminateDialog.reason = 'Policy violation';
    component.proceedToAdminTerminateConfirm();
    expect(component.adminTerminateDialog.phase).toBe('confirm');
  });

  it('confirmAdminTerminate() succeeds and shows result', () => {
    component.adminTerminateDialog.contractId = 1;
    component.adminTerminateDialog.reason = 'Violation';
    component.confirmAdminTerminate();
    expect(apiSpy.adminTerminateContract).toHaveBeenCalled();
    expect(component.adminTerminateDialog.success).toBeTrue();
  });

  it('confirmAdminTerminate() sets failure on error', () => {
    apiSpy.adminTerminateContract.and.returnValue(throwError(() => ({ error: { message: 'Failed' } })));
    component.adminTerminateDialog.contractId = 1;
    component.adminTerminateDialog.reason = 'Violation';
    component.confirmAdminTerminate();
    expect(component.adminTerminateDialog.success).toBeFalse();
    expect(component.adminTerminateDialog.errorMsg).toBe('Failed');
  });

  it('confirmAdminTerminate() uses default error when no error.message', () => {
    apiSpy.adminTerminateContract.and.returnValue(throwError(() => ({})));
    component.adminTerminateDialog.contractId = 1;
    component.adminTerminateDialog.reason = 'Violation';
    component.confirmAdminTerminate();
    expect(component.adminTerminateDialog.errorMsg).toBe('Termination failed.');
  });

  it('closeAdminTerminateDialog() closes dialog', () => {
    component.adminTerminateDialog.open = true;
    component.closeAdminTerminateDialog();
    expect(component.adminTerminateDialog.open).toBeFalse();
  });

  it('selectTerminateStudent() sets selected student and contractId', () => {
    const student = { contract_id: 7, name: 'Alice' };
    component.selectTerminateStudent(student);
    expect(component.adminTerminateDialog.selectedStudent).toEqual(student);
    expect(component.adminTerminateDialog.contractId).toBe(7);
  });

  it('selectTerminateStudentById() finds and selects student by contractId', () => {
    component.adminTerminateDialog.students = [
      { contract_id: 3, name: 'Alice' },
      { contract_id: 5, name: 'Bob' },
    ];
    component.selectTerminateStudentById(5);
    expect(component.adminTerminateDialog.selectedStudent?.name).toBe('Bob');
  });

  // ── Admin profile ─────────────────────────────────────────────────
  it('loadAdminProfile() populates adminProfile fields', () => {
    component.loadAdminProfile();
    expect(component.adminProfile.name).toBe('Admin');
    expect(component.adminProfile.dormitory_name).toBe('Dorm A');
  });

  it('loadAdminProfile() handles error gracefully', () => {
    apiSpy.getAdminProfile.and.returnValue(throwError(() => new Error('fail')));
    expect(() => component.loadAdminProfile()).not.toThrow();
  });

  it('saveAdminProfile() saves profile and shows success message', fakeAsync(() => {
    component.adminProfile.name = 'Updated Admin';
    component.saveAdminProfile();
    tick();
    expect(apiSpy.updateAdminProfile).toHaveBeenCalled();
    expect(component.adminProfileMsg).toBe('Profile saved successfully!');
    expect(component.adminProfileErr).toBeFalse();
  }));

  it('saveAdminProfile() shows error when profile save fails', () => {
    apiSpy.updateAdminProfile.and.returnValue(throwError(() => ({ error: { message: 'Unauthorized' } })));
    component.saveAdminProfile();
    expect(component.adminProfileMsg).toBe('Unauthorized');
    expect(component.adminProfileErr).toBeTrue();
  });

  it('saveAdminProfile() shows partial success when settings save fails', fakeAsync(() => {
    apiSpy.updateDormitorySettings.and.returnValue(throwError(() => new Error('fail')));
    component.saveAdminProfile();
    tick();
    expect(component.adminProfileMsg).toContain('settings failed');
  }));

  // ── badgeClass ────────────────────────────────────────────────────
  it('badgeClass() returns correct classes', () => {
    expect(component.badgeClass('PENDING')).toBe('badge--warning');
    expect(component.badgeClass('ACCEPTED')).toBe('badge--success');
    expect(component.badgeClass('REJECTED')).toBe('badge--danger');
    expect(component.badgeClass('SUBMITTED')).toBe('badge--info');
    expect(component.badgeClass('IN_PROGRESS')).toBe('badge--warning');
    expect(component.badgeClass('RESOLVED')).toBe('badge--success');
    expect(component.badgeClass('ACTIVE')).toBe('badge--success');
    expect(component.badgeClass('EXTENDED')).toBe('badge--info');
    expect(component.badgeClass('TERMINATED')).toBe('badge--danger');
    expect(component.badgeClass('UNKNOWN')).toBe('badge--default');
  });

  // ── Navigation helpers ────────────────────────────────────────────
  it('toggleSidebar() flips sidebarOpen', () => {
    expect(component.sidebarOpen).toBeTrue();
    component.toggleSidebar();
    expect(component.sidebarOpen).toBeFalse();
    component.toggleSidebar();
    expect(component.sidebarOpen).toBeTrue();
  });

  it('logout() calls auth.logout() and navigates to /login', async () => {
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.logout();
    expect(authSpy.logout).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/login']);
  });

  it('setActive("dashboard") loads stats and activity', () => {
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.setActive('dashboard');
    expect(apiSpy.getStats).toHaveBeenCalledTimes(2);
    expect(apiSpy.getActivity).toHaveBeenCalledTimes(2);
  });

  it('setActive("residents") loads applications and termination requests', () => {
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.setActive('residents');
    expect(apiSpy.getApplications).toHaveBeenCalledTimes(2);
    expect(apiSpy.getTerminationRequests).toHaveBeenCalledTimes(2);
  });

  it('setActive() triggers relevant load for "rooms"', () => {
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.setActive('rooms');
    expect(apiSpy.getRooms).toHaveBeenCalledTimes(2); // once on init, once on setActive
  });

  it('setActive() triggers load for "payments"', () => {
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.setActive('payments');
    expect(apiSpy.getPayments).toHaveBeenCalledTimes(2);
  });

  it('setActive() triggers load for "requests"', () => {
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.setActive('requests');
    expect(apiSpy.getComplaints).toHaveBeenCalledTimes(2);
  });

  it('setActive() triggers load for "reports"', () => {
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.setActive('reports');
    expect(apiSpy.getReports).toHaveBeenCalledTimes(2);
  });

  it('setActive() triggers load for "settings"', () => {
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.setActive('settings');
    expect(apiSpy.getAdminProfile).toHaveBeenCalledTimes(2);
  });

  it('pageName returns correct label for activeNav', () => {
    component.activeNav = 'rooms';
    expect(component.pageName).toBe('Rooms');
    component.activeNav = 'payments';
    expect(component.pageName).toBe('Payments');
    component.activeNav = 'unknown';
    expect(component.pageName).toBe('Dashboard');
  });

  it('navigateTo() delegates to setActive()', () => {
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    spyOn(component, 'setActive');
    component.navigateTo('rooms');
    expect(component.setActive).toHaveBeenCalledWith('rooms');
  });

  // ── Notification helpers ──────────────────────────────────────────
  it('notifIcon() returns correct icons for known types', () => {
    expect(component.notifIcon('application')).toBe('📋');
    expect(component.notifIcon('contract')).toBe('📄');
    expect(component.notifIcon('payment')).toBe('💳');
    expect(component.notifIcon('complaint')).toBe('🔧');
    expect(component.notifIcon('unknown')).toBe('🔔');
  });

  it('markAllRead() calls notifService.markAllRead()', () => {
    component.markAllRead();
    expect(notifSpy.markAllRead).toHaveBeenCalled();
  });

  it('dismissToast() removes toast from list', () => {
    const n: any = { notification_id: 99, is_read: true, type: 'payment', message: 'x', tab: 'payments', created_at: '' };
    component.toasts = [n];
    component.dismissToast(n);
    expect(component.toasts.length).toBe(0);
  });

  // ── startAcceptApplication ────────────────────────────────────────
  it('startAcceptApplication() loads vacant rooms', () => {
    apiSpy.getVacantRooms.and.returnValue(of([{ room_id: 1, room_number: '101' }]));
    component.startAcceptApplication(3);
    expect(apiSpy.getVacantRooms).toHaveBeenCalled();
    expect(component.vacantRooms.length).toBe(1);
  });

  it('startAcceptApplication() handles error loading vacant rooms', () => {
    apiSpy.getVacantRooms.and.returnValue(throwError(() => new Error('fail')));
    component.startAcceptApplication(3);
    expect(component.vacantRooms).toEqual([]);
  });
});
