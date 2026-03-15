# Dormitory Management System — Design Compliance Report

**Project:** Student Dormitory Management System
**Module:** Advanced Web Development — University of Hildesheim
**Reference Document:** Final Design.pdf (submitted 2026-01-27)
**Report Date:** 2026-03-15

---

## Overview

This report compares the implemented Dormitory Management System against the Final Design submission. Each design artifact — Angular architecture, data model, behavioral design, and backend design — is assessed for compliance. Items are classified as **Implemented**, **Partially Implemented**, or **Not Implemented**, with justification drawn from the actual codebase.

---

## 1. Angular Architecture — Components, Services & Modules

---

### 1.1 Components

The Final Design specifies nine distinct Angular components responsible for managing the user interface:
`AppComponent`, `NavMenuComponent`, `LoginComponent`, `StudentDashboardComponent`, `AdminDashboardComponent`, `ApplicationComponent`, `ContractComponent`, `ComplaintComponent`, `DocumentsComponent`, `ReceiptComponent`, `ProgressComponent`.

| Designed Component | Status | Implementation Notes |
|--------------------|--------|----------------------|
| **AppComponent** | Implemented | `src/app/app.ts` — root component with `RouterOutlet` shell. Matches design intent. |
| **LoginComponent** | Implemented | `src/app/pages/login/` — authentication form calling `AuthService`. Matches design. |
| **StudentDashboardComponent** | Implemented | `src/app/pages/student-dashboard/` — student self-service dashboard. Present and functional. |
| **AdminDashboardComponent** | Implemented | `src/app/pages/dashboard/` — admin dashboard. Present and functional. |
| **NavMenuComponent** | Not Implemented | Design specifies a standalone `NavMenuComponent` for menu-based navigation. In practice, sidebar navigation is embedded inside each dashboard component. No separate `NavMenuComponent` file exists. |
| **ApplicationComponent** | Not Implemented | Design specifies a dedicated `ApplicationComponent`. Application form logic lives inside `StudentDashboardComponent`. No separate component file. |
| **ContractComponent** | Not Implemented | Design specifies a dedicated `ContractComponent`. Contract display and upload logic is embedded in `StudentDashboardComponent`. |
| **ComplaintComponent** | Not Implemented | Design specifies a dedicated `ComplaintComponent`. Complaint form and list are embedded in `StudentDashboardComponent`. |
| **DocumentsComponent** | Not Implemented | Design specifies a dedicated `DocumentsComponent`. File list and download logic is embedded in `StudentDashboardComponent`. |
| **ReceiptComponent** | Not Implemented | Design specifies a dedicated `ReceiptComponent`. Receipt upload logic is embedded in `StudentDashboardComponent`. |
| **ProgressComponent** | Not Implemented | Design specifies a dedicated `ProgressComponent`. Progress bar and polling logic are embedded in `StudentDashboardComponent` via `reportModal`. |
| **RegisterComponent** *(not in design)* | Added | `src/app/pages/register/` — full student registration UI backed by `POST /api/register`. Not in design; added correctly. |
| **DashboardSectionComponent** *(not in design)* | Added | Empty stub component for Angular child routes under `/dashboard/*` and `/student-dashboard/*`. Not in design; added to support router-based navigation. |

**Summary:** 4 of 11 designed components implemented as standalone files. The remaining 7 feature components were merged into the two dashboard components — the largest structural deviation from the design.

---

### 1.2 Business Services

The Final Design specifies seven domain-specific services encapsulating business logic:
`AuthenticationService`, `ApplicationService`, `ContractService`, `ComplaintService`, `ReceiptService`, `FileService`, `ReportService`, `ProgressService`.

