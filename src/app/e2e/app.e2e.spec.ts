/**
 * E2E Integration Tests — Angular Router + Component Flows
 * Tests full user journeys: guards, navigation, and component interactions.
 */
import { TestBed, fakeAsync, tick, ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { of, throwError, BehaviorSubject, Subject } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { App } from '../app';
import { HomeComponent } from '../pages/home/home';
import { LoginComponent } from '../pages/login/login';
import { DashboardComponent } from '../pages/dashboard/dashboard';
import { StudentDashboardComponent } from '../pages/student-dashboard/student-dashboard';
import { DashboardSectionComponent } from '../components/dashboard-section/dashboard-section';

import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';
import { NotificationService } from '../services/notification.service';
import { authGuard } from '../guards/auth.guard';
import { roleGuard } from '../guards/role.guard';

const e2eRoutes = [
  { path: '',      component: HomeComponent  },
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' },
    children: [{ path: '**', component: DashboardSectionComponent }],
  },
  {
    path: 'student-dashboard',
    component: StudentDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'STUDENT' },
    children: [{ path: '**', component: DashboardSectionComponent }],
  },
  { path: '**', redirectTo: '' },
];

const makeApiSpy = () => {
  const spy = jasmine.createSpyObj('ApiService', [
    'getStats', 'getActivity', 'getRooms', 'getApplications', 'getVacantRooms',
    'getComplaints', 'getPayments', 'getReports', 'getTerminationRequests',
    'getAdminProfile', 'getDormitorySettings', 'updateAdminProfile', 'updateDormitorySettings',
    'getProfile', 'getContracts', 'getMyFiles', 'getOverduePayments', 'getMyTerminationRequest',
    'downloadAdminReport', 'generateAdminReport', 'clearRoomMaintenance',
    'getPaymentSummary', 'verifyPayment', 'rejectPayment', 'downloadReceipt',
    'getActiveContractStudents', 'adminTerminateContract', 'acceptTerminationRequest',
    'rejectTerminationRequest', 'updateApplicationStatus', 'updateComplaintStatus',
    'updateDormitorySettings', 'updateAdminProfile',
    'generateReport', 'downloadContract', 'uploadSignedContract', 'getReportProgress',
    'cancelReport', 'downloadReport', 'recordPayment', 'submitComplaint',
    'uploadApplicationFiles', 'submitApplication', 'updateProfile', 'downloadFile',
    'submitTerminationRequest', 'getDormitorySettings',
  ]);
  const noop = of([]);
  spy.getStats.and.returnValue(of({ totalRooms: 64, occupiedRooms: 40, vacantRooms: 20, maintenanceRooms: 4, totalStudents: 40, pendingApplications: 0, openComplaints: 0, activeContracts: 38, totalPayments: 100 }));
  spy.getActivity.and.returnValue(noop);
  spy.getRooms.and.returnValue(noop);
  spy.getApplications.and.returnValue(noop);
  spy.getVacantRooms.and.returnValue(noop);
  spy.getComplaints.and.returnValue(noop);
  spy.getPayments.and.returnValue(noop);
  spy.getPaymentSummary.and.returnValue(of({}));
  spy.getReports.and.returnValue(noop);
  spy.getTerminationRequests.and.returnValue(noop);
  spy.getAdminProfile.and.returnValue(of({ name: 'Admin', email: 'admin@dms.com', dormitory_name: 'Dorm A' }));
  spy.getDormitorySettings.and.returnValue(of({ notifications_enabled: 1, payment_reminders_enabled: 1, maintenance_alerts_enabled: 1 }));
  spy.getProfile.and.returnValue(of({ name: 'Student', email: 'stu@dms.com' }));
  spy.getContracts.and.returnValue(of(null));
  spy.getMyFiles.and.returnValue(noop);
  spy.getOverduePayments.and.returnValue(of({ overdueMonths: [], totalOverdue: 0, monthlyRent: 0 }));
  spy.getMyTerminationRequest.and.returnValue(of(null));
  spy.downloadAdminReport.and.returnValue('http://localhost:3000/uploads/reports/r.pdf');
  spy.generateAdminReport.and.returnValue(of({ fileName: 'r.pdf' }));
  spy.clearRoomMaintenance.and.returnValue(of({}));
  spy.verifyPayment.and.returnValue(of({}));
  spy.rejectPayment.and.returnValue(of({}));
  spy.downloadReceipt.and.returnValue(of(new Blob()));
  spy.getActiveContractStudents.and.returnValue(noop);
  spy.adminTerminateContract.and.returnValue(of({}));
  spy.acceptTerminationRequest.and.returnValue(of({}));
  spy.rejectTerminationRequest.and.returnValue(of({}));
  spy.updateApplicationStatus.and.returnValue(of({}));
  spy.updateComplaintStatus.and.returnValue(of({}));
  spy.updateAdminProfile.and.returnValue(of({}));
  spy.updateDormitorySettings.and.returnValue(of({}));
  spy.generateReport.and.returnValue(of({ reportId: 1, progressId: 1 }));
  spy.getReportProgress.and.returnValue(of({ percentage: 0, status: 'PENDING' }));
  spy.cancelReport.and.returnValue(of({}));
  spy.downloadReport.and.returnValue(of(new Blob()));
  spy.downloadContract.and.returnValue(of(new Blob()));
  spy.uploadSignedContract.and.returnValue(of({}));
  spy.recordPayment.and.returnValue(of({}));
  spy.submitComplaint.and.returnValue(of({}));
  spy.uploadApplicationFiles.and.returnValue(of({ count: 0 }));
  spy.submitApplication.and.returnValue(of({ message: 'ok', applicationId: 1 }));
  spy.updateProfile.and.returnValue(of({}));
  spy.downloadFile.and.returnValue(of(new Blob()));
  spy.submitTerminationRequest.and.returnValue(of({}));
  return spy;
};

