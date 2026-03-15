import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, CommonModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  phone = '';
  studentIdNumber = '';
  course = '';
  university = '';

  showPassword = false;
  showConfirmPassword = false;
  loading = false;
  errorMsg = '';
  successMsg = '';

  constructor(private router: Router, private auth: AuthService) {}

  togglePassword() { this.showPassword = !this.showPassword; }
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }

  onSubmit() {
    this.errorMsg = '';
    this.successMsg = '';

    if (!this.name || !this.email || !this.password || !this.confirmPassword) {
      this.errorMsg = 'Please fill in all required fields.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMsg = 'Passwords do not match.';
      return;
    }
    if (this.password.length < 6) {
      this.errorMsg = 'Password must be at least 6 characters.';
      return;
    }

    this.loading = true;
    this.auth.register({
      name: this.name,
      email: this.email,
      password: this.password,
      phone: this.phone || undefined,
      student_id_number: this.studentIdNumber || undefined,
      course: this.course || undefined,
      university: this.university || undefined,
    }).subscribe({
      next: () => {
        this.loading = false;
        this.successMsg = 'Account created! Redirecting to login…';
        setTimeout(() => this.router.navigate(['/login']), 1800);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err?.error?.message ?? 'Registration failed. Please try again.';
      },
    });
  }

  goHome() { this.router.navigate(['/']); }
  goToLogin() { this.router.navigate(['/login']); }
}