| Designed Service | Status | Implementation Notes |
|------------------|--------|----------------------|
| **AuthenticationService** | Partially Implemented | `AuthService` in `src/app/services/auth.service.ts` handles login, logout, JWT token storage, and role helpers (`isAdmin()`, `isStudent()`, `getRole()`). Missing: HTTP interceptor pattern for token injection (headers are set manually in `ApiService`). |
| **ApplicationService** | Not Implemented | No `ApplicationService` exists. All application API calls (`getApplications`, `submitApplication`, `uploadApplicationFiles`, `updateApplicationStatus`) are made via the monolithic `ApiService`. |
| **ContractService** | Not Implemented | No `ContractService` exists. Contract API calls (`getContracts`, `uploadSignedContract`, `downloadContract`, `updateContractStatus`) are in `ApiService`. |
| **ComplaintService** | Not Implemented | No `ComplaintService` exists. Complaint API calls (`getComplaints`, `submitComplaint`, `updateComplaintStatus`) are in `ApiService`. |
| **ReceiptService** | Not Implemented | No `ReceiptService` exists. Payment and receipt API calls (`recordPayment`, `getPayments`, `verifyPayment`, `downloadReceipt`) are in `ApiService`. |
| **FileService** | Not Implemented | No `FileService` exists. File upload and download calls (`uploadApplicationFiles`, `downloadFile`, `getMyFiles`) are in `ApiService`. |
| **ReportService** | Not Implemented | No `ReportService` exists. Report generation, progress polling, and download calls are in `ApiService`. |
| **ProgressService** | Not Implemented | No `ProgressService` exists. Progress polling logic (`setInterval`) is embedded directly in `StudentDashboardComponent` within the `reportModal` handler. |
| **ApiService** *(not in design)* | Added | `src/app/services/api.service.ts` — monolithic service consolidating all 30+ API calls. Not in design, which specified separate domain services. |
| **NotificationService** *(not in design)* | Added | `src/app/services/notification.service.ts` — handles SSE connection, bell notifications, and toast pop-ups. Not in design; added as an extra feature. |

**Summary:** 1 of 8 designed services partially implemented as designed. The domain-separation intended by the design is absent — a single `ApiService` handles all backend communication.

---

### 1.3 Infrastructure Services (Route Guards)

The Final Design explicitly specifies two infrastructure guards: `AuthGuard` and `RoleGuard`.

| Designed Guard | Status | Implementation Notes |
|----------------|--------|----------------------|
| **AuthGuard** | Implemented | `src/app/guards/auth.guard.ts` — functional `CanActivateFn` guard. Checks `AuthService.isLoggedIn()`. Redirects unauthenticated users to `/login`. Applied to both `/dashboard` and `/student-dashboard`. Matches design intent exactly. |
| **RoleGuard** | Implemented | `src/app/guards/role.guard.ts` — functional `CanActivateFn` guard. Reads `route.data['role']`, compares to `AuthService.getRole()`. Redirects wrong-role users to their correct dashboard. Matches design intent exactly. |

**Summary:** Both designed guards are fully implemented.

---

### 1.4 Angular Modules

The Final Design specifies four NgModules structuring the application: `AppModule`, `CoreModule`, `StudentModule`, `AdminModule`.

| Designed Module | Status | Implementation Notes |
|-----------------|--------|----------------------|
| **AppModule** | Not Implemented | Angular 21 standalone components are used, bootstrapped via `bootstrapApplication()` in `main.ts`. No NgModule-based `AppModule` exists. This is an accepted and recommended modern Angular 17+ pattern, though it deviates from the design specification. |
| **CoreModule** | Not Implemented | No `CoreModule`. Shared services (`AuthService`, `ApiService`, `NotificationService`) are provided at root via `@Injectable({ providedIn: 'root' })`. Achieves the same singleton scope. |
| **StudentModule** | Not Implemented | No `StudentModule`. `StudentDashboardComponent` is a standalone component with its own `imports: [CommonModule, FormsModule, RouterOutlet]`. |
| **AdminModule** | Not Implemented | No `AdminModule`. `DashboardComponent` is a standalone component with its own imports. |

**Summary:** 0 of 4 NgModules implemented. The standalone component pattern used is modern and valid, but deviates from the NgModule-based design. Functionality is equivalent.

---

## 2. Data Model — Entities and Relationships

---

### 2.1 Entity Compliance

The Final Design specifies eight core entities: `User`, `StudentProfile`, `DormApplication`, `Contract`, `RentPayment`, `Complaint`, `Report`, `FileMetadata`.

