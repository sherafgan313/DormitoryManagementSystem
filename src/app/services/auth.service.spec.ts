import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService, LoginResponse } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── login ─────────────────────────────────────────────────────────
  it('login() should POST to /api/login and store all localStorage keys', () => {
    const mockRes: LoginResponse = {
      token: 'tok-123', role: 'ADMIN', userId: 1, name: 'Admin', email: 'admin@dms.com',
    };
    service.login('admin@dms.com', 'pass').subscribe(res => expect(res).toEqual(mockRes));

    const req = httpMock.expectOne('http://localhost:3000/api/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'admin@dms.com', password: 'pass' });
    req.flush(mockRes);

    expect(localStorage.getItem('dms_token')).toBe('tok-123');
    expect(localStorage.getItem('dms_role')).toBe('ADMIN');
    expect(localStorage.getItem('dms_user_id')).toBe('1');
    expect(localStorage.getItem('dms_name')).toBe('Admin');
    expect(localStorage.getItem('dms_email')).toBe('admin@dms.com');
  });

  it('login() stores STUDENT role correctly', () => {
    const mockRes: LoginResponse = {
      token: 'student-tok', role: 'STUDENT', userId: 99, name: 'John', email: 'john@dms.com',
    };
    service.login('john@dms.com', 'pass').subscribe();
    httpMock.expectOne('http://localhost:3000/api/login').flush(mockRes);
    expect(localStorage.getItem('dms_role')).toBe('STUDENT');
  });

  // ── logout ────────────────────────────────────────────────────────
  it('logout() removes all localStorage keys', () => {
    localStorage.setItem('dms_token', 'tok');
    localStorage.setItem('dms_role', 'ADMIN');
    localStorage.setItem('dms_user_id', '1');
    localStorage.setItem('dms_name', 'Admin');
    localStorage.setItem('dms_email', 'admin@dms.com');
    service.logout();
    expect(localStorage.getItem('dms_token')).toBeNull();
    expect(localStorage.getItem('dms_role')).toBeNull();
    expect(localStorage.getItem('dms_user_id')).toBeNull();
    expect(localStorage.getItem('dms_name')).toBeNull();
    expect(localStorage.getItem('dms_email')).toBeNull();
  });

  // ── getters ───────────────────────────────────────────────────────
  it('getToken() returns stored token', () => {
    localStorage.setItem('dms_token', 'my-token');
    expect(service.getToken()).toBe('my-token');
  });

  it('getToken() returns null when not set', () => {
    expect(service.getToken()).toBeNull();
  });

  it('getRole() returns stored role', () => {
    localStorage.setItem('dms_role', 'ADMIN');
    expect(service.getRole()).toBe('ADMIN');
  });

  it('getRole() returns null when not set', () => {
    expect(service.getRole()).toBeNull();
  });

  it('getName() returns stored name', () => {
    localStorage.setItem('dms_name', 'John Doe');
    expect(service.getName()).toBe('John Doe');
  });

  it('getEmail() returns stored email', () => {
    localStorage.setItem('dms_email', 'john@dms.com');
    expect(service.getEmail()).toBe('john@dms.com');
  });

  it('getUserId() returns user id as number', () => {
    localStorage.setItem('dms_user_id', '42');
    expect(service.getUserId()).toBe(42);
  });

  it('getUserId() returns null when not set', () => {
    expect(service.getUserId()).toBeNull();
  });

  // ── boolean helpers ───────────────────────────────────────────────
  it('isLoggedIn() returns true when token exists', () => {
    localStorage.setItem('dms_token', 'tok');
    expect(service.isLoggedIn()).toBeTrue();
  });

  it('isLoggedIn() returns false when no token', () => {
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('isAdmin() returns true when role is ADMIN', () => {
    localStorage.setItem('dms_role', 'ADMIN');
    expect(service.isAdmin()).toBeTrue();
  });

  it('isAdmin() returns false when role is STUDENT', () => {
    localStorage.setItem('dms_role', 'STUDENT');
    expect(service.isAdmin()).toBeFalse();
  });

  it('isAdmin() returns false when no role', () => {
    expect(service.isAdmin()).toBeFalse();
  });

  it('isStudent() returns true when role is STUDENT', () => {
    localStorage.setItem('dms_role', 'STUDENT');
    expect(service.isStudent()).toBeTrue();
  });

  it('isStudent() returns false when role is ADMIN', () => {
    localStorage.setItem('dms_role', 'ADMIN');
    expect(service.isStudent()).toBeFalse();
  });

  // ── register ──────────────────────────────────────────────────────
  it('register() POSTs to /api/register with provided data', () => {
    const data = { name: 'Jane', email: 'jane@dms.com', password: 'pass123' };
    service.register(data).subscribe(res => expect(res.message).toBe('Registered'));
    const req = httpMock.expectOne('http://localhost:3000/api/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(data);
    req.flush({ message: 'Registered' });
  });

  it('register() sends optional profile fields when provided', () => {
    const data = {
      name: 'Jane', email: 'jane@dms.com', password: 'pass',
      phone: '09171234567', student_id_number: 'STU001', course: 'CS', university: 'UPD',
    };
    service.register(data).subscribe();
    const req = httpMock.expectOne('http://localhost:3000/api/register');
    expect(req.request.body).toEqual(data);
    req.flush({ message: 'ok' });
  });
});
