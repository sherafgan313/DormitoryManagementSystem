import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth     = inject(AuthService);
  const router   = inject(Router);
  const required = route.data['role'] as 'ADMIN' | 'STUDENT';

  if (auth.getRole() === required) return true;

  // Redirect to the correct dashboard for their actual role
  const dest = auth.isAdmin() ? '/dashboard' : '/student-dashboard';
  return router.createUrlTree([dest]);
};