| Designed Entity | Status | Implementation Notes |
|-----------------|--------|----------------------|
| **User** | Implemented | `users` table: `user_id`, `name`, `email`, `password_hash`, `role ENUM('STUDENT','ADMIN')`, `dormitory_id`. Matches all designed attributes. `dormitory_id` is an addition beyond the single-dormitory design scope. |
| **StudentProfile** | Implemented | `student_profiles` table: `profile_id`, `user_id`, `room_id`, `phone`, `student_id_number`, `course`, `university`, `application_status`. Maps to designed attributes (`academicDetails`, `roomInformation`, `applicationStatus`). |
| **DormApplication** | Implemented | `dorm_applications` table: `application_id`, `user_id`, `submission_date`, `status ENUM('PENDING','ACCEPTED','REJECTED')`, `assigned_room_id`. Matches design. Additions: `application_type`, `remarks`, `dormitory_id`. |
| **Contract** | Implemented | `contracts` table: `contract_id`, `user_id`, `room_id`, `start_date`, `end_date`, `status ENUM('ACTIVE','EXTENDED','TERMINATED')`. Matches design. Additions: `monthly_rent`, `due_day`, `generated_doc_file_id`, `signed_document_file_id`, `termination_reason`. |
| **RentPayment** | Implemented | `rent_payments` table: `payment_id`, `user_id`, `month`, `amount`, `receipt_path`, `created_at`. Matches design fields. Addition: `verification_status ENUM('PENDING_VERIFICATION','VERIFIED','REJECTED')`. |
| **Complaint** | Implemented | `complaints` table: `complaint_id`, `user_id`, `description`, `status ENUM('SUBMITTED','IN_PROGRESS','RESOLVED')`, `created_at`. Matches design exactly. |
| **Report** | Implemented | `reports` table: `report_id`, `user_id`, `file_path`, `created_at`. Matches core design fields. Additions: `status`, `progress_id`, `report_source ENUM('ADMIN','STUDENT')`. |
| **FileMetadata** | Implemented | `file_metadata` table: `file_id`, `file_path`, `file_type`, `upload_date`. Matches design. Additions: `application_id`, `user_id` for ownership tracking. |
| **dormitories** *(not in design)* | Added | Multi-dormitory support table. Contains `name`, `address`, `contact_email`, `contact_phone`, `max_capacity`, notification preference flags. Not in original single-dormitory design. |
| **rooms** *(not in design)* | Added | `rooms` table: `room_id`, `room_number`, `floor`, `type`, `status ENUM('occupied','vacant','maintenance')`, `resident_id`. Rooms were implicit in the design but not a separate entity. |
| **termination_requests** *(not in design)* | Added | Student-initiated contract termination request table. Not in original design. |
| **notifications** *(not in design)* | Added | Real-time SSE notification storage. Not in original design. |
| **progress** *(not in design)* | Added | Backend long-running task progress tracking in DB. Design tracked progress in-memory; DB table is an addition. |
| **admin_profiles** *(not in design)* | Added | Admin profile table: `user_id`, `dormitory_id`, `position`, `phone`. Not in original design. Added for admin profile management. |

---

### 2.2 Relationship Compliance

| Designed Relationship | Status | Notes |
|-----------------------|--------|-------|
| User has exactly one role (STUDENT or ADMIN) | Implemented | `role ENUM` column on `users`. Enforced by `requireRole()` middleware on all protected endpoints. |
| User (STUDENT) has 0..1 StudentProfile | Implemented | `student_profiles.user_id` FK. One profile per student, inserted at registration. |
| User (STUDENT) can submit many DormApplications | Implemented | `dorm_applications.user_id` FK. Multiple applications per student supported. |
| User (STUDENT) has at most one active Contract | Implemented | Enforced via transactional `PATCH /api/applications/:id/status` — checks for existing active contract before creating a new one. |
| User (STUDENT) has many RentPayments | Implemented | `rent_payments.user_id` FK. Multiple payments per student allowed. |
| User (STUDENT) has many Complaints | Implemented | `complaints.user_id` FK. Multiple complaints per student allowed. |
| User can generate many Reports | Implemented | `reports.user_id` FK. Multiple reports per user supported. |
| DormApplication, Contract, RentPayment reference FileMetadata | Implemented | `file_metadata.application_id` for application documents. `contracts.generated_doc_file_id` and `signed_document_file_id` FK to `file_metadata`. `rent_payments.receipt_path` stores receipt reference. |

**Summary:** All 8 designed relationships are correctly implemented.

---

## 3. Behavioral Design — Sequence Diagrams

The Final Design includes six sequence diagrams covering core workflows.

---

### 3.1 Login Scenario

**Design:** `LoginComponent` → `AuthenticationService` → backend → role check via `AuthGuard`/`RoleGuard` → redirect to correct dashboard.

