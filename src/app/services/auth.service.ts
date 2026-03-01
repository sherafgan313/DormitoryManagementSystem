import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly BASE = 'http://localhost:3000/api';
  private readonly KEY = 'dms_token';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<{ token: string; user: any }> {
    return this.http
      .post<{ token: string; user: any }>(`${this.BASE}/login`, { email, password })
      .pipe(tap(res => localStorage.setItem(this.KEY, res.token)));
  }

  logout(): void {
    localStorage.removeItem(this.KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(this.KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
