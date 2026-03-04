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

interface Room {
  room_id: number;
  room_number: string;
  floor: number;
  type: string;
  status: 'occupied' | 'vacant' | 'maintenance';
  resident_id?: number;
  resident_name?: string;
}

interface Application {
  application_id: number;
  user_id: number;
  dormitory_id: number | null;
  submission_date: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  assigned_room_id: number | null;
  assigned_room_number?: string;
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

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  sidebarOpen = true;
  activeNav   = 'dashboard';

  // Admin identity
  adminName     = 'Admin';
  adminInitials = 'A';
  today         = new Date();

  navItems = [
    { id: 'dashboard', label: 'Dashboard',   icon: 'chart-bar.svg'    },
    { id: 'rooms',     label: 'Rooms',        icon: 'home.svg'          },
    { id: 'residents', label: 'Residents',    icon: 'users.svg'         },
    { id: 'payments',  label: 'Payments',     icon: 'credit-card.svg'   },
    { id: 'requests',  label: 'Maintenance',  icon: 'wrench.svg'        },
    { id: 'reports',   label: 'Reports',      icon: 'trending-up.svg'   },
    { id: 'settings',  label: 'Settings',     icon: 'cog.svg'           },
  ];

  // ── Stats (loaded from API) ───────────────────────────────────────
  stats: StatCard[] = [
    { label: 'Total Rooms',   value: '—', change: 'Loading…',      positive: true,  icon: 'home.svg',          color: 'blue'   },
    { label: 'Occupied',      value: '—', change: 'Loading…',      positive: true,  icon: 'check-circle.svg',  color: 'green'  },
    { label: 'Vacant',        value: '—', change: 'Loading…',      positive: false, icon: 'lock-open.svg',     color: 'orange' },
    { label: 'Pending Apps',  value: '—', change: 'Loading…',      positive: false, icon: 'credit-card.svg',   color: 'red'    },
    { label: 'Open Requests', value: '—', change: 'Loading…',      positive: false, icon: 'wrench.svg',        color: 'yellow' },
    { label: 'Total Students',value: '—', change: 'Loading…',      positive: true,  icon: 'users.svg',         color: 'purple' },
  ];

  // Raw stats for occupancy bar
  dormStats: any = {};

  get occupancyPct(): number {
    if (!this.dormStats.totalRooms) return 0;
    return Math.round((this.dormStats.occupiedRooms ?? 0) / this.dormStats.totalRooms * 100);
  }

  // ── Activity (loaded from API) ────────────────────────────────────
  recentActivity: RecentActivity[] = [];

  // ── Rooms (loaded from API) ───────────────────────────────────────
  rooms: Room[] = [];
  roomsLoading  = false;
  roomsError    = '';
  roomFilter: 'all' | 'occupied' | 'vacant' | 'maintenance' = 'all';

  get filteredRooms(): Room[] {
    if (this.roomFilter === 'all') return this.rooms;
    return this.rooms.filter(r => r.status === this.roomFilter);
  }

  get floors(): number[] {
    return [...new Set(this.filteredRooms.map(r => r.floor))].sort();
  }

  roomsOnFloor(floor: number): Room[] {
    return this.filteredRooms.filter(r => r.floor === floor);
  }

  get occupiedCount():    number { return this.rooms.filter(r => r.status === 'occupied').length;    }
  get vacantCount():      number { return this.rooms.filter(r => r.status === 'vacant').length;      }
  get maintenanceCount(): number { return this.rooms.filter(r => r.status === 'maintenance').length; }

  // ── Application / Residents ───────────────────────────────────────
  applications:   Application[] = [];
  appsLoading     = false;
  appsError       = '';
  showAppForm     = false;
  newAppDate      = '';
  appMsg          = '';
  appErr          = false;

  // Room assignment when accepting
  acceptingAppId  = 0;
  selectedRoomId  = 0;
  vacantRooms:    any[] = [];

  // ── Complaints / Maintenance ──────────────────────────────────────
  complaints:        Complaint[] = [];
  complaintsLoading  = false;
  complaintsError    = '';
  showComplaintForm  = false;
  newComplaint       = '';
  complaintMsg       = '';
  complaintErr       = false;

  // ── Payments ──────────────────────────────────────────────────────
  months         = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  paymentMonth   = '';
  paymentAmount: number | null = null;
  paymentMsg     = '';
  paymentErr     = false;
  paymentLoading = false;
  payments:       any[] = [];
  paymentsLoading = false;
  paymentsError   = '';

  // ── Reports ───────────────────────────────────────────────────────
  reportMsg     = '';
  reportErr     = false;
  reportLoading = false;
  reports:        any[] = [];
  reportsLoading  = false;
  reportsError    = '';

