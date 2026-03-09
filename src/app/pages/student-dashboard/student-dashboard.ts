import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

interface Application {
  application_id: number;
  user_id: number;
  submission_date: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  created_at: string;
}

interface Complaint {
  complaint_id: number;
  user_id: number;
  description: string;
  status: 'SUBMITTED' | 'IN_PROGRESS' | 'RESOLVED';
  created_at: string;
}

interface StudentActivity {
  message: string;
  time: string;
  icon: string;
}

interface DocumentItem {
  name: string;
  icon: string;
  uploaded: boolean;
  date: string;
  required: boolean;
}

@Component({
  selector: 'app-student-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './student-dashboard.html',
  styleUrl: './student-dashboard.scss',
})
export class StudentDashboardComponent implements OnInit {
  sidebarOpen = true;
  activeNav   = 'overview';
  today       = new Date();

  navItems = [
    { id: 'overview',   label: 'Overview',    icon: 'chart-bar.svg'     },
    { id: 'profile',    label: 'Profile',     icon: 'user.svg'           },
    { id: 'documents',  label: 'Documents',   icon: 'document.svg'       },
    { id: 'contract',   label: 'My Contract', icon: 'clipboard-list.svg' },
    { id: 'payments',   label: 'Payments',    icon: 'credit-card.svg'    },
    { id: 'complaints', label: 'Complaints',  icon: 'wrench.svg'         },
    { id: 'apply',      label: 'Apply',       icon: 'home.svg'           },
  ];

  // ── Student identity (populated from API) ─────────────────────────
  student = {
    name:           'Student',
    email:          '',
    mobile:         '',
    studentId:      '',
    course:         '',
    university:     '',
    initials:       'S',
    dormitoryName:  '',
    dormContactEmail: '',
    dormContactPhone: '',
  };

  // ── Room & contract (populated from API) ──────────────────────────
  roomInfo = { number: '—', floor: 0, type: '—' };

  contractInfo = {
    contractId:   '—',
    startDate:    '—',
    endDate:      '—',
    status:       'ACTIVE' as 'ACTIVE' | 'EXTENDED' | 'TERMINATED',
    monthlyRent:  5000,
  };

  nextPayment = { month: '—', amount: 5000, dueDate: '—', daysLeft: 0 };

  stats = [
    { label: 'My Room',       value: '—',  change: 'Not assigned',   positive: false, icon: 'home.svg',           color: 'blue'   },
    { label: 'Contract',      value: '—',  change: '—',              positive: false, icon: 'clipboard-list.svg', color: 'green'  },
    { label: 'Next Payment',  value: '—',  change: '—',              positive: false, icon: 'credit-card.svg',    color: 'orange' },
    { label: 'My Complaints', value: 0,    change: '—',              positive: true,  icon: 'wrench.svg',         color: 'yellow' },
  ];

  recentActivity: StudentActivity[] = [];

  importantContacts = [
    { label: 'Dorm Admin',   value: '—',                icon: 'envelope.svg'           },
    { label: 'Maintenance',  value: '+63 917 000 1234', icon: 'phone.svg'              },
    { label: 'Emergency',    value: '+63 917 000 9999', icon: 'exclamation-circle.svg' },
    { label: 'Office Hours', value: 'Mon–Fri, 8am–5pm', icon: 'clock.svg'             },
  ];

  // ── Profile form ──────────────────────────────────────────────────
  profileForm = {
    name:       '',
    email:      '',
    mobile:     '',
    studentId:  '',
    course:     '',
    university: '',
  };
  profileMsg = '';
  profileErr = false;

  // ── Documents (static UX demo — real file upload not in scope) ────
  documents: DocumentItem[] = [
    { name: 'Enrollment Certificate', icon: 'document-text.svg',  uploaded: true,  date: 'Jan 10, 2026', required: true  },
    { name: 'Student ID',             icon: 'identification.svg', uploaded: true,  date: 'Jan 10, 2026', required: true  },
    { name: 'Residence Card',         icon: 'home.svg',           uploaded: false, date: '',              required: false  },
    { name: 'Passport / Valid ID',    icon: 'identification.svg', uploaded: true,  date: 'Jan 10, 2026', required: true },
  ];
  docMsg = '';

  // ── Applications ──────────────────────────────────────────────────
  applications:  Application[] = [];
  appsLoading    = false;
  appsError      = '';
  showAppForm    = false;
  newAppDate     = '';
  appMsg         = '';
  appErr         = false;

  // ── Complaints ────────────────────────────────────────────────────
  complaints:        Complaint[] = [];
  complaintsLoading  = false;
  complaintsError    = '';
  showComplaintForm  = false;
  newComplaintTitle  = '';
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

