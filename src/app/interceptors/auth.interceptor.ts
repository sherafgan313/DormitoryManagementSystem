import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth  = inject(AuthService);
  const token = auth.getToken();
  if (token && !req.url.includes('/login') && !req.url.includes('/register')) {
    const authReq = req.clone({ setHeaders: { Authorization: token } });
    return next(authReq);
  }
  return next(req);
};
