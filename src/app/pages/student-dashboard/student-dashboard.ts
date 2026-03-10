import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
    { id: 'profile',    label: 'Profile',     icon: 'user.svg'          },
    { id: 'documents',  label: 'Documents',   icon: 'document.svg'      },
    { id: 'contract',   label: 'My Contract', icon: 'clipboard-list.svg'},
    { id: 'payments',   label: 'Payments',    icon: 'credit-card.svg'   },
    { id: 'complaints', label: 'Complaints',  icon: 'wrench.svg'        },
    { id: 'apply',      label: 'Apply',       icon: 'home.svg'          },
  ];

  // ── Student identity ───────────────────────────────────────────────
  student = {
    name: 'Student', email: '', mobile: '', studentId: '',
    course: '', university: '', initials: 'S',
    dormitoryName: '', dormContactEmail: '', dormContactPhone: '',
  };

  // ── Room & contract ────────────────────────────────────────────────
  roomInfo = { number: '—', floor: 0, type: '—' };

  contractInfo = {
    contractId: '—', startDate: '—', endDate: '—',
    status: 'ACTIVE' as 'ACTIVE' | 'EXTENDED' | 'TERMINATED',
    monthlyRent: 0, dueDay: 15,
    hasGeneratedDoc: false, hasSignedDoc: false,
  };

  // ── Contract upload ────────────────────────────────────────────────
  signedContractFile: File | null = null;
  contractUploadMsg  = '';
  contractUploadErr  = false;
  contractUploading  = false;

  nextPayment = { month: '—', amount: 5000, dueDate: '—', daysLeft: 0 };

  stats = [
    { label: 'My Room',       value: '—', change: 'Not assigned', positive: false, icon: 'home.svg',           color: 'blue'   },
    { label: 'Contract',      value: '—', change: '—',            positive: false, icon: 'clipboard-list.svg', color: 'green'  },
    { label: 'Next Payment',  value: '—', change: '—',            positive: false, icon: 'credit-card.svg',    color: 'orange' },
    { label: 'My Complaints', value: 0,   change: '—',            positive: true,  icon: 'wrench.svg',         color: 'yellow' },
  ];

  recentActivity: StudentActivity[] = [];

  importantContacts = [
    { label: 'Dorm Admin',   value: '—',                icon: 'envelope.svg'           },
    { label: 'Maintenance',  value: '+63 917 000 1234', icon: 'phone.svg'              },
    { label: 'Emergency',    value: '+63 917 000 9999', icon: 'exclamation-circle.svg' },
    { label: 'Office Hours', value: 'Mon–Fri, 8am–5pm', icon: 'clock.svg'             },
  ];

  // ── Profile form ──────────────────────────────────────────────────
  profileForm = { name: '', email: '', mobile: '', studentId: '', course: '', university: '' };
  profileMsg  = '';
  profileErr  = false;

  docMsg = '';

  // ── Applications ──────────────────────────────────────────────────
  applications: Application[] = [];
  appsLoading   = false;
  appsError     = '';
  showAppForm   = false;
  newAppDate    = '';
  appMsg        = '';
  appErr        = false;
  appLoading    = false;

  // ── File upload (apply form) ──────────────────────────────────────
  checklistItems = [
    { name: 'Enrollment Certificate', required: true,  icon: 'document-text.svg',  file: null as File | null },
    { name: 'Student ID',             required: true,  icon: 'identification.svg', file: null as File | null },
    { name: 'Passport / Valid ID',    required: true,  icon: 'identification.svg', file: null as File | null },
    { name: 'Residence Card',         required: false, icon: 'home.svg',           file: null as File | null },
  ];
  extraFiles: File[] = [];

  // ── Documents (uploaded files from API) ───────────────────────────
  appFiles:    any[] = [];
  filesLoading = false;
  filesError   = '';

  // ── Complaints ────────────────────────────────────────────────────
  complaints:       Complaint[] = [];
  complaintsLoading = false;
  complaintsError   = '';
  showComplaintForm = false;
  newComplaintTitle = '';
  newComplaint      = '';
  complaintMsg      = '';
  complaintErr      = false;

  // ── Payments ──────────────────────────────────────────────────────
  months         = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  paymentMonth   = '';
  paymentAmount: number | null = null;
  paymentReceipt: File | null  = null;
  paymentMsg     = '';
  paymentErr     = false;
  paymentLoading = false;
  payments:       any[] = [];
  paymentsLoading = false;
  paymentsError   = '';

  // ── Overdue payments ──────────────────────────────────────────────
  overdueInfo: { months: string[]; total: number } = { months: [], total: 0 };

  // ── Report modal ──────────────────────────────────────────────────
  reportModal = {
    open: false, reportId: 0, progressId: 0,
    percentage: 0, status: '',
    pollInterval: null as ReturnType<typeof setInterval> | null,
  };

  // ── Complaint dialog ──────────────────────────────────────────────
  complaintDialog = {
    open: false,
    phase: 'confirm' as 'confirm' | 'result',
    success: false,
    title: '',
    descriptionPreview: '',
    fullDesc: '',
  };

  constructor(
    private router: Router,
    private api: ApiService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const savedName  = this.auth.getName()  ?? 'Student';
    const savedEmail = this.auth.getEmail() ?? '';
    this.student.name     = savedName;
    this.student.initials = savedName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    this.profileForm.name  = savedName;
    this.profileForm.email = savedEmail;

    this.loadProfile();
    this.loadMyContract();
    this.loadComplaints();
    this.loadApplications();
    this.loadPayments();
    this.loadMyFiles();
    this.loadOverduePayments();
  }

  // ── Profile ───────────────────────────────────────────────────────
  loadProfile(): void {
    this.api.getProfile().subscribe({
      next: (data) => {
        this.student.name     = data.name  ?? this.student.name;
        this.student.email    = data.email ?? this.student.email;
        this.student.initials = this.student.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
        this.student.mobile   = data.phone ?? '';
        this.student.studentId        = data.student_id_number ?? '';
        this.student.course           = data.course      ?? '';
        this.student.university       = data.university  ?? '';
        this.student.dormitoryName    = data.dormitory_name    ?? '';
        this.student.dormContactEmail = data.dorm_contact_email ?? '';
        this.student.dormContactPhone = data.dorm_contact_phone ?? '';

        if (data.room_number) {
          this.roomInfo.number   = data.room_number;
          this.roomInfo.floor    = data.floor ?? 0;
          this.roomInfo.type     = data.room_type ?? '—';
          this.stats[0].value    = data.room_number;
          this.stats[0].change   = `Floor ${data.floor ?? '—'} · ${data.room_type ?? '—'}`;
          this.stats[0].positive = true;
        }
        if (data.dorm_contact_email) this.importantContacts[0].value = data.dorm_contact_email;
        if (data.dorm_contact_phone) this.importantContacts[1].value = data.dorm_contact_phone;

        this.profileForm.name       = data.name              ?? '';
        this.profileForm.email      = data.email             ?? '';
        this.profileForm.mobile     = data.phone             ?? '';
        this.profileForm.studentId  = data.student_id_number ?? '';
        this.profileForm.course     = data.course            ?? '';
        this.profileForm.university = data.university        ?? '';
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  // ── Contract ──────────────────────────────────────────────────────
  loadMyContract(): void {
    this.api.getContracts().subscribe({
      next: (data) => {
        if (!data) return;
        this.contractInfo.contractId      = `CTR-${String(data.contract_id).padStart(3, '0')}`;
        this.contractInfo.status          = data.status ?? 'ACTIVE';
        this.contractInfo.monthlyRent     = Number(data.monthly_rent) || 0;
        this.contractInfo.dueDay          = data.due_day ?? 15;
        this.contractInfo.hasGeneratedDoc = !!data.generated_doc_path;
        this.contractInfo.hasSignedDoc    = !!data.signed_doc_path;

        if (data.start_date)
          this.contractInfo.startDate = new Date(data.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (data.end_date)
          this.contractInfo.endDate = new Date(data.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        if (data.room_number && this.roomInfo.number === '—') {
          this.roomInfo.number   = data.room_number;
          this.stats[0].value    = data.room_number;
          this.stats[0].positive = true;
        }

        this.stats[1].value    = this.contractInfo.status;
        this.stats[1].change   = `Until ${this.contractInfo.endDate}`;
        this.stats[1].positive = this.contractInfo.status === 'ACTIVE';

        const now        = new Date();
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const nextDue    = new Date(now.getFullYear(), now.getMonth() + 1, this.contractInfo.dueDay || 15);
        const daysLeft   = Math.max(0, Math.ceil((nextDue.getTime() - now.getTime()) / 86400000));
        this.nextPayment = {
          month:   monthNames[nextDue.getMonth()],
          amount:  this.contractInfo.monthlyRent,
          dueDate: `${monthNames[nextDue.getMonth()]} 15, ${nextDue.getFullYear()}`,
          daysLeft,
        };
        this.stats[2].value  = `€${this.contractInfo.monthlyRent.toLocaleString()}`;
        this.stats[2].change = `Due ${this.nextPayment.dueDate}`;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  get pageName(): string {
    return this.navItems.find(n => n.id === this.activeNav)?.label ?? 'Overview';
  }

  setActive(id: string): void {
    this.activeNav = id;
    if (id === 'apply')      this.loadApplications();
    if (id === 'complaints') this.loadComplaints();
    if (id === 'payments')   { this.loadPayments(); this.loadOverduePayments(); }
    if (id === 'contract')   this.loadMyContract();
    if (id === 'profile')    this.loadProfile();
    if (id === 'documents')  this.loadMyFiles();
    if (id === 'overview')   { this.loadProfile(); this.loadMyContract(); this.loadOverduePayments(); }
  }

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }

  logout(): void { this.auth.logout(); this.router.navigate(['/login']); }

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

  // ── Profile save ──────────────────────────────────────────────────
  saveProfile(): void {
    this.api.updateProfile({
      name: this.profileForm.name, email: this.profileForm.email,
      phone: this.profileForm.mobile, student_id_number: this.profileForm.studentId,
      course: this.profileForm.course, university: this.profileForm.university,
    }).subscribe({
      next: () => {
        Object.assign(this.student, {
          name: this.profileForm.name, email: this.profileForm.email,
          mobile: this.profileForm.mobile, studentId: this.profileForm.studentId,
          course: this.profileForm.course, university: this.profileForm.university,
        });
        this.student.initials = this.profileForm.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        this.profileMsg = 'Profile updated successfully!';
        this.profileErr = false;
        this.cdr.markForCheck();
        setTimeout(() => { this.profileMsg = ''; this.cdr.markForCheck(); }, 3000);
      },
      error: (err: any) => {
        this.profileMsg = err?.error?.message ?? 'Failed to update profile.';
        this.profileErr = true;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Documents ─────────────────────────────────────────────────────
  loadMyFiles(): void {
    this.filesLoading = true;
    this.filesError   = '';
    this.api.getMyFiles().subscribe({
      next: (data) => {
        this.appFiles     = data;
        this.filesLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.filesError   = 'Could not load documents. Make sure the backend is running.';
        this.filesLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  downloadFile(fileId: number, storedName: string): void {
    this.api.downloadFile(fileId).subscribe({
      next: (blob) => {
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = storedName;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => { this.docMsg = 'Download failed. Please try again.'; this.cdr.markForCheck(); },
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  fileIcon(mimeType: string): string {
    if (mimeType?.includes('pdf'))   return 'document-text.svg';
    if (mimeType?.includes('image')) return 'identification.svg';
    return 'document.svg';
  }

  // ── File picker (apply form) ───────────────────────────────────────
  onChecklistFileSelect(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.checklistItems[index].file = input.files[0];
    input.value = '';
    this.cdr.markForCheck();
  }

  removeChecklistFile(index: number): void {
    this.checklistItems[index].file = null;
    this.cdr.markForCheck();
  }

  onExtraFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const existing = new Set(this.extraFiles.map(f => f.name));
    Array.from(input.files).filter(f => !existing.has(f.name)).forEach(f => this.extraFiles.push(f));
    input.value = '';
    this.cdr.markForCheck();
  }

  removeExtraFile(index: number): void {
    this.extraFiles.splice(index, 1);
    this.cdr.markForCheck();
  }

  get paymentSummary() {
    const sorted = [...this.payments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const last       = sorted[0] ?? null;
    const totalPaid  = this.payments.reduce((s, p) => s + Number(p.amount), 0);
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const currentMonth = monthNames[new Date().getMonth()];
    const thisMonthPayment = this.payments.find(p => p.month === currentMonth);
    return { last, totalPaid, currentMonth, thisMonthPayment };
  }

  get allSelectedFiles(): File[] {
    return [...this.checklistItems.filter(i => i.file).map(i => i.file!), ...this.extraFiles];
  }

  get checklistDoneCount(): number {
    return this.checklistItems.filter(i => i.file).length;
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
        this.appsError   = 'Could not load applications. Make sure the backend is running on port 3000.';
        this.appsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  submitApplication(): void {
    if (!this.newAppDate) { this.appMsg = 'Please select a preferred start date.'; this.appErr = true; return; }
    this.appLoading = true;
    const filesToUpload = this.allSelectedFiles;
    this.api.submitApplication(this.newAppDate).subscribe({
      next: (res) => {
        const appId = res.applicationId;
        const resetForm = () => {
          this.newAppDate  = '';
          this.showAppForm = false;
          this.checklistItems.forEach(i => i.file = null);
          this.extraFiles  = [];
          this.appLoading  = false;
          this.cdr.markForCheck();
          this.loadApplications();
        };

        if (filesToUpload.length > 0) {
          this.api.uploadApplicationFiles(appId, filesToUpload).subscribe({
            next: (uploadRes) => {
              this.appMsg = `Application submitted with ${uploadRes.count} file(s) uploaded!`;
              this.appErr = false;
              resetForm();
            },
            error: () => {
              this.appMsg = 'Application submitted but file upload failed. Try uploading from Documents.';
              this.appErr = false;
              resetForm();
            },
          });
        } else {
          this.appMsg = 'Application submitted! We will review it shortly.';
          this.appErr = false;
          resetForm();
        }
      },
      error: () => {
        this.appMsg     = 'Failed to submit. Please try again.';
        this.appErr     = true;
        this.appLoading = false;
        this.cdr.markForCheck();
      },
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
        const open       = data.filter((c: any) => c.status !== 'RESOLVED').length;
        const inProgress = data.filter((c: any) => c.status === 'IN_PROGRESS').length;
        this.stats[3].value    = data.length;
        this.stats[3].change   = open > 0 ? `${inProgress} in progress` : 'All resolved';
        this.stats[3].positive = open === 0;
        this.recentActivity = data.slice(0, 5).map((c: any) => ({
          message: `Complaint #${c.complaint_id} — ${c.status.replace('_', ' ').toLowerCase()}`,
          time:    this.timeAgo(c.created_at),
          icon:    c.status === 'RESOLVED' ? 'check-circle.svg' : 'wrench.svg',
        }));
        this.cdr.markForCheck();
      },
      error: () => {
        this.complaintsError   = 'Could not load complaints. Make sure the backend is running on port 3000.';
        this.complaintsLoading = false;
        this.cdr.markForCheck();
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

  openComplaintDialog(): void {
    if (!this.newComplaint.trim()) { this.complaintMsg = 'Please describe the issue.'; this.complaintErr = true; return; }

    const fullDesc = this.newComplaintTitle.trim()
      ? `[${this.newComplaintTitle.trim()}] ${this.newComplaint.trim()}`
      : this.newComplaint.trim();
    const preview = this.newComplaint.trim().length > 120
      ? this.newComplaint.trim().slice(0, 120) + '…'
      : this.newComplaint.trim();

    this.complaintDialog = {
      open: true, phase: 'confirm', success: false,
      title:              this.newComplaintTitle.trim() || '(no title)',
      descriptionPreview: preview,
      fullDesc,
    };
    this.cdr.markForCheck();
  }

  confirmSubmitComplaint(): void {
    this.api.submitComplaint(this.complaintDialog.fullDesc).subscribe({
      next: () => {
        this.complaintDialog.phase   = 'result';
        this.complaintDialog.success = true;
        this.newComplaintTitle = '';
        this.newComplaint      = '';
        this.showComplaintForm = false;
        this.complaintMsg      = '';
        this.cdr.markForCheck();
        this.loadComplaints();
      },
      error: () => {
        this.complaintDialog.phase   = 'result';
        this.complaintDialog.success = false;
        this.cdr.markForCheck();
      },
    });
  }

  closeComplaintDialog(): void {
    this.complaintDialog.open = false;
    this.cdr.markForCheck();
  }

  // ── Overdue check ─────────────────────────────────────────────────
  loadOverduePayments(): void {
    this.api.getOverduePayments().subscribe({
      next: (data) => {
        this.overdueInfo = { months: data.overdueMonths, total: data.totalOverdue };
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  // ── Payments ──────────────────────────────────────────────────────
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
        this.paymentsError   = 'Could not load payments. Make sure the backend is running on port 3000.';
        this.paymentsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Contract download / signed upload ─────────────────────────────
  downloadContract(): void {
    this.api.downloadContract().subscribe({
      next: (blob) => {
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = 'dormitory-contract.pdf';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.contractUploadMsg = 'Contract not available yet. Contact the admin.';
        this.contractUploadErr = true;
        this.cdr.markForCheck();
      },
    });
  }

  onSignedContractSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.signedContractFile = input.files[0];
      input.value = '';
      this.cdr.markForCheck();
    }
  }

  removeSignedContract(): void {
    this.signedContractFile = null;
    this.cdr.markForCheck();
  }

  uploadSignedContract(): void {
    if (!this.signedContractFile) {
      this.contractUploadMsg = 'Please select a PDF file to upload.';
      this.contractUploadErr = true;
      this.cdr.markForCheck();
      return;
    }
    this.contractUploading = true;
    this.api.uploadSignedContract(this.signedContractFile).subscribe({
      next: () => {
        this.contractUploadMsg    = 'Signed contract uploaded successfully!';
        this.contractUploadErr    = false;
        this.signedContractFile   = null;
        this.contractUploading    = false;
        this.contractInfo.hasSignedDoc = true;
        this.cdr.markForCheck();
        setTimeout(() => { this.contractUploadMsg = ''; this.cdr.markForCheck(); }, 4000);
      },
      error: () => {
        this.contractUploadMsg = 'Upload failed. Please try again.';
        this.contractUploadErr = true;
        this.contractUploading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onReceiptSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.paymentReceipt = input.files[0];
      input.value = '';
      this.cdr.markForCheck();
    }
  }

  removeReceipt(): void {
    this.paymentReceipt = null;
    this.cdr.markForCheck();
  }

  recordPayment(): void {
    if (!this.paymentMonth || !this.paymentAmount) {
      this.paymentMsg = 'Please fill in all payment fields.';
      this.paymentErr = true;
      return;
    }
    if (!this.paymentReceipt) {
      this.paymentMsg = 'Please attach a receipt file.';
      this.paymentErr = true;
      return;
    }
    this.paymentLoading = true;
    this.api.recordPayment(this.paymentMonth, this.paymentAmount, this.paymentReceipt).subscribe({
      next: () => {
        const amt           = this.paymentAmount?.toLocaleString();
        this.paymentMsg     = `Payment of €${amt} for ${this.paymentMonth} submitted!`;
        this.paymentErr     = false;
        this.paymentMonth   = '';
        this.paymentAmount  = null;
        this.paymentReceipt = null;
        this.paymentLoading = false;
        this.cdr.markForCheck();
        this.loadPayments();
      },
      error: () => {
        this.paymentMsg     = 'Failed to submit payment. Please try again.';
        this.paymentErr     = true;
        this.paymentLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ── Report modal ──────────────────────────────────────────────────
  generateReport(): void {
    this.reportModal = { open: true, reportId: 0, progressId: 0, percentage: 0, status: 'PENDING', pollInterval: null };
    this.cdr.markForCheck();
    this.api.generateReport().subscribe({
      next: (res) => {
        this.reportModal.reportId   = res.reportId;
        this.reportModal.progressId = res.progressId;
        this.cdr.markForCheck();
        this.reportModal.pollInterval = setInterval(() => this.pollReportProgress(), 600);
      },
      error: () => {
        this.reportModal.status = 'FAILED';
        this.cdr.markForCheck();
      },
    });
  }

  pollReportProgress(): void {
    this.api.getReportProgress(this.reportModal.reportId).subscribe({
      next: (data: any) => {
        this.reportModal.percentage = data.percentage ?? 0;
        this.reportModal.status     = data.reportStatus; // server returns reportStatus, not status
        this.cdr.markForCheck();
        if (['COMPLETED', 'CANCELLED', 'FAILED'].includes(data.reportStatus)) {
          clearInterval(this.reportModal.pollInterval!);
          this.reportModal.pollInterval = null;
        }
      },
      error: () => {},
    });
  }

  cancelReport(): void {
    this.api.cancelReport(this.reportModal.reportId).subscribe({
      next: () => {
        this.reportModal.status = 'CANCELLED';
        if (this.reportModal.pollInterval) {
          clearInterval(this.reportModal.pollInterval);
          this.reportModal.pollInterval = null;
        }
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  closeReportModal(): void {
    if (this.reportModal.pollInterval) {
      clearInterval(this.reportModal.pollInterval);
      this.reportModal.pollInterval = null;
    }
    this.reportModal.open = false;
    this.cdr.markForCheck();
  }

  downloadGeneratedReport(): void {
    this.api.downloadReport(this.reportModal.reportId).subscribe({
      next: (blob) => {
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `payment-report-${this.reportModal.reportId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.closeReportModal();
      },
      error: () => {},
    });
  }
}
