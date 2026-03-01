import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

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

interface Application {
  application_id: number;
  user_id: number;
  submission_date: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
  user_name?: string;
  user_email?: string;
}

interface Complaint {
  complaint_id: number;
  user_id: number;
  description: string;
  status: 'SUBMITTED' | 'IN_PROGRESS' | 'RESOLVED';
  created_at: string;
  user_name?: string;
  user_email?: string;
}

interface Room {
  number: string;
  floor: number;
  status: 'occupied' | 'vacant' | 'maintenance';
  resident?: string;
  type: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  sidebarOpen = true;
  activeNav = 'dashboard';

  stats: StatCard[] = [
    { label: 'Total Rooms',      value: 128, change: '+4 this month', positive: true,  icon: '🏠', color: 'blue'   },
    { label: 'Occupied',         value: 104, change: '81% occupancy', positive: true,  icon: '✅', color: 'green'  },
    { label: 'Vacant',           value: 24,  change: '-4 this month', positive: false, icon: '🔓', color: 'orange' },
    { label: 'Pending Payments', value: 13,  change: '₱45,200 due',  positive: false, icon: '💳', color: 'red'    },
    { label: 'Open Requests',    value: 7,   change: '2 urgent',      positive: false, icon: '🔧', color: 'yellow' },
    { label: 'New Residents',    value: 18,  change: 'This month',    positive: true,  icon: '👥', color: 'purple' },
  ];

  recentActivity: RecentActivity[] = [
    { type: 'check-in',  message: 'Juan dela Cruz checked into Room 204',     time: '5 min ago',  icon: '🏠' },
    { type: 'payment',   message: 'Maria Santos paid ₱5,000 for March',       time: '22 min ago', icon: '💳' },
    { type: 'request',   message: 'Room 108 reported a leaking faucet',       time: '1 hr ago',   icon: '🔧' },
    { type: 'checkout',  message: 'Pedro Reyes checked out of Room 312',      time: '3 hrs ago',  icon: '📤' },
    { type: 'notice',    message: 'Curfew reminder sent to all residents',    time: '5 hrs ago',  icon: '🔔' },
    { type: 'payment',   message: 'Liza Gomez payment overdue — Room 215',    time: 'Yesterday',  icon: '⚠️' },
  ];

  navItems = [
    { id: 'dashboard', label: 'Dashboard',   icon: '📊' },
    { id: 'rooms',     label: 'Rooms',       icon: '🏠' },
    { id: 'residents', label: 'Residents',   icon: '👥' },
    { id: 'payments',  label: 'Payments',    icon: '💳' },
    { id: 'requests',  label: 'Maintenance', icon: '🔧' },
    { id: 'reports',   label: 'Reports',     icon: '📈' },
    { id: 'settings',  label: 'Settings',    icon: '⚙️' },
  ];