  // ── Admin Profile (Settings) ──────────────────────────────────────
  adminProfile = {
    name:           '',
    email:          '',
    position:       '',
    phone:          '',
    dormitory_name: '',
    address:        '',
    contact_email:  '',
    contact_phone:  '',
    max_capacity:   0,
  };
  adminProfileLoading = false;
  adminProfileMsg     = '';
  adminProfileErr     = false;
  // Keep notification toggles local (no DB storage needed)
  notifSettings = { notifications: true, autoReminders: true, maintenanceAlerts: true };

  constructor(private router: Router, private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    const name = this.auth.getName() ?? 'Admin';
    this.adminName     = name;
    this.adminInitials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    // Load everything on init so data is ready when user navigates
    this.loadAdminStats();
    this.loadRooms();
    this.loadActivity();
    this.loadApplications();
    this.loadComplaints();
    this.loadPayments();
    this.loadReports();
    this.loadAdminProfile();
  }

  get pageName(): string {
    return this.navItems.find(n => n.id === this.activeNav)?.label ?? 'Dashboard';
  }

  setActive(id: string): void {
    this.activeNav = id;
    // Always reload the section's data on navigation
    if (id === 'dashboard') { this.loadAdminStats(); this.loadActivity(); }
    if (id === 'rooms')      this.loadRooms();
    if (id === 'residents')  this.loadApplications();
    if (id === 'payments')   this.loadPayments();
    if (id === 'requests')   this.loadComplaints();
    if (id === 'reports')    this.loadReports();
    if (id === 'settings')   this.loadAdminProfile();
  }

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  navigateTo(section: string): void { this.setActive(section); }

  // ── Status badge helper ───────────────────────────────────────────
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

  // ── Stats ─────────────────────────────────────────────────────────
  loadAdminStats(): void {
    this.api.getStats().subscribe({
      next: (data: any) => {
        this.dormStats = data;
        this.stats[0].value  = data.totalRooms;
        this.stats[0].change = `${data.occupiedRooms} occupied, ${data.vacantRooms} vacant`;
        this.stats[1].value  = data.occupiedRooms;
        this.stats[1].change = `${this.occupancyPct}% occupancy`;
        this.stats[2].value  = data.vacantRooms;
        this.stats[2].change = `${data.maintenanceRooms} under maintenance`;
        this.stats[3].value  = data.pendingApplications;
        this.stats[3].change = data.pendingApplications > 0 ? 'Awaiting review' : 'All reviewed';
        this.stats[4].value  = data.openComplaints;
        this.stats[4].change = `${data.openComplaints} unresolved`;
        this.stats[5].value  = data.totalStudents;
        this.stats[5].change = 'Registered students';
      },
      error: () => {}
    });
  }

  // ── Activity ──────────────────────────────────────────────────────
  loadActivity(): void {
    this.api.getActivity().subscribe({
      next: (data: any[]) => {
        this.recentActivity = data.map(item => {
          if (item.type === 'application') {
            return { type: 'application', message: `${item.actor} — application ${item.detail.toLowerCase()}`, time: this.timeAgo(item.created_at), icon: 'clipboard-list.svg' };
          } else if (item.type === 'complaint') {
            return { type: 'complaint', message: `${item.actor} — complaint ${item.detail.replace('_', ' ').toLowerCase()}`, time: this.timeAgo(item.created_at), icon: 'wrench.svg' };
          } else {
            return { type: 'payment', message: `${item.actor} — payment for ${item.detail}`, time: this.timeAgo(item.created_at), icon: 'credit-card.svg' };
          }
        });
      },
      error: () => {}
    });
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? 'Yesterday' : `${days} days ago`;
  }

  // ── Rooms ─────────────────────────────────────────────────────────
  loadRooms(): void {
    this.roomsLoading = true;
    this.roomsError   = '';
    this.api.getRooms().subscribe({
      next: (data) => { this.rooms = data; this.roomsLoading = false; },
      error: () => {
        this.roomsError   = 'Could not load rooms. Make sure the backend server is running.';
        this.roomsLoading = false;
      },
    });
  }