| Status | Implemented |
|--------|------------|
| **Compliance** | The implemented login flow matches the design exactly. `LoginComponent` calls `AuthService.login()` → `POST /api/login` → JWT stored in localStorage → `authGuard` and `roleGuard` applied via `canActivate` on both dashboard routes → redirected to `/dashboard` (ADMIN) or `/student-dashboard` (STUDENT). |

---

### 3.2 Application Submission Scenario

**Design:** `ApplicationComponent` → `FileService` (upload docs) → `ApplicationService` (submit) → confirmation displayed.

| Status | Partially Implemented |
|--------|----------------------|
| **Compliance** | The workflow is fully functional but deviates structurally. Application logic is inside `StudentDashboardComponent` (not a separate `ApplicationComponent`). File upload is via `ApiService.uploadApplicationFiles()` (not a separate `FileService`). Application submission is via `ApiService.submitApplication()` (not a separate `ApplicationService`). Confirmation is shown via `appMsg`. The sequence of actions matches; the component/service decomposition does not. |

---

### 3.3 Application Review & Decision Scenario

**Design:** `AdminDashboardComponent` → `ApplicationService` → backend retrieves pending apps → admin accepts/rejects → persisted.

| Status | Implemented |
|--------|------------|
| **Compliance** | Admin dashboard fetches applications via `ApiService.getApplications()`. Accept flow opens `acceptDialog` modal → `PATCH /api/applications/:id/status` with transactional room assignment. Reject flow opens `rejectDialog` → same endpoint with `REJECTED` status and remarks. Matches design workflow; `ApplicationService` is absent (replaced by `ApiService`). |

---

### 3.4 Complaint Submission & Processing Scenario

**Design:** `ComplaintComponent` → `ComplaintService` → backend stores complaint → admin manages via `AdminDashboardComponent` → `ComplaintService` updates status.

| Status | Implemented |
|--------|------------|
| **Compliance** | Complaint form is in `StudentDashboardComponent` (not a separate `ComplaintComponent`). `complaintDialog` confirms before API call. `ApiService.submitComplaint()` hits `POST /api/complaints`. Admin manages via `PATCH /api/complaints/:id/status`. Workflow matches; service decomposition does not. |

---

### 3.5 Rent Payment Receipt Upload & Download Scenario

**Design:** `ReceiptComponent` → `FileService` (upload) → backend stores receipt → `ReceiptService` creates payment record → students/admins can download.

| Status | Implemented |
|--------|------------|
| **Compliance** | Receipt upload is in `StudentDashboardComponent` (not a separate `ReceiptComponent`). `ApiService.recordPayment()` posts receipt via `FormData` to `POST /api/payments`. Admin downloads via `GET /api/payments/:id/receipt`. Workflow matches; service/component decomposition does not. |

---

### 3.6 Rent Payment Report Generation with Progress Scenario

**Design:** Dashboard → `ReportService` → backend starts long-running task → `ProgressService` polls progress → `ProgressComponent` displays indicators → download when complete.

| Status | Implemented |
|--------|------------|
| **Compliance** | This workflow matches the design most closely. `reportModal` in `StudentDashboardComponent` triggers `ApiService.generateReport()` → `POST /api/reports` → `setImmediate()` starts async generation → `setInterval()` polls `GET /api/reports/:id/progress` every 600ms → progress bar updated → download available on COMPLETED. The `ReportService` and `ProgressService` separation is absent, but the technical pattern (async backend + polling frontend) is correct. |

**Summary:** All 6 designed workflows are implemented end-to-end. Structural deviation (merged components/services) does not affect functional correctness.

---

## 4. Backend Design

---

### 4.1 Technology Compliance

| Design Element | Status | Implementation Notes |
|----------------|--------|----------------------|
| **Node.js + Express.js REST API** | Implemented | `server.js` — single-file Express app on port 3000. 40+ REST endpoints with `authMiddleware` and `requireRole()`. Matches design. |
| **MySQL relational database** | Implemented | `mysql2` driver. `dorm_management` database. All 8 designed tables implemented plus 6 additional tables. Matches design. |
| **JWT authentication + role-based access** | Implemented | `jsonwebtoken` library. `authMiddleware` decodes and attaches `req.user`. `requireRole()` enforces role-based access. Matches design. |
| **Async long-running report generation** | Implemented | `POST /api/reports` uses `setImmediate()` for non-blocking PDF generation. `generatePdfReport()` updates `progress` table at 25/50/75/100% milestones. Matches design. |
| **Progress tracking via API** | Implemented | `GET /api/reports/:id/progress` reads `progress` table and returns `{ percentage, status }`. Polled by frontend every 600ms. Matches design. |
| **File upload and download** | Partially Implemented | Multer disk storage to `/uploads/` subdirectories. All file types (contracts, receipts, application docs) served via download endpoints. **Design specified Google Firebase Storage — local disk used instead.** Functionally equivalent for local dev; not production-ready per design. |
| **Google Firebase Storage** | Not Implemented | Design specified Firebase for file storage. Local disk storage used throughout. This is the primary backend deviation from the design. |