// ── Guard-level E2E tests (no real router navigation, pure guard logic) ───────
describe('E2E: Auth Guard flows', () => {
  let authSpy: jasmine.SpyObj<AuthService>;

  const runAuth = () =>
    TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

  beforeEach(() => {
    authSpy = jasmine.createSpyObj('AuthService', ['isLoggedIn']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideLocationMocks(),
        { provide: AuthService, useValue: authSpy },
      ],
    });
  });

  it('allows access when user is logged in', () => {
    authSpy.isLoggedIn.and.returnValue(true);
    expect(runAuth()).toBeTrue();
  });

  it('blocks access and redirects to /login when not logged in', () => {
    authSpy.isLoggedIn.and.returnValue(false);
    const result = runAuth() as any;
    expect(result.toString()).toContain('login');
  });
});

describe('E2E: Role Guard flows', () => {
  let authSpy: jasmine.SpyObj<AuthService>;

  const runRole = (role: string, required: 'ADMIN' | 'STUDENT') => {
    const snapshot = { data: { role: required } } as any;
    return TestBed.runInInjectionContext(() => roleGuard(snapshot, {} as any));
  };

  beforeEach(() => {
    authSpy = jasmine.createSpyObj('AuthService', ['getRole', 'isAdmin']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideLocationMocks(),
        { provide: AuthService, useValue: authSpy },
      ],
    });
  });

  it('allows ADMIN to access ADMIN route', () => {
    authSpy.getRole.and.returnValue('ADMIN');
    expect(runRole('ADMIN', 'ADMIN')).toBeTrue();
  });

  it('allows STUDENT to access STUDENT route', () => {
    authSpy.getRole.and.returnValue('STUDENT');
    expect(runRole('STUDENT', 'STUDENT')).toBeTrue();
  });

  it('redirects ADMIN to /dashboard when STUDENT route required', () => {
    authSpy.getRole.and.returnValue('ADMIN');
    authSpy.isAdmin.and.returnValue(true);
    const result = runRole('ADMIN', 'STUDENT') as any;
    expect(result.toString()).toContain('dashboard');
  });

  it('redirects STUDENT to /student-dashboard when ADMIN route required', () => {
    authSpy.getRole.and.returnValue('STUDENT');
    authSpy.isAdmin.and.returnValue(false);
    const result = runRole('STUDENT', 'ADMIN') as any;
    expect(result.toString()).toContain('student-dashboard');
  });
});

