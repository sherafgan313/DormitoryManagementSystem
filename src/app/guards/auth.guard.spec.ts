import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authSpy: jasmine.SpyObj<AuthService>;

  const runGuard = () =>
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

  it('returns true when user is logged in', () => {
    authSpy.isLoggedIn.and.returnValue(true);
    expect(runGuard()).toBeTrue();
  });

  it('returns a UrlTree redirecting to /login when not logged in', () => {
    authSpy.isLoggedIn.and.returnValue(false);
    const result = runGuard();
    expect(result).toBeInstanceOf(UrlTree);
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });
});
