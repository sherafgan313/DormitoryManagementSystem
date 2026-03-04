import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent {
  features = [
    {
      icon: 'home.svg',
      title: 'Room Management',
      desc: 'Assign, transfer, and track dormitory rooms with real-time availability.',
    },
    {
      icon: 'users.svg',
      title: 'Resident Profiles',
      desc: 'Maintain complete resident records including contracts and emergency contacts.',
    },
    {
      icon: 'credit-card.svg',
      title: 'Billing & Payments',
      desc: 'Automate invoices, track payments, and manage outstanding balances effortlessly.',
    },
    {
      icon: 'wrench.svg',
      title: 'Maintenance Requests',
      desc: 'Log, assign, and resolve maintenance tickets to keep facilities running.',
    },
    {
      icon: 'chart-bar.svg',
      title: 'Reports & Analytics',
      desc: 'Generate occupancy, financial, and operational reports at a glance.',
    },
    {
      icon: 'bell.svg',
      title: 'Announcements',
      desc: 'Broadcast important notices to residents and staff instantly.',
    },
  ];

  constructor(private router: Router) {}

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