  // ── Rooms (static demo data) ─────────────────────────────────────
  rooms: Room[] = [
    { number: '101', floor: 1, status: 'occupied',    resident: 'Juan dela Cruz',  type: 'Single' },
    { number: '102', floor: 1, status: 'occupied',    resident: 'Maria Santos',    type: 'Double' },
    { number: '103', floor: 1, status: 'vacant',                                   type: 'Single' },
    { number: '104', floor: 1, status: 'occupied',    resident: 'Pedro Reyes',     type: 'Double' },
    { number: '105', floor: 1, status: 'occupied',    resident: 'Ana Liza',        type: 'Single' },
    { number: '106', floor: 1, status: 'occupied',    resident: 'Carlos Mendoza',  type: 'Double' },
    { number: '107', floor: 1, status: 'maintenance',                              type: 'Single' },
    { number: '108', floor: 1, status: 'occupied',    resident: 'Rosa Aquino',     type: 'Double' },
    { number: '201', floor: 2, status: 'occupied',    resident: 'Jose Garcia',     type: 'Single' },
    { number: '202', floor: 2, status: 'occupied',    resident: 'Elena Bautista',  type: 'Double' },
    { number: '203', floor: 2, status: 'occupied',    resident: 'Marco Rivera',    type: 'Single' },
    { number: '204', floor: 2, status: 'occupied',    resident: 'Liza Gomez',      type: 'Double' },
    { number: '205', floor: 2, status: 'vacant',                                   type: 'Single' },
    { number: '206', floor: 2, status: 'occupied',    resident: 'Andres Torres',   type: 'Double' },
    { number: '207', floor: 2, status: 'occupied',    resident: 'Celine Cruz',     type: 'Single' },
    { number: '208', floor: 2, status: 'occupied',    resident: 'Rico Santos',     type: 'Double' },
    { number: '301', floor: 3, status: 'occupied',    resident: 'Diana Lee',       type: 'Single' },
    { number: '302', floor: 3, status: 'occupied',    resident: 'Frank Tan',       type: 'Double' },
    { number: '303', floor: 3, status: 'vacant',                                   type: 'Suite'  },
    { number: '304', floor: 3, status: 'occupied',    resident: 'Grace Kim',       type: 'Single' },
    { number: '305', floor: 3, status: 'occupied',    resident: 'Henry Sy',        type: 'Double' },
    { number: '306', floor: 3, status: 'occupied',    resident: 'Iris Chan',       type: 'Suite'  },
    { number: '307', floor: 3, status: 'occupied',    resident: 'James Lim',       type: 'Single' },
    { number: '308', floor: 3, status: 'maintenance',                              type: 'Double' },
    { number: '401', floor: 4, status: 'occupied',    resident: 'Karen Wong',      type: 'Single' },
    { number: '402', floor: 4, status: 'occupied',    resident: 'Luis Tan',        type: 'Double' },
    { number: '403', floor: 4, status: 'vacant',                                   type: 'Single' },
    { number: '404', floor: 4, status: 'occupied',    resident: 'Mia Reyes',       type: 'Suite'  },
    { number: '405', floor: 4, status: 'occupied',    resident: 'Nina Cruz',       type: 'Single' },
    { number: '406', floor: 4, status: 'occupied',    resident: 'Oscar Santos',    type: 'Double' },
    { number: '407', floor: 4, status: 'vacant',                                   type: 'Single' },
    { number: '408', floor: 4, status: 'occupied',    resident: 'Paula Garcia',    type: 'Suite'  },
  ];

  roomFilter: 'all' | 'occupied' | 'vacant' | 'maintenance' = 'all';

  get filteredRooms(): Room[] {
    if (this.roomFilter === 'all') return this.rooms;
    return this.rooms.filter(r => r.status === this.roomFilter);
  }

  get floors(): number[] {
    return [...new Set(this.filteredRooms.map(r => r.floor))];
  }

  roomsOnFloor(floor: number): Room[] {
    return this.filteredRooms.filter(r => r.floor === floor);
  }

  get occupiedCount(): number    { return this.rooms.filter(r => r.status === 'occupied').length; }
  get vacantCount(): number      { return this.rooms.filter(r => r.status === 'vacant').length; }
  get maintenanceCount(): number { return this.rooms.filter(r => r.status === 'maintenance').length; }

  // ── Applications / Residents ──────────────────────────────────────
  applications: Application[] = [];
  appsLoading = false;
  appsError = '';
  showAppForm = false;
  newAppDate = '';
  appMsg = '';
  appErr = false;

  // ── Complaints / Maintenance ──────────────────────────────────────
  complaints: Complaint[] = [];
  complaintsLoading = false;
  complaintsError = '';
  showComplaintForm = false;
  newComplaint = '';
  complaintMsg = '';
  complaintErr = false;

  // ── Payments ──────────────────────────────────────────────────────
  months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  paymentMonth = '';
  paymentAmount: number | null = null;
  paymentMsg = '';
  paymentErr = false;
  paymentLoading = false;
  payments: any[] = [];
  paymentsLoading = false;
  paymentsError = '';

