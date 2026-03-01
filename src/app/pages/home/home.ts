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
      icon: '🏠',
      title: 'Room Management',
      desc: 'Assign, transfer, and track dormitory rooms with real-time availability.',
    },
    {
      icon: '👥',
      title: 'Resident Profiles',
      desc: 'Maintain complete resident records including contracts and emergency contacts.',
    },
    {
      icon: '💳',
      title: 'Billing & Payments',
      desc: 'Automate invoices, track payments, and manage outstanding balances effortlessly.',
    },
    {
      icon: '🔧',
      title: 'Maintenance Requests',
      desc: 'Log, assign, and resolve maintenance tickets to keep facilities running.',
    },
    {
      icon: '📊',
      title: 'Reports & Analytics',
      desc: 'Generate occupancy, financial, and operational reports at a glance.',
    },
    {
      icon: '🔔',
      title: 'Announcements',
      desc: 'Broadcast important notices to residents and staff instantly.',
    },
  ];

  constructor(private router: Router) {}

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
