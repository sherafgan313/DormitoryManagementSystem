import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface StatCard {
  label: string;
  value: string | number;
  change: string;
  positive: boolean;
  icon: string;
  color: string;
}

interface RecentActivity {
  type: string;
  message: string;
  time: string;
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent {
  sidebarOpen = true;
  activeNav = 'dashboard';

  stats: StatCard[] = [
    { label: 'Total Rooms',     value: 128,  change: '+4 this month', positive: true,  icon: '🏠', color: 'blue'   },
    { label: 'Occupied',        value: 104,  change: '81% occupancy', positive: true,  icon: '✅', color: 'green'  },
    { label: 'Vacant',          value: 24,   change: '-4 this month', positive: false, icon: '🔓', color: 'orange' },
    { label: 'Pending Payments',value: 13,   change: '₱ 45,200 due',  positive: false, icon: '💳', color: 'red'    },
    { label: 'Open Requests',   value: 7,    change: '2 urgent',      positive: false, icon: '🔧', color: 'yellow' },
    { label: 'New Residents',   value: 18,   change: 'This month',    positive: true,  icon: '👥', color: 'purple' },
  ];

  recentActivity: RecentActivity[] = [
    { type: 'check-in',  message: 'Juan dela Cruz checked into Room 204',         time: '5 min ago',  icon: '🏠' },
    { type: 'payment',   message: 'Maria Santos paid ₱ 5,000 for March',          time: '22 min ago', icon: '💳' },
    { type: 'request',   message: 'Room 108 reported a leaking faucet',           time: '1 hr ago',   icon: '🔧' },
    { type: 'checkout',  message: 'Pedro Reyes checked out of Room 312',          time: '3 hrs ago',  icon: '📤' },
    { type: 'notice',    message: 'Curfew reminder sent to all residents',        time: '5 hrs ago',  icon: '🔔' },
    { type: 'payment',   message: 'Liza Gomez payment overdue — Room 215',        time: 'Yesterday',  icon: '⚠️' },
  ];

  navItems = [
    { id: 'dashboard', label: 'Dashboard',    icon: '📊' },
    { id: 'rooms',     label: 'Rooms',        icon: '🏠' },
    { id: 'residents', label: 'Residents',    icon: '👥' },
    { id: 'payments',  label: 'Payments',     icon: '💳' },
    { id: 'requests',  label: 'Maintenance',  icon: '🔧' },
    { id: 'reports',   label: 'Reports',      icon: '📈' },
    { id: 'settings',  label: 'Settings',     icon: '⚙️' },
  ];

  constructor(private router: Router) {}

  setActive(id: string) {
    this.activeNav = id;
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  logout() {
    this.router.navigate(['/login']);
  }
}
