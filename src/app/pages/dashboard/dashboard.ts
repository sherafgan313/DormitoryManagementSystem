import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterOutlet, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Subscription, filter, startWith } from 'rxjs';
import { Chart, registerables } from 'chart.js';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { NavMenuComponent } from '../../components/nav-menu/nav-menu';
import { ApplicationComponent } from '../../components/application/application';
import { ContractComponent } from '../../components/contract/contract';
import { ComplaintComponent } from '../../components/complaint/complaint';
import { ReceiptComponent } from '../../components/receipt/receipt';
import { ProgressComponent } from '../../components/progress/progress';

Chart.register(...registerables);

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

interface AcceptDialog {
  open: boolean;
  phase: 'confirm' | 'result';
  success: boolean;
  appId: number;
  studentName: string;
  roomLabel: string;
  startDate: string;
  endDate: string;
  monthlyRent: number | null;
  dueDay: number;
  errorMsg: string;
}

interface RejectDialog {
  open: boolean;
  phase: 'remarks' | 'confirm' | 'result';
  success: boolean;
  appId: number;
  studentName: string;
  remarks: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule, FormsModule, RouterOutlet,
    NavMenuComponent, ApplicationComponent, ContractComponent,
    ComplaintComponent, ReceiptComponent, ProgressComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
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
    { label: 'Total Rooms',    value: '—', change: 'Loading…', positive: true,  icon: 'home.svg',         color: 'blue'   },
    { label: 'Occupied',       value: '—', change: 'Loading…', positive: true,  icon: 'check-circle.svg', color: 'green'  },
    { label: 'Vacant',         value: '—', change: 'Loading…', positive: false, icon: 'lock-open.svg',    color: 'orange' },
    { label: 'Pending Apps',   value: '—', change: 'Loading…', positive: false, icon: 'credit-card.svg',  color: 'red'    },
    { label: 'Open Requests',  value: '—', change: 'Loading…', positive: false, icon: 'wrench.svg',       color: 'yellow' },
    { label: 'Total Students', value: '—', change: 'Loading…', positive: true,  icon: 'users.svg',        color: 'purple' },
  ];

  dormStats: any = {};

  get occupancyPct(): number {
    if (!this.dormStats.totalRooms) return 0;
    return Math.round((this.dormStats.occupiedRooms ?? 0) / this.dormStats.totalRooms * 100);
  }

  // ── Activity ──────────────────────────────────────────────────────
  recentActivity: RecentActivity[] = [];

  // ── Rooms ─────────────────────────────────────────────────────────
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

  // ── Applications ──────────────────────────────────────────────────
  applications:  Application[] = [];
  appsLoading    = false;
  appsError      = '';
  showAppForm    = false;
  newAppDate     = '';
  appMsg         = '';
  appErr         = false;

  acceptingAppId    = 0;
  selectedRoomId    = 0;
  contractStartDate = '';
  contractEndDate   = '';
  contractRent: number | null = null;
  contractDueDay: number      = 15;
  vacantRooms: any[] = [];

  // ── Accept dialog ─────────────────────────────────────────────────
  acceptDialog: AcceptDialog = {
    open: false, phase: 'confirm', success: false,
    appId: 0, studentName: '', roomLabel: '',
    startDate: '', endDate: '', monthlyRent: null, dueDay: 15, errorMsg: '',
  };

  // ── Reject dialog ─────────────────────────────────────────────────
  rejectDialog: RejectDialog = {
    open: false, phase: 'remarks', success: false,
    appId: 0, studentName: '', remarks: '',
  };

  // ── Residents sub-tabs ────────────────────────────────────────────
  residentsTab: 'new' | 'extension' | 'termination' = 'new';

  // ── Termination requests (admin view) ─────────────────────────────
  terminationRequests: any[]    = [];
  termReqsLoading               = false;
  termReqsError                 = '';

  // ── Admin terminate dialog ────────────────────────────────────────
  adminTerminateDialog = {
    open: false,
    phase: 'form' as 'form' | 'confirm' | 'result',
    success: false,
    contractId: 0,
    selectedStudent: null as any,
    reason: '',
    requestedEndDate: '',
    errorMsg: '',
    students: [] as any[],
    studentsLoading: false,
  };

  // ── Complaints ────────────────────────────────────────────────────
  complaints:       Complaint[] = [];
  complaintsLoading = false;
  complaintsError   = '';
  showComplaintForm = false;
  newComplaint      = '';
  complaintMsg      = '';
  complaintErr      = false;

  // ── Chart canvas refs ──────────────────────────────────────────────
  @ViewChild('occupancyCanvas') occupancyCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('financesCanvas')  financesCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('maintenanceCanvas') maintenanceCanvasRef!: ElementRef<HTMLCanvasElement>;

  private chartInstances: Chart[] = [];

  // ── Payments ──────────────────────────────────────────────────────
  months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  years  = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

  summaryMonth   = this.months[new Date().getMonth()];
  summaryYear    = new Date().getFullYear();
  paymentSummary: any = null;
  summaryLoading = false;
  summaryLoaded  = false;

  paymentMsg     = '';
  paymentErr     = false;
  payments:       any[] = [];
  paymentsLoading = false;
  paymentsError   = '';

  // ── Room maintenance dialog ────────────────────────────────────────
  maintenanceDialog = { open: false, room: null as Room | null, loading: false };

  // ── Reports ───────────────────────────────────────────────────────
  reportMsg      = '';
  reportErr      = false;
  reportLoading  = false;
  reports:        any[] = [];
  reportsLoading  = false;
  reportsError    = '';

  adminReportModal = {
    open: false,
    status: '' as '' | 'GENERATING' | 'COMPLETED' | 'FAILED',
    fileName: '',
  };

  // ── Notifications ─────────────────────────────────────────────────
  notifPanelOpen = false;
  toasts: AppNotification[] = [];
  private toastTimers = new Map<number, any>();
  private notifSub?: Subscription;
  private toastSub?: Subscription;

  // ── Admin Profile ─────────────────────────────────────────────────
  adminProfile = {
    name: '', email: '', position: '', phone: '',
    dormitory_name: '', address: '', contact_email: '', contact_phone: '', max_capacity: 0,
  };
  adminProfileLoading = false;
  adminProfileMsg     = '';
  adminProfileErr     = false;
  notifSettings = { notifications_enabled: true, payment_reminders_enabled: true, maintenance_alerts_enabled: true };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private api: ApiService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
    public notifService: NotificationService,
  ) {}

  ngOnInit(): void {
    const name = this.auth.getName() ?? 'Admin';
    this.adminName     = name;
    this.adminInitials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    // Sync activeNav from the child route URL
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
    ).subscribe(() => {
      const seg = this.route.firstChild?.snapshot.url[0]?.path ?? 'dashboard';
      this.activeNav = seg;
      this.cdr.markForCheck();
    });

    this.loadAdminStats();
    this.loadRooms();
    this.loadActivity();
    this.loadApplications();
    this.loadTerminationRequests();
    this.loadComplaints();
    this.loadPayments();
    this.loadReports();
    this.loadAdminProfile();
    this.loadDormitorySettings();

    // Notifications
    this.notifService.connect();
    this.notifService.load();
    this.notifSub = this.notifService.notifications$.subscribe(() => this.cdr.markForCheck());
    this.toastSub = this.notifService.toast$.subscribe(n => {
      this.toasts = [n, ...this.toasts];
      this.cdr.markForCheck();
      const t = setTimeout(() => this.dismissToast(n), 5000);
      this.toastTimers.set(n.notification_id, t);
    });
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.notifService.disconnect();
    this.notifSub?.unsubscribe();
    this.toastSub?.unsubscribe();
    this.toastTimers.forEach(t => clearTimeout(t));
    this.chartInstances.forEach(c => c.destroy());
  }

  get pageName(): string {
    return this.navItems.find(n => n.id === this.activeNav)?.label ?? 'Dashboard';
  }

  setActive(id: string): void {
    this.router.navigate(['/dashboard', id]);
    if (id === 'dashboard') { this.loadAdminStats(); this.loadActivity(); }
    if (id === 'rooms')      this.loadRooms();
    if (id === 'residents')  { this.loadApplications(); this.loadTerminationRequests(); }
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

  badgeClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'badge--warning', ACCEPTED: 'badge--success', REJECTED: 'badge--danger',
      SUBMITTED: 'badge--info', IN_PROGRESS: 'badge--warning', RESOLVED: 'badge--success',
      ACTIVE: 'badge--success', EXTENDED: 'badge--info', TERMINATED: 'badge--danger',
      PENDING_VERIFICATION: 'badge--warning', VERIFIED: 'badge--success',
    };
    return map[status] ?? 'badge--default';
  }

  // ── Stats ─────────────────────────────────────────────────────────
  loadAdminStats(): void {
    this.api.getStats().subscribe({
      next: (data: any) => {
        this.dormStats       = data;
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
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  // ── Activity ──────────────────────────────────────────────────────
  loadActivity(): void {
    this.api.getActivity().subscribe({
      next: (data: any[]) => {
        this.recentActivity = data.map(item => {
          if (item.type === 'application')
            return { type: 'application', message: `${item.actor} — application ${item.detail.toLowerCase()}`, time: this.timeAgo(item.created_at), icon: 'clipboard-list.svg' };
          if (item.type === 'complaint')
            return { type: 'complaint', message: `${item.actor} — complaint ${item.detail.replace('_', ' ').toLowerCase()}`, time: this.timeAgo(item.created_at), icon: 'wrench.svg' };
          return { type: 'payment', message: `${item.actor} — payment for ${item.detail}`, time: this.timeAgo(item.created_at), icon: 'credit-card.svg' };
        });
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? 'Yesterday' : `${days} days ago`;
  }

  // ── Rooms ─────────────────────────────────────────────────────────
  loadRooms(): void {
    this.roomsLoading = true;
    this.roomsError   = '';
    this.api.getRooms().subscribe({
      next: (data) => {
        this.rooms        = data;
        this.roomsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.roomsError   = 'Could not load rooms. Make sure the backend server is running.';
        this.roomsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  get newApplications(): Application[] {
    return this.applications.filter((a: any) => !a.application_type || a.application_type === 'NEW');
  }

  get extensionApplications(): Application[] {
    return this.applications.filter((a: any) => a.application_type === 'EXTENSION');
  }

  // ── Applications ──────────────────────────────────────────────────
  loadApplications(): void {
    this.appsLoading = true;
    this.appsError   = '';
    this.api.getApplications().subscribe({
      next: (data) => {
        this.applications = data;
        this.appsLoading  = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.appsError   = 'Could not load applications. Make sure the backend server is running on port 3000.';
        this.appsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  submitApplication(): void {
    if (!this.newAppDate) { this.appMsg = 'Please select a submission date.'; this.appErr = true; return; }
    this.api.submitApplication(this.newAppDate).subscribe({
      next: () => {
        this.appMsg      = 'Application submitted successfully!';
        this.appErr      = false;
        this.newAppDate  = '';
        this.showAppForm = false;
        this.cdr.markForCheck();
        this.loadApplications();
      },
      error: () => {
        this.appMsg = 'Failed to submit. Please try again.';
        this.appErr = true;
        this.cdr.markForCheck();
      },
    });
  }

  startAcceptApplication(appId: number): void {
    this.acceptingAppId = appId;
    this.selectedRoomId = 0;
    this.api.getVacantRooms().subscribe({
      next: (data) => { this.vacantRooms = data; this.cdr.markForCheck(); },
      error: () => { this.vacantRooms = []; this.cdr.markForCheck(); },
    });
  }

  cancelAccept(): void {
    this.acceptingAppId    = 0;
    this.selectedRoomId    = 0;
    this.contractStartDate = '';
    this.contractEndDate   = '';
    this.contractRent      = null;
    this.contractDueDay    = 15;
  }

  openAcceptDialog(appId: number): void {
    if (!this.selectedRoomId)    { this.appMsg = 'Please select a room.';          this.appErr = true; return; }
    if (!this.contractStartDate) { this.appMsg = 'Please enter a start date.';     this.appErr = true; return; }
    if (!this.contractEndDate)   { this.appMsg = 'Please enter an end date.';      this.appErr = true; return; }
    if (!this.contractRent)      { this.appMsg = 'Please enter the monthly rent.'; this.appErr = true; return; }

    const app  = this.applications.find(a => a.application_id === appId);
    const room = this.vacantRooms.find((r: any) => r.room_id === this.selectedRoomId);

    this.acceptDialog = {
      open: true, phase: 'confirm', success: false,
      appId,
      studentName: app?.user_name ?? `User #${app?.user_id}`,
      roomLabel:   room ? `${room.room_number} (Fl.${room.floor}, ${room.type})` : `Room #${this.selectedRoomId}`,
      startDate:   this.contractStartDate,
      endDate:     this.contractEndDate,
      monthlyRent: this.contractRent,
      dueDay:      this.contractDueDay,
      errorMsg:    '',
    };
    this.cdr.markForCheck();
  }

  confirmAcceptApplication(): void {
    this.api.updateApplicationStatus(this.acceptDialog.appId, 'ACCEPTED', {
      room_id:      this.selectedRoomId,
      start_date:   this.contractStartDate,
      end_date:     this.contractEndDate,
      monthly_rent: this.contractRent!,
      due_day:      this.contractDueDay,
    }).subscribe({
      next: () => {
        this.acceptDialog.phase   = 'result';
        this.acceptDialog.success = true;
        this.cancelAccept();
        this.appMsg = '';
        this.cdr.markForCheck();
        this.loadApplications();
        this.loadAdminStats();
        this.loadRooms();
      },
      error: (err: any) => {
        this.acceptDialog.phase    = 'result';
        this.acceptDialog.success  = false;
        this.acceptDialog.errorMsg = err?.error?.message ?? 'Failed to accept application.';
        this.cdr.markForCheck();
      },
    });
  }

  closeAcceptDialog(): void {
    this.acceptDialog.open = false;
    this.cdr.markForCheck();
  }

  openRejectDialog(appId: number): void {
    const app = this.applications.find(a => a.application_id === appId);
    this.rejectDialog = {
      open: true, phase: 'remarks', success: false,
      appId,
      studentName: app?.user_name ?? `User #${app?.user_id}`,
      remarks: '',
    };
    this.cdr.markForCheck();
  }

  proceedToRejectConfirm(): void {
    this.rejectDialog.phase = 'confirm';
    this.cdr.markForCheck();
  }

  backToRemarks(): void {
    this.rejectDialog.phase = 'remarks';
    this.cdr.markForCheck();
  }

  confirmRejectApplication(): void {
    const { appId, remarks } = this.rejectDialog;
    this.api.updateApplicationStatus(appId, 'REJECTED', { remarks }).subscribe({
      next: () => {
        this.rejectDialog.phase   = 'result';
        this.rejectDialog.success = true;
        this.cdr.markForCheck();
        this.loadApplications();
        this.loadAdminStats();
      },
      error: () => {
        this.rejectDialog.phase   = 'result';
        this.rejectDialog.success = false;
        this.cdr.markForCheck();
      },
    });
  }

  closeRejectDialog(): void {
    this.rejectDialog.open = false;
    this.cdr.markForCheck();
  }

  // ── Complaints ────────────────────────────────────────────────────
  loadComplaints(): void {
    this.complaintsLoading = true;
    this.complaintsError   = '';
    this.api.getComplaints().subscribe({
      next: (data) => {
        this.complaints        = data;
        this.complaintsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.complaintsError   = 'Could not load complaints. Make sure the backend server is running on port 3000.';
        this.complaintsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  submitComplaint(): void {
    if (!this.newComplaint.trim()) { this.complaintMsg = 'Please describe the issue.'; this.complaintErr = true; return; }
    this.api.submitComplaint(this.newComplaint).subscribe({
      next: () => {
        this.complaintMsg      = 'Complaint submitted successfully!';
        this.complaintErr      = false;
        this.newComplaint      = '';
        this.showComplaintForm = false;
        this.cdr.markForCheck();
        this.loadComplaints();
      },
      error: () => {
        this.complaintMsg = 'Failed to submit. Please try again.';
        this.complaintErr = true;
        this.cdr.markForCheck();
      },
    });
  }

  updateComplaintStatus(id: number, status: 'IN_PROGRESS' | 'RESOLVED'): void {
    this.api.updateComplaintStatus(id, status).subscribe({
      next: () => {
        this.complaintMsg = `Complaint #${id} marked as ${status.replace('_', ' ').toLowerCase()}.`;
        this.complaintErr = false;
        this.cdr.markForCheck();
        this.loadComplaints();
        this.loadAdminStats();
      },
      error: () => {
        this.complaintMsg = 'Failed to update status.';
        this.complaintErr = true;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Payments ──────────────────────────────────────────────────────
  verifyPayment(id: number): void {
    this.api.verifyPayment(id).subscribe({
      next: () => {
        this.paymentMsg = `Payment #${id} verified.`;
        this.paymentErr = false;
        this.cdr.markForCheck();
        this.loadPayments();
      },
      error: () => {
        this.paymentMsg = 'Failed to verify payment.';
        this.paymentErr = true;
        this.cdr.markForCheck();
      },
    });
  }

  rejectPayment(id: number): void {
    this.api.rejectPayment(id).subscribe({
      next: () => {
        this.paymentMsg = `Payment #${id} rejected.`;
        this.paymentErr = false;
        this.cdr.markForCheck();
        this.loadPayments();
      },
      error: () => {
        this.paymentMsg = 'Failed to reject payment.';
        this.paymentErr = true;
        this.cdr.markForCheck();
      },
    });
  }

  downloadReceipt(paymentId: number): void {
    this.api.downloadReceipt(paymentId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `receipt-payment-${paymentId}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.paymentMsg = 'Could not download receipt.';
        this.paymentErr = true;
        this.cdr.markForCheck();
      },
    });
  }

  loadPayments(): void {
    this.paymentsLoading = true;
    this.paymentsError   = '';
    this.api.getPayments().subscribe({
      next: (data) => {
        this.payments        = data;
        this.paymentsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.paymentsError   = 'Could not load payments. Make sure the backend server is running on port 3000.';
        this.paymentsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadPaymentSummary(): void {
    this.summaryLoading = true;
    this.summaryLoaded  = false;
    this.api.getPaymentSummary(this.summaryMonth, this.summaryYear).subscribe({
      next: (data) => {
        this.paymentSummary  = data;
        this.summaryLoading  = false;
        this.summaryLoaded   = true;
        this.cdr.markForCheck();
      },
      error: () => {
        this.summaryLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Reports ───────────────────────────────────────────────────────
  loadReports(): void {
    this.reportsLoading = true;
    this.reportsError   = '';
    this.api.getReports().subscribe({
      next: (data) => {
        this.reports        = data;
        this.reportsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.reportsError   = 'Could not load reports. Make sure the backend server is running on port 3000.';
        this.reportsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  closeAdminReportModal(): void {
    this.adminReportModal.open = false;
    this.cdr.markForCheck();
  }

  downloadAdminReportAgain(): void {
    const link = document.createElement('a');
    link.href     = this.api.downloadAdminReport(this.adminReportModal.fileName);
    link.download = this.adminReportModal.fileName;
    link.click();
  }

  generateAdminReport(): void {
    this.reportLoading            = true;
    this.reportMsg                = '';
    this.adminReportModal.open    = true;
    this.adminReportModal.status  = 'GENERATING';
    this.adminReportModal.fileName = '';
    this.cdr.markForCheck();

    // Render charts on hidden canvases, then POST to backend
    const buildChartImage = (
      canvasEl: HTMLCanvasElement,
      type: 'doughnut' | 'bar',
      labels: string[],
      data: number[],
      colors: string[]
    ): string => {
      this.chartInstances.forEach(c => { try { c.destroy(); } catch {} });
      this.chartInstances = [];
      const ctx = canvasEl.getContext('2d')!;
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      const chart = new Chart(ctx, {
        type,
        data: {
          labels,
          datasets: [{ data, backgroundColor: colors, borderWidth: 1 }],
        },
        options: { animation: false, responsive: false, plugins: { legend: { position: 'bottom' } } },
      });
      const b64 = canvasEl.toDataURL('image/png');
      chart.destroy();
      return b64;
    };

    const oCanvas = this.occupancyCanvasRef?.nativeElement;
    const fCanvas = this.financesCanvasRef?.nativeElement;
    const mCanvas = this.maintenanceCanvasRef?.nativeElement;

    const s = this.dormStats;
    const occupancyImg  = oCanvas ? buildChartImage(oCanvas, 'doughnut',
      ['Occupied', 'Vacant', 'Maintenance'],
      [s.occupiedRooms ?? 0, s.vacantRooms ?? 0, s.maintenanceRooms ?? 0],
      ['#10b981', '#3b82f6', '#f59e0b']) : '';

    // For finances we use current payments list by status
    const verified  = this.payments.filter(p => p.verification_status === 'VERIFIED').length;
    const pending   = this.payments.filter(p => p.verification_status === 'PENDING_VERIFICATION').length;
    const rejected  = this.payments.filter(p => p.verification_status === 'REJECTED').length;
    const financesImg = fCanvas ? buildChartImage(fCanvas, 'bar',
      ['Verified', 'Pending', 'Rejected'],
      [verified, pending, rejected],
      ['#10b981', '#f59e0b', '#ef4444']) : '';

    const submitted  = this.complaints.filter(c => c.status === 'SUBMITTED').length;
    const inProgress = this.complaints.filter(c => c.status === 'IN_PROGRESS').length;
    const resolved   = this.complaints.filter(c => c.status === 'RESOLVED').length;
    const maintenanceImg = mCanvas ? buildChartImage(mCanvas, 'doughnut',
      ['Submitted', 'In Progress', 'Resolved'],
      [submitted, inProgress, resolved],
      ['#f59e0b', '#3b82f6', '#10b981']) : '';

    this.api.generateAdminReport({
      stats: this.dormStats,
      chartImages: { occupancy: occupancyImg, finances: financesImg, maintenance: maintenanceImg },
    }).subscribe({
      next: (res: any) => {
        this.reportMsg                 = 'Report generated successfully!';
        this.reportErr                 = false;
        this.reportLoading             = false;
        this.adminReportModal.status   = 'COMPLETED';
        this.adminReportModal.fileName = res.fileName;
        // Trigger download automatically
        const link = document.createElement('a');
        link.href  = this.api.downloadAdminReport(res.fileName);
        link.download = res.fileName;
        link.click();
        this.cdr.markForCheck();
        this.loadReports();
      },
      error: () => {
        this.reportMsg               = 'Failed to generate report. Please try again.';
        this.reportErr               = true;
        this.reportLoading           = false;
        this.adminReportModal.status = 'FAILED';
        this.cdr.markForCheck();
      },
    });
  }

  // ── Termination requests (admin) ──────────────────────────────────
  loadTerminationRequests(): void {
    this.termReqsLoading = true;
    this.termReqsError   = '';
    this.api.getTerminationRequests().subscribe({
      next: (data) => {
        this.terminationRequests = data;
        this.termReqsLoading     = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.termReqsError   = 'Could not load termination requests.';
        this.termReqsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  acceptTermReq(id: number): void {
    this.api.acceptTerminationRequest(id).subscribe({
      next: () => {
        this.loadTerminationRequests();
        this.loadAdminStats();
        this.loadRooms();
        this.cdr.markForCheck();
      },
      error: () => { this.cdr.markForCheck(); },
    });
  }

  rejectTermReq(id: number): void {
    this.api.rejectTerminationRequest(id).subscribe({
      next: () => {
        this.loadTerminationRequests();
        this.cdr.markForCheck();
      },
      error: () => { this.cdr.markForCheck(); },
    });
  }

  // ── Admin-initiated termination ────────────────────────────────────
  openAdminTerminateDialog(): void {
    this.adminTerminateDialog = {
      open: true, phase: 'form', success: false,
      contractId: 0, selectedStudent: null,
      reason: '', requestedEndDate: '', errorMsg: '',
      students: [], studentsLoading: true,
    };
    this.cdr.markForCheck();
    this.api.getActiveContractStudents().subscribe({
      next: (data) => {
        this.adminTerminateDialog.students        = data;
        this.adminTerminateDialog.studentsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.adminTerminateDialog.studentsLoading = false;
        this.adminTerminateDialog.errorMsg        = 'Could not load students.';
        this.cdr.markForCheck();
      },
    });
  }

  selectTerminateStudent(student: any): void {
    this.adminTerminateDialog.selectedStudent = student;
    this.adminTerminateDialog.contractId      = student.contract_id;
    this.cdr.markForCheck();
  }

  selectTerminateStudentById(contractId: number): void {
    const student = this.adminTerminateDialog.students.find(s => s.contract_id === Number(contractId));
    if (student) this.selectTerminateStudent(student);
  }

  proceedToAdminTerminateConfirm(): void {
    const d = this.adminTerminateDialog;
    if (!d.selectedStudent) { d.errorMsg = 'Please select a student.'; this.cdr.markForCheck(); return; }
    if (!d.reason.trim())   { d.errorMsg = 'Please enter a reason.'; this.cdr.markForCheck(); return; }
    d.errorMsg = '';
    d.phase    = 'confirm';
    this.cdr.markForCheck();
  }

  confirmAdminTerminate(): void {
    const d = this.adminTerminateDialog;
    this.api.adminTerminateContract(d.contractId, d.reason.trim(), new Date().toISOString().slice(0, 10)).subscribe({
      next: () => {
        d.phase   = 'result';
        d.success = true;
        this.cdr.markForCheck();
        this.loadTerminationRequests();
        this.loadAdminStats();
        this.loadRooms();
        this.loadApplications();
      },
      error: (err: any) => {
        d.phase    = 'result';
        d.success  = false;
        d.errorMsg = err?.error?.message ?? 'Termination failed.';
        this.cdr.markForCheck();
      },
    });
  }

  closeAdminTerminateDialog(): void {
    this.adminTerminateDialog.open = false;
    this.cdr.markForCheck();
  }

  // ── Admin Profile ─────────────────────────────────────────────────
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
        if (data.name) {
          this.adminName     = data.name;
          this.adminInitials = data.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.adminProfileLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadDormitorySettings(): void {
    this.api.getDormitorySettings().subscribe({
      next: (data) => {
        this.notifSettings.notifications_enabled      = !!data.notifications_enabled;
        this.notifSettings.payment_reminders_enabled  = !!data.payment_reminders_enabled;
        this.notifSettings.maintenance_alerts_enabled = !!data.maintenance_alerts_enabled;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  saveAdminProfile(): void {
    this.api.updateAdminProfile(this.adminProfile).subscribe({
      next: () => {
        this.adminName     = this.adminProfile.name;
        this.adminInitials = this.adminProfile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        // Save notification settings alongside profile
        this.api.updateDormitorySettings(this.notifSettings).subscribe({
          next: () => {
            this.adminProfileMsg = 'Profile saved successfully!';
            this.adminProfileErr = false;
            this.cdr.markForCheck();
            setTimeout(() => { this.adminProfileMsg = ''; this.cdr.markForCheck(); }, 3000);
          },
          error: () => {
            this.adminProfileMsg = 'Profile saved but settings failed to save.';
            this.adminProfileErr = true;
            this.cdr.markForCheck();
          },
        });
      },
      error: (err: any) => {
        this.adminProfileMsg = err?.error?.message ?? 'Failed to save profile.';
        this.adminProfileErr = true;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Room maintenance dialog ────────────────────────────────────────
  openMaintenanceDialog(room: Room): void {
    this.maintenanceDialog = { open: true, room, loading: false };
    this.cdr.markForCheck();
  }

  closeMaintenanceDialog(): void {
    this.maintenanceDialog = { open: false, room: null, loading: false };
    this.cdr.markForCheck();
  }

  confirmClearMaintenance(): void {
    if (!this.maintenanceDialog.room) return;
    this.maintenanceDialog.loading = true;
    this.cdr.markForCheck();
    this.api.clearRoomMaintenance(this.maintenanceDialog.room.room_id).subscribe({
      next: () => {
        this.closeMaintenanceDialog();
        this.loadRooms();
        this.loadAdminStats();
      },
      error: () => {
        this.maintenanceDialog.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Notification panel ────────────────────────────────────────────
  @HostListener('document:click')
  closeNotifPanel(): void {
    if (this.notifPanelOpen) {
      this.notifPanelOpen = false;
      this.cdr.markForCheck();
    }
  }

  toggleNotifPanel(event: Event): void {
    event.stopPropagation();
    this.notifPanelOpen = !this.notifPanelOpen;
    this.cdr.markForCheck();
  }

  notifIcon(type: string): string {
    const icons: Record<string, string> = {
      application: '📋', contract: '📄', payment: '💳', complaint: '🔧',
    };
    return icons[type] ?? '🔔';
  }

  markRead(id: number, event: Event): void {
    event.stopPropagation();
    this.notifService.markRead(id).subscribe();
  }

  markAllRead(): void {
    this.notifService.markAllRead().subscribe();
  }

  onNotifClick(n: AppNotification, event: Event): void {
    event.stopPropagation();
    if (!n.is_read) this.notifService.markRead(n.notification_id).subscribe();
    this.notifPanelOpen = false;
    this.setActive(n.tab);
    this.cdr.markForCheck();
  }

  dismissToast(n: AppNotification): void {
    clearTimeout(this.toastTimers.get(n.notification_id));
    this.toastTimers.delete(n.notification_id);
    this.toasts = this.toasts.filter(t => t.notification_id !== n.notification_id);
    this.cdr.markForCheck();
  }

  onToastClick(n: AppNotification): void {
    this.dismissToast(n);
    if (!n.is_read) this.notifService.markRead(n.notification_id).subscribe();
    this.setActive(n.tab);
  }
}
