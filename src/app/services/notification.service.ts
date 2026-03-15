import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, tap } from 'rxjs';
import { AuthService } from './auth.service';

export interface AppNotification {
  notification_id: number;
  user_id: number;
  type: 'application' | 'contract' | 'payment' | 'complaint';
  message: string;
  tab: string;
  is_read: boolean | number;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly BASE = 'http://localhost:3000/api';
  private es: EventSource | null = null;

  notifications$ = new BehaviorSubject<AppNotification[]>([]);
  toast$ = new Subject<AppNotification>();

  get unreadCount(): number {
    return this.notifications$.value.filter(n => !n.is_read).length;
  }

  constructor(private http: HttpClient, private auth: AuthService) {}

  connect(): void {
    const token = this.auth.getToken();
    if (!token || this.es) return;
    this.es = new EventSource(
      `${this.BASE}/notifications/stream?token=${encodeURIComponent(token)}`
    );
    this.es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
          this.notifications$.next([data.notification, ...this.notifications$.value]);
          this.toast$.next(data.notification);
        }
      } catch {}
    };
    // EventSource auto-reconnects on error — no manual handling needed
  }

  disconnect(): void {
    this.es?.close();
    this.es = null;
    this.notifications$.next([]);
  }

  load(): void {
    const token = this.auth.getToken() ?? '';
    this.http
      .get<AppNotification[]>(`${this.BASE}/notifications`, {
        headers: { Authorization: token },
      })
      .subscribe({ next: n => this.notifications$.next(n), error: () => {} });
  }

  markRead(id: number): Observable<any> {
    const token = this.auth.getToken() ?? '';
    return this.http
      .patch(`${this.BASE}/notifications/${id}/read`, {}, { headers: { Authorization: token } })
      .pipe(
        tap(() => {
          this.notifications$.next(
            this.notifications$.value.map(n =>
              n.notification_id === id ? { ...n, is_read: true } : n
            )
          );
        })
      );
  }

  markAllRead(): Observable<any> {
    const token = this.auth.getToken() ?? '';
    return this.http
      .patch(`${this.BASE}/notifications/read-all`, {}, { headers: { Authorization: token } })
      .pipe(
        tap(() => {
          this.notifications$.next(
            this.notifications$.value.map(n => ({ ...n, is_read: true }))
          );
        })
      );
  }
}