  // ── Reports ───────────────────────────────────────────────────────
  reportMsg = '';
  reportErr = false;
  reportLoading = false;
  reports: any[] = [];
  reportsLoading = false;
  reportsError = '';

  // ── Settings ──────────────────────────────────────────────────────
  settingsMsg = '';
  settings = {
    dormName: 'DormMS Student Residence',
    address: '123 University Ave, Manila',
    maxCapacity: 128,
    contactEmail: 'admin@dorms.edu',
    notifications: true,
    autoReminders: true,
    maintenanceAlerts: true,
  };

  constructor(private router: Router, private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    this.loadAdminStats();
  }

  // ── Admin stats ───────────────────────────────────────────────────
  loadAdminStats(): void {
    this.api.getStats().subscribe({
      next: (data) => {
        // Occupied ← active contracts; Vacant ← remainder of 128
        this.stats[1].value  = data.activeContracts;
        this.stats[1].change = `${Math.round(data.activeContracts / 128 * 100)}% occupancy`;
        this.stats[2].value  = 128 - data.activeContracts;
        this.stats[2].change = `${128 - data.activeContracts} available`;
        // Pending applications (was "Pending Payments")
        this.stats[3].label  = 'Pending Apps';
        this.stats[3].value  = data.pendingApplications;
        this.stats[3].change = data.pendingApplications > 0 ? 'Awaiting review' : 'All reviewed';
        // Open complaints
        this.stats[4].value  = data.openComplaints;
        this.stats[4].change = `${data.openComplaints} unresolved`;
        // Total students
        this.stats[5].value  = data.totalStudents;
        this.stats[5].change = 'Registered students';
      },
      error: () => {} // keep static fallback values on error
    });
  }

  get pageName(): string {
    return this.navItems.find(n => n.id === this.activeNav)?.label ?? 'Dashboard';
  }

