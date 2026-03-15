import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { StudentDashboardComponent } from './pages/student-dashboard/student-dashboard';
import { DashboardSectionComponent } from './components/dashboard-section/dashboard-section';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '',       component: HomeComponent  },
  { path: 'login',  component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' },
    children: [
      { path: '',          redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardSectionComponent },
      { path: 'rooms',     component: DashboardSectionComponent },
      { path: 'residents', component: DashboardSectionComponent },
      { path: 'payments',  component: DashboardSectionComponent },
      { path: 'requests',  component: DashboardSectionComponent },
      { path: 'reports',   component: DashboardSectionComponent },
      { path: 'settings',  component: DashboardSectionComponent },
    ],
  },

  {
    path: 'student-dashboard',
    component: StudentDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'STUDENT' },
    children: [
      { path: '',           redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview',   component: DashboardSectionComponent },
      { path: 'profile',    component: DashboardSectionComponent },
      { path: 'documents',  component: DashboardSectionComponent },
      { path: 'contract',   component: DashboardSectionComponent },
      { path: 'payments',   component: DashboardSectionComponent },
      { path: 'complaints', component: DashboardSectionComponent },
      { path: 'apply',      component: DashboardSectionComponent },
    ],
  },

  { path: '**', redirectTo: '' },
];
