import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authSpy: jasmine.SpyObj<AuthService>;

  const setupWith = (token: string | null) => {
    authSpy = jasmine.createSpyObj('AuthService', ['getToken']);
    authSpy.getToken.and.returnValue(token);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authSpy },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  };

  afterEach(() => httpMock.verify());

  it('attaches Authorization header when token exists and URL is not login/register', () => {
    setupWith('my-token');
    http.get('/api/stats').subscribe();
    const req = httpMock.expectOne('/api/stats');
    expect(req.request.headers.get('Authorization')).toBe('my-token');
    req.flush({});
  });

  it('does NOT attach Authorization header for /login URL', () => {
    setupWith('my-token');
    http.post('/api/login', {}).subscribe();
    const req = httpMock.expectOne('/api/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('does NOT attach Authorization header for /register URL', () => {
    setupWith('my-token');
    http.post('/api/register', {}).subscribe();
    const req = httpMock.expectOne('/api/register');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('does NOT attach Authorization header when token is null', () => {
    setupWith(null);
    http.get('/api/rooms').subscribe();
    const req = httpMock.expectOne('/api/rooms');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });
});
