import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, ActivatedRouteSnapshot } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';

describe('roleGuard', () => {
  let authSpy: jasmine.SpyObj<AuthService>;

  const runGuard = (requiredRole: 'ADMIN' | 'STUDENT') => {
    const snapshot = { data: { role: requiredRole } } as unknown as ActivatedRouteSnapshot;
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

  it('returns true when user role matches required role (ADMIN)', () => {
    authSpy.getRole.and.returnValue('ADMIN');
    expect(runGuard('ADMIN')).toBeTrue();
  });

  it('returns true when user role matches required role (STUDENT)', () => {
    authSpy.getRole.and.returnValue('STUDENT');
    expect(runGuard('STUDENT')).toBeTrue();
  });

  it('redirects admin to /dashboard when required role is STUDENT', () => {
    authSpy.getRole.and.returnValue('ADMIN');
    authSpy.isAdmin.and.returnValue(true);
    const result = runGuard('STUDENT');
    expect(result).toBeInstanceOf(UrlTree);
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
  });

  it('redirects student to /student-dashboard when required role is ADMIN', () => {
    authSpy.getRole.and.returnValue('STUDENT');
    authSpy.isAdmin.and.returnValue(false);
    const result = runGuard('ADMIN');
    expect(result).toBeInstanceOf(UrlTree);
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(result as UrlTree)).toBe('/student-dashboard');
  });
});