---

## 5. Design Compliance Summary

---

### 5.1 Compliance by Area

| Design Area | Designed | Implemented | Partially | Not Implemented |
|-------------|:--------:|:-----------:|:---------:|:---------------:|
| Angular Components | 11 | 4 | 0 | 7 |
| Business Services | 8 | 0 | 1 | 7 |
| Infrastructure Guards | 2 | 2 | 0 | 0 |
| Angular Modules (NgModules) | 4 | 0 | 0 | 4 |
| Data Entities | 8 | 8 | 0 | 0 |
| Entity Relationships | 8 | 8 | 0 | 0 |
| Behavioral Workflows | 6 | 5 | 1 | 0 |
| Backend Technologies | 6 | 5 | 1 | 0 |

---

### 5.2 Key Deviations from Design

1. **Monolithic Components** — The design specifies 7 separate feature components (`ApplicationComponent`, `ContractComponent`, `ComplaintComponent`, `DocumentsComponent`, `ReceiptComponent`, `ProgressComponent`, `NavMenuComponent`). All feature logic is embedded in the two dashboard components instead. This is the largest structural deviation and results in very large, difficult-to-maintain component files.

2. **Monolithic ApiService** — The design specifies 7 domain-specific services (`ApplicationService`, `ContractService`, `ComplaintService`, `ReceiptService`, `FileService`, `ReportService`, `ProgressService`). A single `ApiService` handles all 30+ API calls. The domain separation and separation of concerns intended by the design is absent.

3. **No NgModules** — The design specifies `AppModule`, `CoreModule`, `StudentModule`, `AdminModule`. Angular 21 standalone component pattern is used instead. This is a valid modern Angular approach (recommended since Angular 17), but deviates from the NgModule-based design document.

4. **Firebase → Local Disk Storage** — The design specified Google Firebase Storage for all user-uploaded files. Local disk storage via Multer (`/uploads/` directory) is used throughout. Functionally equivalent in a local development environment; not production-ready as specified.

5. **Extra Entities Beyond Design Scope** — Six tables added beyond the designed schema: `dormitories`, `rooms`, `termination_requests`, `notifications`, `progress`, `admin_profiles`. These are driven largely by the multi-dormitory scope creep and the real-time notification system — both features that go beyond what the requirements and design specify.

---

### 5.3 Correctly Implemented Design Elements

The following design elements are implemented correctly and match the Final Design specification:

- All 8 core data entities with correct attributes and types
- All 8 designed entity relationships
- `AuthGuard` and `RoleGuard` — implemented exactly as designed (functional `CanActivateFn` guards)
- JWT authentication with role-based access control on all endpoints
- Two-role system (STUDENT / ADMIN) with correct access separation
- Async long-running report generation (`setImmediate`) with DB progress tracking
- Frontend progress polling and visual progress bar
- Dialog-based confirmations for complaint submission (R22) and application decisions (R23)
- Router-based menu navigation using Angular child routes
- File upload and download for all three categories (contracts, application docs, receipts)
- All 6 behavioral workflows function end-to-end as described in the sequence diagrams

---

### 5.4 Recommendations

1. **Extract feature components** — Split `StudentDashboardComponent` into `ApplicationComponent`, `ContractComponent`, `ComplaintComponent`, `DocumentsComponent`, `ReceiptComponent`, `ProgressComponent` as designed. Each section already has clear state boundaries (`loadApplications()`, `loadComplaints()`, etc.) making extraction feasible.

2. **Extract domain services** — Split `ApiService` into `ApplicationService`, `ContractService`, `ComplaintService`, `ReceiptService`, `FileService`, `ReportService` as designed. Each service would hold the 4–6 methods currently grouped in `ApiService`.

3. **Firebase Storage** — If the project is intended for production deployment, replace Multer disk storage with Firebase Storage as originally designed. For local/academic use, the current implementation is adequate.
