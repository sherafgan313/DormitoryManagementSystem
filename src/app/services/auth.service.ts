import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface LoginResponse {
  token:  string;
  role:   'ADMIN' | 'STUDENT';
  userId: number;
  name:   string;
  email:  string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly BASE = 'http://localhost:3000/api';

  private readonly KEYS = {
    token:  'dms_token',
    role:   'dms_role',
    userId: 'dms_user_id',
    name:   'dms_name',
    email:  'dms_email',
  } as const;

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.BASE}/login`, { email, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(this.KEYS.token,  res.token);
          localStorage.setItem(this.KEYS.role,   res.role);
          localStorage.setItem(this.KEYS.userId, String(res.userId));
          localStorage.setItem(this.KEYS.name,   res.name);
          localStorage.setItem(this.KEYS.email,  res.email);
        })
      );
  }

  logout(): void {
    Object.values(this.KEYS).forEach((k) => localStorage.removeItem(k));
  }

  getToken():  string | null { return localStorage.getItem(this.KEYS.token); }
  getRole():   string | null { return localStorage.getItem(this.KEYS.role);  }
  getName():   string | null { return localStorage.getItem(this.KEYS.name);  }
  getEmail():  string | null { return localStorage.getItem(this.KEYS.email); }
  getUserId(): number | null {
    const v = localStorage.getItem(this.KEYS.userId);
    return v ? Number(v) : null;
  }

  isLoggedIn(): boolean { return !!this.getToken(); }
  isAdmin():    boolean { return this.getRole() === 'ADMIN'; }
  isStudent():  boolean { return this.getRole() === 'STUDENT'; }
}
