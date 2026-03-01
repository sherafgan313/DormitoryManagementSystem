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
  activeNav = 'overview';

  navItems = [
    { id: 'overview',   label: 'Overview',    icon: '📊' },
    { id: 'profile',    label: 'Profile',     icon: '👤' },
    { id: 'documents',  label: 'Documents',   icon: '📄' },
    { id: 'contract',   label: 'My Contract', icon: '📋' },
    { id: 'payments',   label: 'Payments',    icon: '💳' },
    { id: 'complaints', label: 'Complaints',  icon: '🔧' },
    { id: 'apply',      label: 'Apply',       icon: '🏠' },
  ];

  // ── Student info (demo) ───────────────────────────────────────────
  student = {
    name: 'Maria Santos',
    email: 'maria.santos@university.edu',
    mobile: '+63 912 345 6789',
    studentId: '2024-12345',
    course: 'BS Computer Science',
    university: 'Mapúa Malayan Colleges Mindanao',
    initials: 'MS',
  };

  // ── Room & contract (demo) ────────────────────────────────────────
  roomInfo = { number: '204', floor: 2, type: 'Double' };

  contractInfo = {
    contractId: 'CTR-001',
    startDate: 'Jan 15, 2026',
    endDate: 'Dec 15, 2026',
    status: 'ACTIVE' as 'ACTIVE' | 'EXTENDED' | 'TERMINATED',
    monthlyRent: 5000,
  };

  nextPayment = { month: 'March', amount: 5000, dueDate: 'March 15, 2026', daysLeft: 14 };

  stats = [
    { label: 'My Room',       value: '204',    change: 'Floor 2 · Double', positive: true,  icon: '🏠', color: 'blue'   },
    { label: 'Contract',      value: 'ACTIVE', change: 'Until Dec 2026',   positive: true,  icon: '📋', color: 'green'  },
    { label: 'Next Payment',  value: '₱5,000', change: 'Due Mar 15, 2026', positive: false, icon: '💳', color: 'orange' },
    { label: 'My Complaints', value: 2,        change: '1 in progress',    positive: false, icon: '🔧', color: 'yellow' },
  ];

  recentActivity: StudentActivity[] = [
    { message: 'Your February payment was confirmed.',          time: '2 days ago',  icon: '✅' },
    { message: 'Complaint #3 status changed to Resolved.',      time: '5 days ago',  icon: '🔧' },
    { message: 'Contract renewed — valid until Dec 2026.',      time: '2 weeks ago', icon: '📋' },
    { message: 'Your dorm application was accepted.',           time: '1 month ago', icon: '🎉' },
    { message: 'Welcome to DormMS — Room 204 assigned.',        time: 'Jan 15, 2026',icon: '🏠' },
  ];

  importantContacts = [
    { label: 'Dorm Admin',        value: 'admin@dorms.edu',    icon: '📧' },
    { label: 'Maintenance',       value: '+63 917 000 1234',   icon: '📞' },
    { label: 'Emergency',         value: '+63 917 000 9999',   icon: '🚨' },
    { label: 'Office Hours',      value: 'Mon–Fri, 8am–5pm',  icon: '🕗' },
  ];

  // ── Profile ───────────────────────────────────────────────────────
  profileForm = {
    name: 'Maria Santos',
    email: 'maria.santos@university.edu',
    mobile: '+63 912 345 6789',
    studentId: '2024-12345',
    course: 'BS Computer Science',
    university: 'Mapúa Malayan Colleges Mindanao',
  };
  profileMsg = '';
  profileErr = false;

  // ── Documents ─────────────────────────────────────────────────────
  documents: DocumentItem[] = [
    { name: 'Enrollment Certificate', icon: '📜', uploaded: true,  date: 'Jan 10, 2026', required: true  },
    { name: 'Student ID',             icon: '🪪', uploaded: true,  date: 'Jan 10, 2026', required: true  },
    { name: 'Residence Card',         icon: '🏠', uploaded: false, date: '',              required: true  },
    { name: 'Passport / Valid ID',    icon: '🛂', uploaded: true,  date: 'Jan 10, 2026', required: false },
  ];
  docMsg = '';

  // ── Applications ──────────────────────────────────────────────────
  applications: Application[] = [];
  appsLoading = false;
  appsError = '';
  showAppForm = false;
  newAppDate = '';
  appMsg = '';
  appErr = false;

  // ── Complaints ────────────────────────────────────────────────────
  complaints: Complaint[] = [];
  complaintsLoading = false;
  complaintsError = '';
  showComplaintForm = false;
  newComplaintTitle = '';
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

  constructor(private router: Router, private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    // Seed name/email from localStorage immediately (fast)
    const savedName  = this.auth.getName()  ?? 'Student';
    const savedEmail = this.auth.getEmail() ?? '';
    this.student.name    = savedName;
    this.student.initials = savedName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    this.profileForm.name  = savedName;
    this.profileForm.email = savedEmail;

    // Then load full data from API
    this.loadProfile();
    this.loadMyContract();
    this.loadComplaints();
  }

  // ── Load profile from API ─────────────────────────────────────────
  loadProfile(): void {
    this.api.getProfile().subscribe({
      next: (data) => {
        // Update student display info
        this.student.name    = data.name ?? this.student.name;
        this.student.email   = data.email ?? this.student.email;
        this.student.initials = this.student.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

        // Parse academic_details (stored as JSON string or plain text)
        let academic: any = {};
        try { academic = JSON.parse(data.academic_details ?? '{}'); } catch { academic = {}; }

        this.student.studentId  = academic.studentId  ?? this.student.studentId;
        this.student.course     = academic.course     ?? data.academic_details ?? this.student.course;
        this.student.university = academic.university ?? this.student.university;

        // Room info from student_profiles
        if (data.room_information) {
          this.roomInfo.number = data.room_information.replace(/\D/g, '') || this.roomInfo.number;
          this.stats[0].value  = data.room_information;
        }

        // Pre-fill profile form
        this.profileForm.name       = data.name ?? '';
        this.profileForm.email      = data.email ?? '';
        this.profileForm.studentId  = academic.studentId  ?? this.profileForm.studentId;
        this.profileForm.course     = academic.course     ?? data.academic_details ?? this.profileForm.course;
        this.profileForm.university = academic.university ?? this.profileForm.university;
      },
      error: () => {} // keep demo values on error
    });
  }

  // ── Load own contract from API ────────────────────────────────────
  loadMyContract(): void {
    this.api.getContracts().subscribe({
      next: (data) => {
        if (!data) return; // no contract yet
        this.contractInfo.contractId = `CTR-${String(data.contract_id).padStart(3, '0')}`;
        this.contractInfo.status     = data.status ?? 'ACTIVE';
        if (data.start_date) this.contractInfo.startDate = new Date(data.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (data.end_date)   this.contractInfo.endDate   = new Date(data.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        // Update overview stat cards
        this.stats[1].value  = this.contractInfo.status;
        this.stats[1].change = `Until ${this.contractInfo.endDate}`;
      },
      error: () => {} // keep demo values on error
    });
  }

  get pageName(): string {
    return this.navItems.find(n => n.id === this.activeNav)?.label ?? 'Overview';
  }

  setActive(id: string): void {
    this.activeNav = id;
    if (id === 'apply')      this.loadApplications();
    if (id === 'complaints') this.loadComplaints();
    if (id === 'payments')   this.loadPayments();
    if (id === 'contract')   this.loadMyContract();
    if (id === 'profile')    this.loadProfile();
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

  // ── Profile ───────────────────────────────────────────────────────
  saveProfile(): void {
    const academicJson = JSON.stringify({
      studentId:  this.profileForm.studentId,
      course:     this.profileForm.course,
      university: this.profileForm.university,
    });

    this.api.updateProfile({
      name:             this.profileForm.name,
      email:            this.profileForm.email,
      academic_details: academicJson,
    }).subscribe({
      next: () => {
        Object.assign(this.student, this.profileForm);
        this.student.initials = this.profileForm.name
          .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        this.profileMsg = 'Profile updated successfully!';
        this.profileErr = false;
        setTimeout(() => (this.profileMsg = ''), 3000);
      },
      error: () => {
        // Fallback: apply locally even if API is offline
        Object.assign(this.student, this.profileForm);
        this.student.initials = this.profileForm.name
          .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        this.profileMsg = 'Profile saved locally (backend offline).';
        this.profileErr = false;
        setTimeout(() => (this.profileMsg = ''), 3000);
      },
    });
  }

  // ── Documents ─────────────────────────────────────────────────────
  simulateUpload(doc: DocumentItem): void {
    doc.uploaded = true;
    doc.date = 'Mar 1, 2026';
    this.docMsg = `${doc.name} uploaded successfully!`;
    setTimeout(() => (this.docMsg = ''), 3000);
  }

  get uploadedCount(): number { return this.documents.filter(d => d.uploaded).length; }
  get requiredUploaded(): number { return this.documents.filter(d => d.required && d.uploaded).length; }
  get requiredCount(): number  { return this.documents.filter(d => d.required).length; }

  // ── Applications ──────────────────────────────────────────────────
  loadApplications(): void {
    this.appsLoading = true;
    this.appsError = '';
    this.api.getApplications().subscribe({
      next: (data) => { this.applications = data; this.appsLoading = false; },
      error: () => {
        this.appsError = 'Could not load applications. Make sure the backend is running on port 3000.';
        this.appsLoading = false;
      },
    });
  }

  submitApplication(): void {
    if (!this.newAppDate) { this.appMsg = 'Please select a preferred start date.'; this.appErr = true; return; }
    this.api.submitApplication(this.newAppDate).subscribe({
      next: () => {
        this.appMsg = 'Application submitted! We will review it shortly.';
        this.appErr = false;
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
    this.complaintsError = '';
    this.api.getComplaints().subscribe({
      next: (data) => {
        this.complaints = data;
        this.complaintsLoading = false;
        // Update overview stat card #3
        const open = data.filter((c: any) => c.status !== 'RESOLVED').length;
        const inProgress = data.filter((c: any) => c.status === 'IN_PROGRESS').length;
        this.stats[3].value  = data.length;
        this.stats[3].change = open > 0 ? `${inProgress} in progress` : 'All resolved';
      },
      error: () => {
        this.complaintsError = 'Could not load complaints. Make sure the backend is running on port 3000.';
        this.complaintsLoading = false;
      },
    });
  }

  submitComplaint(): void {
    if (!this.newComplaint.trim()) { this.complaintMsg = 'Please describe the issue.'; this.complaintErr = true; return; }
    const fullDesc = this.newComplaintTitle.trim()
      ? `[${this.newComplaintTitle.trim()}] ${this.newComplaint.trim()}`
      : this.newComplaint.trim();
    this.api.submitComplaint(fullDesc).subscribe({
      next: () => {
        this.complaintMsg = 'Complaint submitted! Our team will respond shortly.';
        this.complaintErr = false;
        this.newComplaintTitle = '';
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
        this.paymentsError = 'Could not load payments. Make sure the backend is running on port 3000.';
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
        this.paymentMsg = `Payment of ₱${amt} for ${this.paymentMonth} submitted successfully!`;
        this.paymentErr = false;
        this.paymentMonth = '';
        this.paymentAmount = null;
        this.paymentLoading = false;
        this.loadPayments();
      },
      error: () => {
        this.paymentMsg = 'Failed to submit payment. Please try again.';
        this.paymentErr = true;
        this.paymentLoading = false;
      },
    });
  }

  // ── Report ────────────────────────────────────────────────────────
  generateReport(): void {
    this.reportLoading = true;
    this.api.generateReport().subscribe({
      next: () => {
        this.reportMsg = 'Your payment history report has been generated!';
        this.reportErr = false;
        this.reportLoading = false;
      },
      error: () => {
        this.reportMsg = 'Failed to generate report. Please try again.';
        this.reportErr = true;
        this.reportLoading = false;
      },
    });
  }
}