// ── Login component E2E-style flows ───────────────────────────────────────────
describe('E2E: Login flows', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['login']);
    authSpy.login.and.returnValue(of({ token: 'tok', role: 'ADMIN', userId: 1, name: 'A', email: 'a@dms.com' }));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authSpy },
        provideRouter([]),
        provideLocationMocks(),
      ],
    }).compileComponents();
    fixture   = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router    = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('E2E: empty form submit shows validation error', () => {
    component.email = '';
    component.password = '';
    component.onSubmit();
    expect(component.errorMsg).toBe('Please fill in all fields.');
  });

  it('E2E: valid admin credentials navigate to /dashboard', fakeAsync(() => {
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.email    = 'admin@dms.com';
    component.password = 'adminpass';
    component.onSubmit();
    tick();
    expect(navSpy).toHaveBeenCalledWith(['/dashboard']);
  }));

  it('E2E: STUDENT credentials navigate to /student-dashboard', fakeAsync(() => {
    authSpy.login.and.returnValue(of({ token: 't', role: 'STUDENT', userId: 2, name: 'S', email: 's@dms.com' }));
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.email    = 'student@dms.com';
    component.password = 'pass';
    component.onSubmit();
    tick();
    expect(navSpy).toHaveBeenCalledWith(['/student-dashboard']);
  }));

  it('E2E: backend error with demo admin creds uses fallback → /dashboard', fakeAsync(() => {
    authSpy.login.and.returnValue(throwError(() => new Error('offline')));
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.email    = 'admin@dms.com';
    component.password = 'admin123';
    component.onSubmit();
    tick();
    expect(navSpy).toHaveBeenCalledWith(['/dashboard']);
  }));

  it('E2E: backend error with demo student creds uses fallback → /student-dashboard', fakeAsync(() => {
    authSpy.login.and.returnValue(throwError(() => new Error('offline')));
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.email    = 'student@dms.com';
    component.password = 'student123';
    component.onSubmit();
    tick();
    expect(navSpy).toHaveBeenCalledWith(['/student-dashboard']);
  }));

  it('E2E: wrong credentials show error without navigating', fakeAsync(() => {
    authSpy.login.and.returnValue(throwError(() => new Error('offline')));
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.email    = 'wrong@dms.com';
    component.password = 'wrongpass';
    component.onSubmit();
    tick();
    expect(navSpy).not.toHaveBeenCalled();
    expect(component.errorMsg).toBe('Invalid email or password.');
  }));

  it('E2E: goHome() navigates to /', () => {
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.goHome();
    expect(navSpy).toHaveBeenCalledWith(['/']);
  });
});

// ── Home component E2E-style flows ────────────────────────────────────────────
describe('E2E: Home page flows', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([]), provideLocationMocks()],
    }).compileComponents();
    fixture   = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    router    = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('E2E: home page renders 6 feature cards', () => {
    expect(component.features.length).toBe(6);
  });

  it('E2E: "Get Started" / login button navigates to /login', () => {
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.goToLogin();
    expect(navSpy).toHaveBeenCalledWith(['/login']);
  });

  it('E2E: register link navigates to /register', () => {
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.goToRegister();
    expect(navSpy).toHaveBeenCalledWith(['/register']);
  });
});