  // ── Applications ──────────────────────────────────────────────────
  loadApplications(): void {
    this.appsLoading = true;
    this.appsError   = '';
    this.api.getApplications().subscribe({
      next: (data) => { this.applications = data; this.appsLoading = false; },
      error: () => {
        this.appsError   = 'Could not load applications. Make sure the backend server is running on port 3000.';
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

  // Start accept flow: load vacant rooms and flag this app
  startAcceptApplication(appId: number): void {
    this.acceptingAppId = appId;
    this.selectedRoomId = 0;
    this.api.getVacantRooms().subscribe({
      next: (data) => { this.vacantRooms = data; },
      error: () => { this.vacantRooms = []; },
    });
  }

  cancelAccept(): void {
    this.acceptingAppId = 0;
    this.selectedRoomId = 0;
  }

  confirmAcceptApplication(appId: number): void {
    if (!this.selectedRoomId) {
      this.appMsg = 'Please select a room before confirming.';
      this.appErr = true;
      return;
    }
    this.api.updateApplicationStatus(appId, 'ACCEPTED', this.selectedRoomId).subscribe({
      next: () => {
        this.appMsg = `Application #${appId} accepted and room assigned.`;
        this.appErr = false;
        this.acceptingAppId = 0;
        this.selectedRoomId = 0;
        this.loadApplications();
        this.loadAdminStats();
        this.loadRooms();
      },
      error: (err: any) => {
        this.appMsg = err?.error?.message ?? 'Failed to accept application.';
        this.appErr = true;
      },
    });
  }

  rejectApplication(appId: number): void {
    this.api.updateApplicationStatus(appId, 'REJECTED').subscribe({
      next: () => {
        this.appMsg = `Application #${appId} rejected.`;
        this.appErr = false;
        this.loadApplications();
        this.loadAdminStats();
      },
      error: () => { this.appMsg = 'Failed to reject application.'; this.appErr = true; },
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
    this.complaintsError   = '';
    this.api.getComplaints().subscribe({
      next: (data) => { this.complaints = data; this.complaintsLoading = false; },
      error: () => {
        this.complaintsError   = 'Could not load complaints. Make sure the backend server is running on port 3000.';
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
    this.paymentsError   = '';
    this.api.getPayments().subscribe({
      next: (data) => { this.payments = data; this.paymentsLoading = false; },
      error: () => {
        this.paymentsError   = 'Could not load payments. Make sure the backend server is running on port 3000.';
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
        this.paymentMsg     = `Payment of ₱${amt} for ${this.paymentMonth} recorded!`;
        this.paymentErr     = false;
        this.paymentMonth   = '';
        this.paymentAmount  = null;
        this.paymentLoading = false;
        this.loadPayments();
      },
      error: () => {
        this.paymentMsg     = 'Failed to record payment. Please try again.';
        this.paymentErr     = true;
        this.paymentLoading = false;
      },
    });
  }

  // ── Reports ───────────────────────────────────────────────────────
  loadReports(): void {
    this.reportsLoading = true;
    this.reportsError   = '';
    this.api.getReports().subscribe({
      next: (data) => { this.reports = data; this.reportsLoading = false; },
      error: () => {
        this.reportsError   = 'Could not load reports. Make sure the backend server is running on port 3000.';
        this.reportsLoading = false;
      },
    });
  }

  generateReport(): void {
    this.reportLoading = true;
    this.api.generateReport().subscribe({
      next: () => {
        this.reportMsg     = 'Report generated and saved successfully!';
        this.reportErr     = false;
        this.reportLoading = false;
        this.loadReports();
      },
      error: () => {
        this.reportMsg     = 'Failed to generate report. Please try again.';
        this.reportErr     = true;
        this.reportLoading = false;
      },
    });
  }

  // ── Admin Profile (Settings) ──────────────────────────────────────
  loadAdminProfile(): void {
    this.adminProfileLoading = true;
    this.api.getAdminProfile().subscribe({
      next: (data) => {
        this.adminProfile.name           = data.name           ?? '';
        this.adminProfile.email          = data.email          ?? '';
        this.adminProfile.position       = data.position       ?? 'Dormitory Administrator';
        this.adminProfile.phone          = data.phone          ?? '';
        this.adminProfile.dormitory_name = data.dormitory_name ?? '';
        this.adminProfile.address        = data.address        ?? '';
        this.adminProfile.contact_email  = data.contact_email  ?? '';
        this.adminProfile.contact_phone  = data.contact_phone  ?? '';
        this.adminProfile.max_capacity   = data.max_capacity   ?? 0;
        this.adminProfileLoading         = false;

        // Update displayed admin name in topbar
        if (data.name) {
          this.adminName     = data.name;
          this.adminInitials = data.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
        }
      },
      error: () => { this.adminProfileLoading = false; },
    });
  }

  saveAdminProfile(): void {
    this.api.updateAdminProfile(this.adminProfile).subscribe({
      next: () => {
        this.adminProfileMsg = 'Profile saved successfully!';
        this.adminProfileErr = false;
        // Update topbar name
        this.adminName     = this.adminProfile.name;
        this.adminInitials = this.adminProfile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        setTimeout(() => (this.adminProfileMsg = ''), 3000);
      },
      error: (err: any) => {
        this.adminProfileMsg = err?.error?.message ?? 'Failed to save profile.';
        this.adminProfileErr = true;
      },
    });
  }
}
