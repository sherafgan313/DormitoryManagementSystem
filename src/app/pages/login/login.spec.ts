import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login';
import { AuthService } from '../../services/auth.service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['login']);

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

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('shows error when form is submitted with no email', () => {
    component.email    = '';
    component.password = '';
    component.onSubmit();
    expect(component.errorMsg).toBe('Please fill in all fields.');
  });

  it('shows error when form is submitted with no password', () => {
    component.email    = 'user@dms.com';
    component.password = '';
    component.onSubmit();
    expect(component.errorMsg).toBe('Please fill in all fields.');
  });

  it('clears errorMsg at the start of a submit attempt', () => {
    component.errorMsg = 'old error';
    component.email    = '';
    component.password = '';
    component.onSubmit();
    // It gets replaced with the "fill in all fields" error, not kept as old error
    expect(component.errorMsg).toBe('Please fill in all fields.');
  });

  it('navigates to /dashboard for ADMIN login success', fakeAsync(() => {
    authSpy.login.and.returnValue(of({ role: 'ADMIN', token: 'tok', userId: 1, name: 'Admin', email: 'a@dms.com' }));
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.email    = 'admin@dms.com';
    component.password = 'pass';
    component.onSubmit();
    tick();
    expect(navSpy).toHaveBeenCalledWith(['/dashboard']);
  }));

  it('navigates to /student-dashboard for STUDENT login success', fakeAsync(() => {
    authSpy.login.and.returnValue(of({ role: 'STUDENT', token: 'tok', userId: 2, name: 'Stu', email: 's@dms.com' }));
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.email    = 'student@dms.com';
    component.password = 'pass';
    component.onSubmit();
    tick();
    expect(navSpy).toHaveBeenCalledWith(['/student-dashboard']);
  }));

  it('uses demo fallback for admin@dms.com / admin123 on backend error', fakeAsync(() => {
    authSpy.login.and.returnValue(throwError(() => new Error('offline')));
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.email    = 'admin@dms.com';
    component.password = 'admin123';
    component.onSubmit();
    tick();
    expect(navSpy).toHaveBeenCalledWith(['/dashboard']);
    expect(component.errorMsg).toBe('');
  }));

  it('uses demo fallback for student@dms.com / student123 on backend error', fakeAsync(() => {
    authSpy.login.and.returnValue(throwError(() => new Error('offline')));
    const navSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.email    = 'student@dms.com';
    component.password = 'student123';
    component.onSubmit();
    tick();
    expect(navSpy).toHaveBeenCalledWith(['/student-dashboard']);
  }));

  it('sets errorMsg for invalid credentials on backend error', fakeAsync(() => {
    authSpy.login.and.returnValue(throwError(() => new Error('offline')));
    component.email    = 'bad@dms.com';
    component.password = 'wrongpass';
    component.onSubmit();
    tick();
    expect(component.errorMsg).toBe('Invalid email or password.');
  }));

  it('sets loading=false after successful login', fakeAsync(() => {
    authSpy.login.and.returnValue(of({ role: 'ADMIN', token: 't', userId: 1, name: 'A', email: 'a@dms.com' }));
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.email    = 'admin@dms.com';
    component.password = 'pass';
    component.onSubmit();
    tick();
    expect(component.loading).toBeFalse();
  }));

  it('sets loading=false after error', fakeAsync(() => {
    authSpy.login.and.returnValue(throwError(() => new Error('fail')));
    component.email    = 'bad@dms.com';
    component.password = 'bad';
    component.onSubmit();
    tick();
    expect(component.loading).toBeFalse();
  }));

  it('togglePassword() flips showPassword', () => {
    expect(component.showPassword).toBeFalse();
    component.togglePassword();
    expect(component.showPassword).toBeTrue();
    component.togglePassword();
    expect(component.showPassword).toBeFalse();
  });

  it('goHome() navigates to /', async () => {
    const spy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.goHome();
    expect(spy).toHaveBeenCalledWith(['/']);
  });

  it('goToRegister() navigates to /register', async () => {
    const spy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    component.goToRegister();
    expect(spy).toHaveBeenCalledWith(['/register']);
  });
});