// ── Admin dashboard E2E-style flows ───────────────────────────────────────────
describe('E2E: Admin Dashboard flows', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let notifSpy: jasmine.SpyObj<NotificationService>;
  let router: Router;

  const notifications$ = new BehaviorSubject<any[]>([]);
  const toast$ = new Subject<any>();

  beforeEach(async () => {
    apiSpy   = makeApiSpy();
    authSpy  = jasmine.createSpyObj('AuthService', ['getName', 'getToken', 'logout', 'getRole', 'isAdmin', 'isStudent', 'getUserId', 'getEmail']);
    authSpy.getName.and.returnValue('Admin');
    authSpy.getToken.and.returnValue('tok');
    notifSpy = jasmine.createSpyObj('NotificationService', ['connect', 'disconnect', 'load', 'markRead', 'markAllRead'], {
      notifications$, toast$, unreadCount: 0,
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

  it('E2E: admin dashboard initialises and loads stats', () => {
    expect(apiSpy.getStats).toHaveBeenCalled();
    expect(component.stats[0].value).toBe(64);
  });

  it('E2E: clicking "rooms" section reloads rooms data', () => {
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.setActive('rooms');
    expect(apiSpy.getRooms).toHaveBeenCalledTimes(2);
  });

  it('E2E: logout ends session and redirects to login', () => {
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.logout();
    expect(authSpy.logout).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/login']);
  });

  it('E2E: report generation modal opens on button click', () => {
    const mockLink = { href: '', download: '', click: jasmine.createSpy('click') } as any;
    const orig = document.createElement.bind(document);
    spyOn(document, 'createElement').and.callFake((t: string) => t === 'a' ? mockLink : orig(t));
    component.generateAdminReport();
    expect(component.adminReportModal.open).toBeTrue();
  });

  it('E2E: maintenance dialog opens and confirms clear', () => {
    const room = { room_id: 5, room_number: '205', floor: 2, type: 'Single', status: 'maintenance' as const };
    component.openMaintenanceDialog(room);
    expect(component.maintenanceDialog.open).toBeTrue();
    component.confirmClearMaintenance();
    expect(apiSpy.clearRoomMaintenance).toHaveBeenCalledWith(5);
  });

  it('E2E: accept dialog validates all fields before opening', () => {
    component.selectedRoomId = 0;
    component.openAcceptDialog(1);
    expect(component.acceptDialog.open).toBeFalse();
    expect(component.appMsg).toBeTruthy();
  });
});

// ── Student dashboard E2E-style flows ─────────────────────────────────────────
describe('E2E: Student Dashboard flows', () => {
  let fixture: ComponentFixture<StudentDashboardComponent>;
  let component: StudentDashboardComponent;
  let apiSpy: jasmine.SpyObj<ApiService>;
  let notifSpy: jasmine.SpyObj<NotificationService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  const notifications$ = new BehaviorSubject<any[]>([]);
  const toast$ = new Subject<any>();

  beforeEach(async () => {
    apiSpy   = makeApiSpy();
    authSpy  = jasmine.createSpyObj('AuthService', ['getName', 'getEmail', 'getToken', 'logout']);
    authSpy.getName.and.returnValue('Student');
    authSpy.getEmail.and.returnValue('stu@dms.com');
    authSpy.getToken.and.returnValue('tok');
    notifSpy = jasmine.createSpyObj('NotificationService', ['connect', 'disconnect', 'load', 'markRead', 'markAllRead'], {
      notifications$, toast$, unreadCount: 0,
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

  it('E2E: student dashboard loads and displays student name', () => {
    expect(component.student.name).toBe('Student');
    expect(component.student.initials).toBe('S');
  });

  it('E2E: payment form validates before submitting', () => {
    component.paymentMonth  = '';
    component.paymentAmount = null;
    component.recordPayment();
    expect(component.paymentMsg).toContain('all payment fields');
  });

  it('E2E: complaint form validates empty description', () => {
    component.newComplaint = '';
    component.openComplaintDialog();
    expect(component.complaintErr).toBeTrue();
  });

  it('E2E: application form requires a date', () => {
    component.newAppDate = '';
    component.submitApplication();
    expect(component.appErr).toBeTrue();
  });

  it('E2E: report modal opens when generate is clicked', fakeAsync(() => {
    component.generateReport();
    expect(component.reportModal.open).toBeTrue();
    component.closeReportModal();
    tick(1000);
  }));

  it('E2E: logout redirects to /login', () => {
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.logout();
    expect(authSpy.logout).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/login']);
  });

  it('E2E: termination form validates missing reason', () => {
    component.openTerminationDialog();
    component.terminationDialog.reason = '';
    component.proceedToTerminationConfirm();
    expect(component.terminationDialog.errorMsg).toContain('reason');
  });

  it('E2E: contract download calls API', () => {
    const mockLink = { href: '', download: '', click: jasmine.createSpy('click') } as any;
    const orig = document.createElement.bind(document);
    spyOn(document, 'createElement').and.callFake((t: string) => t === 'a' ? mockLink : orig(t));
    component.downloadContract();
    expect(apiSpy.downloadContract).toHaveBeenCalled();
  });
});