  setActive(id: string): void {
    this.activeNav = id;
    if (id === 'residents') this.loadApplications();
    if (id === 'requests')  this.loadComplaints();
    if (id === 'payments')  this.loadPayments();
    if (id === 'reports')   this.loadReports();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  navigateTo(section: string): void {
    this.setActive(section);
  }

  // ── Status helpers ────────────────────────────────────────────────
  badgeClass(status: string): string {
    const map: Record<string, string> = {
      PENDING:     'badge--warning',
      ACCEPTED:    'badge--success',
      REJECTED:    'badge--danger',
      SUBMITTED:   'badge--info',
      IN_PROGRESS: 'badge--warning',
      RESOLVED:    'badge--success',
      ACTIVE:      'badge--success',
      EXTENDED:    'badge--info',
      TERMINATED:  'badge--danger',
    };
    return map[status] ?? 'badge--default';
  }

  // ── Applications ──────────────────────────────────────────────────
  updateApplicationStatus(appId: number, status: 'ACCEPTED' | 'REJECTED'): void {
    this.api.updateApplicationStatus(appId, status).subscribe({
      next: () => {
        this.appMsg = `Application #${appId} ${status.toLowerCase()}.`;
        this.appErr = false;
        this.loadApplications();
        this.loadAdminStats();
      },
      error: () => { this.appMsg = 'Failed to update status.'; this.appErr = true; },
    });
  }

  loadApplications(): void {
    this.appsLoading = true;
    this.appsError = '';
    this.api.getApplications().subscribe({
      next: (data) => { this.applications = data; this.appsLoading = false; },
      error: () => {
        this.appsError = 'Could not load applications. Make sure the backend server is running on port 3000.';
        this.appsLoading = false;
      },
    });
  }

  submitApplication(): void {
    if (!this.newAppDate) { this.appMsg = 'Please select a submission date.'; this.appErr = true; return; }
    this.api.submitApplication(this.newAppDate).subscribe({
      next: () => {
        this.appMsg = 'Application submitted successfully!';
        this.appErr = false;
        this.newAppDate = '';
        this.showAppForm = false;
        this.loadApplications();
      },
      error: () => { this.appMsg = 'Failed to submit. Please try again.'; this.appErr = true; },
    });
  }

  // ── Complaints ────────────────────────────────────────────────────
  updateComplaintStatus(id: number, status: 'IN_PROGRESS' | 'RESOLVED'): void {
    this.api.updateComplaintStatus(id, status).subscribe({
      next: () => {
        this.complaintMsg = `Complaint #${id} marked as ${status.replace('_', ' ').toLowerCase()}.`;
        this.complaintErr = false;
        this.loadComplaints();
        this.loadAdminStats();
      },
      error: () => { this.complaintMsg = 'Failed to update status.'; this.complaintErr = true; },
    });
  }

  loadComplaints(): void {
    this.complaintsLoading = true;
    this.complaintsError = '';
    this.api.getComplaints().subscribe({
      next: (data) => { this.complaints = data; this.complaintsLoading = false; },
      error: () => {
        this.complaintsError = 'Could not load complaints. Make sure the backend server is running on port 3000.';
        this.complaintsLoading = false;
      },
    });
  }

  submitComplaint(): void {
    if (!this.newComplaint.trim()) { this.complaintMsg = 'Please describe the issue.'; this.complaintErr = true; return; }
    this.api.submitComplaint(this.newComplaint).subscribe({
      next: () => {
        this.complaintMsg = 'Complaint submitted successfully!';
        this.complaintErr = false;
        this.newComplaint = '';
        this.showComplaintForm = false;
        this.loadComplaints();
      },
      error: () => { this.complaintMsg = 'Failed to submit. Please try again.'; this.complaintErr = true; },
    });
  }

  // ── Payments ──────────────────────────────────────────────────────
  loadPayments(): void {
    this.paymentsLoading = true;
    this.paymentsError = '';
    this.api.getPayments().subscribe({
      next: (data) => { this.payments = data; this.paymentsLoading = false; },
      error: () => {
        this.paymentsError = 'Could not load payments. Make sure the backend server is running on port 3000.';
        this.paymentsLoading = false;
      },
    });
  }

  recordPayment(): void {
    if (!this.paymentMonth || !this.paymentAmount) {
      this.paymentMsg = 'Please fill in all payment fields.';
      this.paymentErr = true;
      return;
    }
    this.paymentLoading = true;
    this.api.recordPayment(this.paymentMonth, this.paymentAmount).subscribe({
      next: () => {
        const amt = this.paymentAmount?.toLocaleString();
        this.paymentMsg = `Payment of ₱${amt} for ${this.paymentMonth} recorded successfully!`;
        this.paymentErr = false;
        this.paymentMonth = '';
        this.paymentAmount = null;
        this.paymentLoading = false;
        this.loadPayments();
      },
      error: () => {
        this.paymentMsg = 'Failed to record payment. Please try again.';
        this.paymentErr = true;
        this.paymentLoading = false;
      },
    });
  }

  // ── Reports ───────────────────────────────────────────────────────
  loadReports(): void {
    this.reportsLoading = true;
    this.reportsError = '';
    this.api.getReports().subscribe({
      next: (data) => { this.reports = data; this.reportsLoading = false; },
      error: () => {
        this.reportsError = 'Could not load reports. Make sure the backend server is running on port 3000.';
        this.reportsLoading = false;
      },
    });
  }

  generateReport(): void {
    this.reportLoading = true;
    this.api.generateReport().subscribe({
      next: () => {
        this.reportMsg = 'Report generated and saved successfully!';
        this.reportErr = false;
        this.reportLoading = false;
        this.loadReports();
      },
      error: () => {
        this.reportMsg = 'Failed to generate report. Please try again.';
        this.reportErr = true;
        this.reportLoading = false;
      },
    });
  }

  // ── Settings ──────────────────────────────────────────────────────
  saveSettings(): void {
    this.settingsMsg = 'Settings saved successfully!';
    setTimeout(() => (this.settingsMsg = ''), 3000);
  }
}