  constructor(private router: Router, private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    // Seed from localStorage immediately for fast topbar display
    const savedName  = this.auth.getName()  ?? 'Student';
    const savedEmail = this.auth.getEmail() ?? '';
    this.student.name     = savedName;
    this.student.initials = savedName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    this.profileForm.name  = savedName;
    this.profileForm.email = savedEmail;

    // Load all data on init so everything is ready immediately
    this.loadProfile();
    this.loadMyContract();
    this.loadComplaints();
    this.loadApplications();
    this.loadPayments();
  }

  // ── Profile ───────────────────────────────────────────────────────
  loadProfile(): void {
    this.api.getProfile().subscribe({
      next: (data) => {
        this.student.name     = data.name  ?? this.student.name;
        this.student.email    = data.email ?? this.student.email;
        this.student.initials = this.student.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
        this.student.mobile   = data.phone ?? '';
        this.student.studentId   = data.student_id_number ?? '';
        this.student.course      = data.course      ?? '';
        this.student.university  = data.university  ?? '';
        this.student.dormitoryName    = data.dormitory_name    ?? '';
        this.student.dormContactEmail = data.dorm_contact_email ?? '';
        this.student.dormContactPhone = data.dorm_contact_phone ?? '';

        // Room info
        if (data.room_number) {
          this.roomInfo.number = data.room_number;
          this.roomInfo.floor  = data.floor ?? 0;
          this.roomInfo.type   = data.room_type ?? '—';
          this.stats[0].value  = data.room_number;
          this.stats[0].change = `Floor ${data.floor ?? '—'} · ${data.room_type ?? '—'}`;
          this.stats[0].positive = true;
        }

        // Update contacts with real dorm info
        if (data.dorm_contact_email) {
          this.importantContacts[0].value = data.dorm_contact_email;
        }
        if (data.dorm_contact_phone) {
          this.importantContacts[1].value = data.dorm_contact_phone;
        }

        // Pre-fill form
        this.profileForm.name       = data.name              ?? '';
        this.profileForm.email      = data.email             ?? '';
        this.profileForm.mobile     = data.phone             ?? '';
        this.profileForm.studentId  = data.student_id_number ?? '';
        this.profileForm.course     = data.course            ?? '';
        this.profileForm.university = data.university        ?? '';
      },
      error: () => {} // keep defaults on error
    });
  }

