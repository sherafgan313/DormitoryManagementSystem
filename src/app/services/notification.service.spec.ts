import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';

// Mock EventSource globally
class MockEventSource {
  static instances: MockEventSource[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  close = jasmine.createSpy('close');

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }

  // Helper to simulate incoming message
  simulateMessage(data: object): void {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent);
    }
  }
}

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  let authSpy: jasmine.SpyObj<AuthService>;

  const BASE = 'http://localhost:3000/api';

  beforeEach(() => {
    MockEventSource.instances = [];
    (window as any).EventSource = MockEventSource;

    authSpy = jasmine.createSpyObj('AuthService', ['getToken']);
    authSpy.getToken.and.returnValue('test-token');

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        NotificationService,
        { provide: AuthService, useValue: authSpy },
      ],
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    service.disconnect();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('unreadCount returns 0 when no notifications', () => {
    expect(service.unreadCount).toBe(0);
  });

  it('unreadCount counts unread notifications', () => {
    service.notifications$.next([
      { notification_id: 1, user_id: 1, type: 'payment', message: 'msg', tab: 'payments', is_read: false, created_at: '' },
      { notification_id: 2, user_id: 1, type: 'payment', message: 'msg', tab: 'payments', is_read: true, created_at: '' },
    ] as any);
    expect(service.unreadCount).toBe(1);
  });

  // ── connect ───────────────────────────────────────────────────────
  it('connect() creates an EventSource with the token URL', () => {
    service.connect();
    expect(MockEventSource.instances.length).toBe(1);
    expect(MockEventSource.instances[0].url).toContain('test-token');
  });

  it('connect() does nothing when no token', () => {
    authSpy.getToken.and.returnValue(null);
    service.connect();
    expect(MockEventSource.instances.length).toBe(0);
  });

  it('connect() does not create a duplicate EventSource when already connected', () => {
    service.connect();
    service.connect();
    expect(MockEventSource.instances.length).toBe(1);
  });

  it('connect() pushes notification and toast on valid SSE message', () => {
    service.connect();
    const es = MockEventSource.instances[0];
    const notif = { notification_id: 5, type: 'payment', message: 'paid', tab: 'payments', is_read: false, created_at: '' };
    let toastReceived: any;
    service.toast$.subscribe(n => (toastReceived = n));
    es.simulateMessage({ type: 'notification', notification: notif });
    const current = service.notifications$.value;
    expect(current[0]).toEqual(notif as any);
    expect(toastReceived).toEqual(notif as any);
  });

  it('connect() silently ignores malformed SSE data', () => {
    service.connect();
    const es = MockEventSource.instances[0];
    expect(() => es.simulateMessage({ type: 'ping' })).not.toThrow();
  });

  // ── disconnect ────────────────────────────────────────────────────
  it('disconnect() closes EventSource and clears notifications', () => {
    service.connect();
    const es = MockEventSource.instances[0];
    service.notifications$.next([{ notification_id: 1 } as any]);
    service.disconnect();
    expect(es.close).toHaveBeenCalled();
    expect(service.notifications$.value).toEqual([]);
  });

  it('disconnect() is a no-op when not connected', () => {
    expect(() => service.disconnect()).not.toThrow();
  });

  // ── load ──────────────────────────────────────────────────────────
  it('load() GETs /api/notifications and sets notifications$', () => {
    const data = [{ notification_id: 1, is_read: false } as any];
    service.load();
    const req = httpMock.expectOne(`${BASE}/notifications`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('test-token');
    req.flush(data);
    expect(service.notifications$.value).toEqual(data);
  });

  it('load() silently ignores HTTP errors', () => {
    service.load();
    httpMock.expectOne(`${BASE}/notifications`).error(new ErrorEvent('error'));
    expect(service.notifications$.value).toEqual([]);
  });

  // ── markRead ──────────────────────────────────────────────────────
  it('markRead() PATCHes /api/notifications/:id/read and marks as read locally', () => {
    service.notifications$.next([
      { notification_id: 3, is_read: false } as any,
      { notification_id: 4, is_read: false } as any,
    ]);
    service.markRead(3).subscribe();
    httpMock.expectOne(`${BASE}/notifications/3/read`).flush({});
    const updated = service.notifications$.value;
    expect(updated.find(n => n.notification_id === 3)?.is_read).toBeTrue();
    expect(updated.find(n => n.notification_id === 4)?.is_read).toBeFalse();
  });

  // ── markAllRead ───────────────────────────────────────────────────
  it('markAllRead() PATCHes /api/notifications/read-all and marks all as read', () => {
    service.notifications$.next([
      { notification_id: 1, is_read: false } as any,
      { notification_id: 2, is_read: false } as any,
    ]);
    service.markAllRead().subscribe();
    httpMock.expectOne(`${BASE}/notifications/read-all`).flush({});
    const all = service.notifications$.value;
    expect(all.every(n => n.is_read)).toBeTrue();
  });

  it('load() uses empty string token when getToken returns null', () => {
    authSpy.getToken.and.returnValue(null);
    service.load();
    const req = httpMock.expectOne(`${BASE}/notifications`);
    expect(req.request.headers.get('Authorization')).toBe('');
    req.flush([]);
  });

  it('markRead() uses empty Authorization when no token', () => {
    authSpy.getToken.and.returnValue(null);
    service.markRead(5).subscribe();
    const req = httpMock.expectOne(`${BASE}/notifications/5/read`);
    expect(req.request.headers.get('Authorization')).toBe('');
    req.flush({});
  });

  it('markAllRead() uses empty Authorization when no token', () => {
    authSpy.getToken.and.returnValue(null);
    service.markAllRead().subscribe();
    const req = httpMock.expectOne(`${BASE}/notifications/read-all`);
    expect(req.request.headers.get('Authorization')).toBe('');
    req.flush({});
  });
});
