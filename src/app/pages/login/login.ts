import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMsg = '';

  constructor(private router: Router, private auth: AuthService, private cdr: ChangeDetectorRef) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    this.errorMsg = '';
    if (!this.email || !this.password) {
      this.errorMsg = 'Please fill in all fields.';
      return;
    }
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: (res: any) => {
        this.loading = false;
        const role = res?.role ?? res?.user?.role;
        this.router.navigate([role === 'STUDENT' ? '/student-dashboard' : '/dashboard']);
      },
      error: () => {
        this.loading = false;
        // Demo fallback when backend is offline
        if (this.email === 'admin@dms.com' && this.password === 'admin123') {
          this.router.navigate(['/dashboard']);
        } else if (this.email === 'student@dms.com' && this.password === 'student123') {
          this.router.navigate(['/student-dashboard']);
        } else {
          this.errorMsg = 'Invalid email or password.';
          this.cdr.detectChanges();
        }
      },
    });
  }

  goHome() {
    this.router.navigate(['/']);
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }
}
