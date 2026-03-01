import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

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

  constructor(private router: Router) {}

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
    // Simulate auth — replace with real API call
    setTimeout(() => {
      this.loading = false;
      if (this.email === 'admin@dms.com' && this.password === 'admin123') {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMsg = 'Invalid email or password.';
      }
    }, 1000);
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