  // ── Contract ──────────────────────────────────────────────────────
  loadMyContract(): void {
    this.api.getContracts().subscribe({
      next: (data) => {
        if (!data) return;
        this.contractInfo.contractId = `CTR-${String(data.contract_id).padStart(3, '0')}`;
        this.contractInfo.status     = data.status ?? 'ACTIVE';

        if (data.start_date)
          this.contractInfo.startDate = new Date(data.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (data.end_date)
          this.contractInfo.endDate = new Date(data.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        // Room from contract join
        if (data.room_number && this.roomInfo.number === '—') {
          this.roomInfo.number = data.room_number;
          this.stats[0].value  = data.room_number;
          this.stats[0].positive = true;
        }

        this.stats[1].value   = this.contractInfo.status;
        this.stats[1].change  = `Until ${this.contractInfo.endDate}`;
        this.stats[1].positive = this.contractInfo.status === 'ACTIVE';

        // Next payment estimate
        const now = new Date();
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const nextDue = new Date(now.getFullYear(), now.getMonth() + 1, 15);
        const daysLeft = Math.max(0, Math.ceil((nextDue.getTime() - now.getTime()) / 86400000));
        this.nextPayment = {
          month:   monthNames[nextDue.getMonth()],
          amount:  this.contractInfo.monthlyRent,
          dueDate: `${monthNames[nextDue.getMonth()]} 15, ${nextDue.getFullYear()}`,
          daysLeft,
        };
        this.stats[2].value  = `€${this.contractInfo.monthlyRent.toLocaleString()}`;
        this.stats[2].change = `Due ${this.nextPayment.dueDate}`;
      },
      error: () => {}
    });
  }

  get pageName(): string {
    return this.navItems.find(n => n.id === this.activeNav)?.label ?? 'Overview';
  }

  setActive(id: string): void {
    this.activeNav = id;
    // Always reload on section switch
    if (id === 'apply')      this.loadApplications();
    if (id === 'complaints') this.loadComplaints();
    if (id === 'payments')   this.loadPayments();
    if (id === 'contract')   this.loadMyContract();
    if (id === 'profile')    this.loadProfile();
    if (id === 'overview') {
      this.loadProfile();
      this.loadMyContract();
    }
  }

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  navigateTo(section: string): void { this.setActive(section); }

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

  // ── Profile save ──────────────────────────────────────────────────
  saveProfile(): void {
    this.api.updateProfile({
      name:              this.profileForm.name,
      email:             this.profileForm.email,
      phone:             this.profileForm.mobile,
      student_id_number: this.profileForm.studentId,
      course:            this.profileForm.course,
      university:        this.profileForm.university,
    }).subscribe({
      next: () => {
        Object.assign(this.student, {
          name:       this.profileForm.name,
          email:      this.profileForm.email,
          mobile:     this.profileForm.mobile,
          studentId:  this.profileForm.studentId,
          course:     this.profileForm.course,
          university: this.profileForm.university,
        });
        this.student.initials = this.profileForm.name
          .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        this.profileMsg = 'Profile updated successfully!';
        this.profileErr = false;
        setTimeout(() => (this.profileMsg = ''), 3000);
      },
      error: (err: any) => {
        this.profileMsg = err?.error?.message ?? 'Failed to update profile.';
        this.profileErr = true;
      },
    });
  }

  // ── Documents (simulated upload) ──────────────────────────────────
  simulateUpload(doc: DocumentItem): void {
    doc.uploaded = true;
    doc.date     = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    this.docMsg  = `${doc.name} uploaded successfully!`;
    setTimeout(() => (this.docMsg = ''), 3000);
  }

  get uploadedCount():  number { return this.documents.filter(d => d.uploaded).length; }
  get requiredUploaded(): number { return this.documents.filter(d => d.required && d.uploaded).length; }
  get requiredCount():  number { return this.documents.filter(d => d.required).length; }

  // ── Applications ──────────────────────────────────────────────────
  loadApplications(): void {
    this.appsLoading = true;
    this.appsError   = '';
    this.api.getApplications().subscribe({
      next: (data) => { this.applications = data; this.appsLoading = false; },
      error: () => {
        this.appsError   = 'Could not load applications. Make sure the backend is running on port 3000.';
        this.appsLoading = false;
      },
    });
  }

  submitApplication(): void {
    if (!this.newAppDate) { this.appMsg = 'Please select a preferred start date.'; this.appErr = true; return; }
    this.api.submitApplication(this.newAppDate).subscribe({
      next: () => {
        this.appMsg  = 'Application submitted! We will review it shortly.';
        this.appErr  = false;
        this.newAppDate = '';
        this.showAppForm = false;
        this.loadApplications();
      },
      error: () => { this.appMsg = 'Failed to submit. Please try again.'; this.appErr = true; },
    });
  }

  // ── Complaints ────────────────────────────────────────────────────
  loadComplaints(): void {
    this.complaintsLoading = true;
    this.complaintsError   = '';
    this.api.getComplaints().subscribe({
      next: (data) => {
        this.complaints        = data;
        this.complaintsLoading = false;
        // Update overview stat
        const open       = data.filter((c: any) => c.status !== 'RESOLVED').length;
        const inProgress = data.filter((c: any) => c.status === 'IN_PROGRESS').length;
        this.stats[3].value  = data.length;
        this.stats[3].change = open > 0 ? `${inProgress} in progress` : 'All resolved';
        this.stats[3].positive = open === 0;

        // Derive recent activity from complaints
        this.recentActivity = data.slice(0, 5).map((c: any) => ({
          message: `Complaint #${c.complaint_id} — ${c.status.replace('_', ' ').toLowerCase()}`,
          time:    this.timeAgo(c.created_at),
          icon:    c.status === 'RESOLVED' ? 'check-circle.svg' : 'wrench.svg',
        }));
      },
      error: () => {
        this.complaintsError   = 'Could not load complaints. Make sure the backend is running on port 3000.';
        this.complaintsLoading = false;
      },
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

  submitComplaint(): void {
    if (!this.newComplaint.trim()) { this.complaintMsg = 'Please describe the issue.'; this.complaintErr = true; return; }
    const fullDesc = this.newComplaintTitle.trim()
      ? `[${this.newComplaintTitle.trim()}] ${this.newComplaint.trim()}`
      : this.newComplaint.trim();
    this.api.submitComplaint(fullDesc).subscribe({
      next: () => {
        this.complaintMsg      = 'Complaint submitted! Our team will respond shortly.';
        this.complaintErr      = false;
        this.newComplaintTitle = '';
        this.newComplaint      = '';
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
        this.paymentsError   = 'Could not load payments. Make sure the backend is running on port 3000.';
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
        this.paymentMsg     = `Payment of €${amt} for ${this.paymentMonth} submitted!`;
        this.paymentErr     = false;
        this.paymentMonth   = '';
        this.paymentAmount  = null;
        this.paymentLoading = false;
        this.loadPayments();
      },
      error: () => {
        this.paymentMsg     = 'Failed to submit payment. Please try again.';
        this.paymentErr     = true;
        this.paymentLoading = false;
      },
    });
  }

  // ── Report ────────────────────────────────────────────────────────
  generateReport(): void {
    this.reportLoading = true;
    this.api.generateReport().subscribe({
      next: () => {
        this.reportMsg     = 'Your payment history report has been generated!';
        this.reportErr     = false;
        this.reportLoading = false;
      },
      error: () => {
        this.reportMsg     = 'Failed to generate report. Please try again.';
        this.reportErr     = true;
        this.reportLoading = false;
      },
    });
  }
}
