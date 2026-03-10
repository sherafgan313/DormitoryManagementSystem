# Dormitory Management System — Evaluation Report

**Project:** Student Dormitory Management System
**Module:** Advanced Web Development — University of Hildesheim
**Branch Evaluated:** `Payments-due-contract`
**Report Date:** 2026-03-10

---

## Evaluation Criteria

| Metric | Classification Options | Description |
|--------|----------------------|-------------|
| **Achievement** | Fully Achieved · Partially Achieved · Not Achieved | Whether the requirement is met in the current implementation |
| **Remove** | Should Remove · Can Remove · Shouldn't Remove | Whether the implementation introduces overkill or scope creep beyond the requirement |

---

## 1. Functional Requirements — Must

---

### R01 — Student Registration

> The system must provide registration functionality for students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Partially Achieved | Backend endpoint `POST /api/register` exists and is functional. However, there is **no registration page in the frontend** — the Angular app only has a `/login` route. Students cannot self-register through the UI; they are created exclusively via seeded demo data. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. The backend half exists; the frontend form simply needs to be added. |

---

### R02 — Student Authentication & Login

> The system must provide authentication and login functionality to students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | `/login` page, `AuthService`, `POST /api/login`, JWT storage, and redirect to `/student-dashboard` all work end-to-end. |
| **Remove** | Shouldn't Remove | Core mandatory requirement, correctly implemented. |

---

### R02a — Admin Authentication & Login

> The system must provide authentication and login functionality to dormitory administrators.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Same login flow as R02 with role-based redirect to `/dashboard`. JWT payload includes `role` and `dormitory_id`. |
| **Remove** | Shouldn't Remove | Core mandatory requirement, correctly implemented. |

---

### R03 — Online Dormitory Application Form for Students

> The system must provide an online dormitory application form for students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Student dashboard `apply` section has a working application form backed by `POST /api/applications`. The form auto-detects whether the student has an active contract and submits `application_type: 'NEW'` or `'EXTENSION'` accordingly. Application history is displayed in a table. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. |

---

### R04 — Student Personal Profile

> The system must provide a personal profile for students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Profile section in student dashboard with personal info (name, email, phone) and academic info (Student ID, course, university) backed by `GET/PUT /api/profile`. Profile JOINs dormitories and rooms to return live dormitory name, contact, room number, and floor. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. |

---

### R05 — Admin Dashboard

> The system must provide a dashboard for dormitory administrators.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Full admin dashboard with live stats cards (totalRooms, occupied, vacant, pending applications, open complaints, collection rate, overdue residents), activity feed, rooms, residents, payments, complaints, reports, and settings sections — all fetching from live API. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. |

---

### R06 — Application Review for Admins

> The system must provide application review functionality to dormitory administrators.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Admin `residents` section lists all applications in sub-tabs (New Applications, Extension Requests, Termination Requests) with applicant details and status badges. `GET /api/applications` is filtered by role — admins see all, students see their own. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. |

---

### R07 — Application Acceptance for Admins

> The system must provide application acceptance functionality to dormitory administrators.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Two-step acceptance flow: click Accept → select vacant room and fill contract details (start/end date, monthly rent, due day) → click "Confirm & Generate Contract" → a confirmation dialog overlay opens (`acceptDialog`) showing a summary → admin confirms → calls `PATCH /api/applications/:id/status` with a transactional room assignment and automatic contract + PDF generation. The dialog has `confirm` and `result` phases with success/error feedback. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. |

---

### R07a — Application Rejection for Admins

> The system must provide application rejection functionality to dormitory administrators.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Clicking Reject opens a `rejectDialog` modal overlay with three phases: `remarks` (enter rejection reason) → `confirm` (summary preview with back button) → `result` (success/failure feedback). Calls `PATCH /api/applications/:id/status` with `REJECTED` status and optional remarks saved to DB. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. |

---

### R08 — File Upload for Student Application Documents

> The system must provide file upload functionality for students for submitting required documents.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | `POST /api/applications/:id/files` accepts up to 10 files (PDF/JPG/PNG, 5 MB each) via Multer middleware. Files are stored to `/uploads/applications/` and recorded in `application_files`. `GET /api/my-files` and `GET /api/files/:fileId/download` support retrieval. The student dashboard documents section is backed by these live endpoints, and the application form includes a document checklist with per-file upload controls. |
| **Remove** | Shouldn't Remove | Core mandatory requirement, correctly implemented. |

---

### R09 — Digital Contract Creation for Accepted Students

> The system must provide digital contract creation for accepted students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | `POST /api/contracts` is called automatically during application acceptance. Contract records (start date, end date, monthly rent, due day, status ACTIVE) are stored in DB. A formal PDF is generated via `generateContractPdf()` (PDFKit) and saved to `/uploads/contracts/`. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. |

---

### R10 — File Upload: Signed Rental Contract

> The system must provide file upload functionality for students to upload signed rental contracts.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | `POST /api/contracts/sign` accepts a single PDF file (10 MB limit) via `signedUpload` Multer middleware. One-time-only upload is enforced — the endpoint checks `signed_document_path` before accepting. The signed path is stored in the `contracts` table. The student contract section shows an upload control that disappears once a signed doc is on file. |
| **Remove** | Shouldn't Remove | Explicitly stated as a mandatory file upload requirement, correctly implemented. |

---

### R11 — File Download: Student Contract

> The system must provide file download functionality for students to download their uploaded contracts.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | `GET /api/contracts/download` streams the auto-generated contract PDF to the student browser. The endpoint checks that the requesting student owns the contract before serving the file. The student dashboard contract section has a Download button that activates once the contract PDF has been generated. |
| **Remove** | Shouldn't Remove | Explicitly stated as a mandatory file download requirement, correctly implemented. |

---

### R12 — File Upload: Monthly Rent Payment Receipts

> The system must provide file upload functionality for students for uploading monthly rent payment receipts.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | `POST /api/payments` accepts a receipt file attachment via `receiptUpload` Multer middleware (5 MB limit), stored to `/uploads/receipts/`. Receipt path is saved to the `rent_payments` table. Admins can download receipts via `GET /api/payments/:id/receipt`. The `ApiService.recordPayment()` method appends the file as `FormData`. |
| **Remove** | Shouldn't Remove | Mandatory requirement, correctly implemented. |

---

### R13 — Storage of Rent Payment Records

> The system must provide storage of rent payment records for students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | `POST /api/payments` stores payment in DB. `GET /api/payments` retrieves history with status badges. Student payment history table is displayed in the student dashboard. Overdue tracking via `GET /api/payments/overdue` supplements this. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. |

---

### R14 — File Download: Rent Payment Records as PDF

> The system must provide file download functionality for students to download rent payment records as a PDF document.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | `GET /api/reports/:id/download` streams an actual PDF generated by `generatePdfReport()` (PDFKit). The report includes occupancy stats, payment summary, complaint list, and resident info. Download is triggered from the student dashboard after report generation completes (via the report progress modal). |
| **Remove** | Shouldn't Remove | Mandatory requirement, correctly implemented with real PDF content. |

---

### R15 — Contract Extension for Admins

> The system must provide contract extension functionality to dormitory administrators.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Contract extension is handled via the standard application workflow: students submit an `application_type: 'EXTENSION'` application, which the admin reviews in the dedicated **Extension Requests** sub-tab of the residents section. The admin uses the same Accept flow (room + dates + rent → confirmation dialog → contract update) to approve extensions. The DB enum supports `EXTENDED` status. `PATCH /api/contracts/:id/status` with `EXTENDED` is also directly available. The full workflow — student request, admin review, admin approve/reject — is end-to-end implemented. |
| **Remove** | Shouldn't Remove | Core mandatory requirement, now fully implemented via the extension application workflow and sub-tab. |

---

### R16 — Contract Termination for Admins

> The system must provide contract termination functionality to dormitory administrators.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Two termination paths exist. (1) Student-initiated: students submit a termination request via `POST /api/termination-requests`, visible in the admin's **Termination Requests** sub-tab; admin can Accept or Reject directly from the table. (2) Admin-initiated: a "Contract Termination" button in the residents section header opens an `adminTerminateDialog` modal — admin selects a student with an active contract, enters a reason, reviews a summary, and confirms via `POST /api/contracts/admin-terminate`. Both paths mark the contract `TERMINATED`, set the end date, and free the room. |
| **Remove** | Shouldn't Remove | Core mandatory requirement, now fully implemented via both student-initiated and admin-initiated termination flows. |

---

### R17 — Backend Long-Running Report Generation

> The system must provide a backend process to generate a rent payment history report (mandatory long-running task).

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | `POST /api/reports` inserts a progress record (status PENDING, 0%) then delegates actual generation to `setImmediate(() => generatePdfReport(...))` — a non-blocking async call. `generatePdfReport()` executes multi-stage DB queries, builds a PDFKit document, writes to disk, and updates the `progress` table at 25%, 50%, 75%, and 100% milestones. |
| **Remove** | Shouldn't Remove | One of the three explicitly highlighted mandatory technical patterns, correctly implemented. |

---

### R18 — Progress Status Information During Report Generation

> The system must provide progress status information to students during the generation of rent payment reports.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | `GET /api/reports/:id/progress` reads the `progress` table and returns `{ percentage, reportStatus }`. The frontend polls this endpoint every 600 ms via `setInterval()`, updates the modal state, and auto-stops polling when status reaches COMPLETED, CANCELLED, or FAILED. |
| **Remove** | Shouldn't Remove | Explicitly marked as a mandatory progress display requirement, correctly implemented. |

---

### R19 — Visual Progress Indicator During Backend Processing

> The system must provide a visual progress indicator to students while backend processing is running.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | The student dashboard opens a `reportModal` on generation start. The modal contains a live progress bar bound to `reportModal.percentage`, a status label, a Cancel button (`cancelReport()`), and a Download button that activates when status is COMPLETED. The bar reflects true backend progress polled from the `progress` table. |
| **Remove** | Shouldn't Remove | Companion to R17 and R18; all three are implemented together correctly. |

---

### R20 — Complaint Submission for Students

> The system must provide complaint submission functionality for students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Student dashboard complaints section has a form (title + description). Clicking "Submit" triggers the complaint confirmation dialog (R22) before the actual API call. Submitted complaints appear in the history list with status badges. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. |

---

### R21 — Complaint Management for Admins

> The system must provide complaint management functionality to dormitory administrators.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Admin `requests` section lists all complaints with status badges and workflow buttons (SUBMITTED → IN_PROGRESS → RESOLVED) backed by `PATCH /api/complaints/:id/status`. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. |

---

### R22 — Dialog Window: Student Complaint Confirmation

> The system must provide a dialog window for students to confirm complaint submission (mandatory dialog requirement).

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | A `complaintDialog` modal overlay is now implemented in `student-dashboard.html`. When the student clicks Submit in the complaint form, `openComplaintDialog()` is called — this validates the input and opens a `conf-backdrop` / `conf-modal` overlay. The dialog has two phases: `confirm` (shows title and description preview with Cancel / Submit Complaint buttons) and `result` (success or failure feedback). The actual `submitComplaint()` API call is only made after the student confirms inside the dialog. |
| **Remove** | Shouldn't Remove | Explicitly flagged as fulfilling the mandatory dialog window requirement. Now correctly implemented. |

---

### R23 — Dialog Window: Admin Application Confirmation

> The system must provide a dialog window for dormitory administrators to confirm application acceptance or rejection.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Two separate modal overlay dialogs are now implemented in `dashboard.html`. **Accept dialog** (`acceptDialog`): opened by `openAcceptDialog()` after the inline form is filled; renders as a `conf-backdrop` / `conf-modal` overlay with a contract details summary (student, room, dates, rent, due day), Cancel and Confirm buttons, and a result phase. **Reject dialog** (`rejectDialog`): opened by `openRejectDialog()`; has three phases — `remarks` (enter rejection reason), `confirm` (summary preview), and `result` (success/error feedback). Both dialogs use `(click)="$event.stopPropagation()"` to prevent backdrop-click from accidentally dismissing during the action. |
| **Remove** | Shouldn't Remove | Companion to R22; both are now implemented as proper dialog window overlays. |

---

### R24 — Menu-Based Navigation Using Angular Routing

> The system must provide menu-based navigation for all users using Angular routing (mandatory router requirement).

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Partially Achieved | Top-level Angular routing is correctly implemented (`/`, `/login`, `/dashboard`, `/student-dashboard`). However, **all section navigation within dashboards uses component-level `activeNav` state** — sidebar menu items call `setActive(id)` which toggles a string, not `RouterLink` or `router.navigate()`. Sections have no unique URLs, cannot be bookmarked, and the Angular router is not used for menu navigation within the application. |
| **Remove** | Shouldn't Remove | Explicitly highlighted as fulfilling the mandatory router-based menu requirement. Angular child routes must be used. |

---

### R25 — Role-Based Access Control: Students

> The system must provide role-based access control for students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Partially Achieved | Server-side: `requireRole('STUDENT')` guards student-only endpoints (profile, applications, contracts, payments/overdue, termination requests). Client-side: **no Angular `CanActivate` route guards** exist. Any unauthenticated browser user can navigate directly to `/student-dashboard`. |
| **Remove** | Shouldn't Remove | Mandatory requirement; frontend route guards are missing. |

---

### R25a — Role-Based Access Control: Admins

> The system must provide role-based access control for dormitory administrators.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Partially Achieved | Server-side: `requireRole('ADMIN')` guards admin endpoints (stats, rooms, admin profile, termination request management, admin-terminate, active-students). Same frontend gap as R25 — `/dashboard` is accessible without authentication in the browser. |
| **Remove** | Shouldn't Remove | Mandatory requirement; frontend route guards are missing. |

---

## 2. Functional Requirements — Should

---

### R26 — Student Dashboard: Application Status Overview

> The system shall provide an overview dashboard for students showing application status.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Student dashboard overview cards and the `apply` section both show application status (PENDING/ACCEPTED/REJECTED) fetched from `GET /api/applications`. |
| **Remove** | Shouldn't Remove | Useful student-facing feature matching the requirement. |

---

### R26a — Student Dashboard: Contract Status Overview

> The system shall provide an overview dashboard for students showing contract status.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Student overview shows a "Contract" stat card and a dedicated `contract` section displaying status badge, start/end dates, monthly rent, due day, next payment info, overdue warning, and contract signing/download controls. The termination request status is also shown inline. All data is live from `GET /api/contracts`. |
| **Remove** | Shouldn't Remove | Useful feature correctly matching the requirement. |

---

### R27 — Admin Dashboard: Pending Applications Overview

> The system shall provide an overview dashboard for dormitory administrators showing pending applications.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Admin overview shows a "Pending Apps" count card derived from `GET /api/stats`. The activity feed highlights recent applications. A quick-action button navigates directly to the residents section. |
| **Remove** | Shouldn't Remove | Correctly implemented. |

---

### R28 — Complaint Status Visibility for Students

> The system shall provide the ability to view complaint status for students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Student dashboard complaints section shows each complaint with status badge (SUBMITTED / IN_PROGRESS / RESOLVED) from `GET /api/complaints`. |
| **Remove** | Shouldn't Remove | Correctly implemented. |

---

### R29 — Filter Rent Payments by Month for Students

> The system shall provide the ability to filter rent payments by month for students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Partially Achieved | Payment records show the month column and a month input exists in the payment form. However, no UI filter, search input, or client-side filtering exists to narrow the payment history list by a selected month. |
| **Remove** | Can Remove | A "Should" requirement. A simple client-side filter would suffice if time permits; it is not critical. |

---

### R30 — Basic Validation of Uploaded Documents

> The system shall provide basic validation of uploaded documents (file type and size).

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Partially Achieved | Server-side validation is enforced by Multer middleware: application files are restricted to PDF/JPG/PNG at 5 MB; contract uploads to 10 MB; receipt uploads to 5 MB. The student application form shows the hint "PDF, JPG, PNG — max 5 MB each" next to file inputs, and the `accept=".pdf,.jpg,.jpeg,.png"` attribute on `<input type="file">` provides basic browser-level filtering. However, **no explicit client-side size validation** is present — oversized files reach the server before being rejected. |
| **Remove** | Shouldn't Remove | A "Should" requirement now substantially met. Explicit client-side size checking should be added to complete it. |

---

### R31 — Notification Messages After Successful Actions

> The system shall provide notification messages for students after successful actions.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Both dashboards show inline success/error alert boxes after API operations complete. Dialog result phases also display outcome messages (e.g. "Complaint Submitted!", "Application Accepted!", "Contract Terminated"). |
| **Remove** | Shouldn't Remove | Good UX and a "Should" requirement that is met. |

---

## 3. Functional Requirements — Can

---

### R32 — Search Functionality for Admins (Tenant Records)

> The system can provide search functionality for dormitory administrators for tenant records.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Not Achieved | No search box or filtering input exists in the admin dashboard for tenants, applications, payments, or complaints. |
| **Remove** | Can Remove | Optional "Can" requirement. Not implemented; not a priority. |

---

### R33 — Data Export for Admins

> The system can provide data export functionality for dormitory administrators.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Not Achieved | No CSV/Excel export functionality exists. Admin reports are student-facing PDF downloads, not admin data exports. |
| **Remove** | Can Remove | Optional "Can" requirement. Not a priority given the remaining mandatory gaps. |

---

### R34 — Profile Update for Students

> The system can provide profile update functionality for students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | `GET/PUT /api/profile` is fully implemented. The student dashboard profile section allows editing personal info (name, email, phone) and academic info (Student ID, course, university), saving to DB. |
| **Remove** | Shouldn't Remove | Already implemented and adds value; no reason to remove. |

---

## 4. Technical Requirements (Not Counted for Grading)

---

### TR01 — Angular Frontend with Router-Based Navigation

> The system must be implemented using an Angular frontend with router-based navigation.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Partially Achieved | Angular 21 is used correctly. Top-level routing (`app.routes.ts`) is implemented with four routes. However, in-dashboard section navigation uses component state (`activeNav` + `setActive()`) instead of Angular child routes, meaning the router is not used for menu navigation within the app — which is the spirit of this requirement. |
| **Remove** | N/A | Technical requirement. |

---

### TR02 — Backend Technology

> The system must utilize backend technology to support the frontend.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Express.js + Node.js backend (`server.js`) with MySQL2, JWT, Multer, and PDFKit, serving 35+ REST endpoints with full auth middleware. New endpoints added in this branch: `POST/GET /api/termination-requests`, `PATCH /api/termination-requests/:id/accept`, `PATCH /api/termination-requests/:id/reject`, `GET /api/contracts/active-students`, `POST /api/contracts/admin-terminate`. |
| **Remove** | N/A | Technical requirement. |

---

### TR03 — Automated Tests with Karma

> The system must provide automated tests executed with Karma.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Not Achieved | The project uses **Vitest** (v4.0.8), not Karma. Only one test file exists (`app.spec.ts`) with two trivial tests: component creation and a title render check against the outdated string `"Hello, dms-frontend"`. No service, component, or integration tests exist. |
| **Remove** | N/A | Technical requirement. Note: Vitest ≠ Karma — this is a toolchain mismatch. |

---

### TR04 — Test Coverage Above 60% (Including E2E)

> The system must achieve test coverage above 60%, including e2e tests.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Not Achieved | Effective test coverage is near 0%. No E2E tests, no service tests, no component tests. The two existing tests are outdated and test only that the root component renders. |
| **Remove** | N/A | Technical requirement. This is a significant gap requiring immediate attention. |

---

### TR05 — Runnable VirtualBox VM Delivery by 2026/03/17

> The system must be delivered as a runnable VirtualBox VM including documentation until 2026/03/17.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Not Assessed | Deadline not yet reached at time of this report (2026-03-10). VM preparation and documentation packaging have not been started. |
| **Remove** | N/A | Technical requirement. |

---

## 5. Over-Engineering Analysis (Beyond Requirements)

The following features were implemented beyond what the requirements specify. Each is evaluated for whether it should be removed to simplify the codebase.

---

### Multi-Dormitory Support

**What was added:** `dormitory_id` foreign key added to `users`, `rooms`, `applications`, `contracts`, `complaints`, `payments`, `reports`, and `admin_profiles`. All admin API queries filter by `req.user.dormitory_id`. JWT payload includes `dormitory_id`. Two dormitories seeded with separate admins.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Should Remove | The requirements describe a system for *one* dormitory with two roles. Multi-dormitory support is substantial scope creep — it complicates every API query, the data model, JWT, Multer path handling, and seeding. None of the requirements mention multiple dormitories. This should be stripped back to a single-dormitory model. |

---

### Admin Settings: Dormitory Info Editing

**What was added:** A full dormitory info form in the settings section (name, address, contact email/phone, max capacity) backed by `PUT /api/admin/profile`.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Should Remove | No requirement asks for dormitory metadata management. This exists only as a consequence of the multi-dormitory over-engineering above. |

---

### Payment Verification Workflow

**What was added:** `verification_status` column added to `rent_payments` (PENDING_VERIFICATION / VERIFIED / REJECTED). `PATCH /api/payments/:id/verify` and `PATCH /api/payments/:id/reject` endpoints added. Admin dashboard payments section includes verify/reject action buttons and a receipt download option (`GET /api/payments/:id/receipt`).

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Can Remove | R12 requires only that receipts can be uploaded. R13 requires storage. No requirement asks for an admin payment verification workflow. The feature adds genuine value but also adds complexity (extra API calls, extra DB column, extra UI logic) not asked for in the spec. |

---

### Room Management Grid (Admin)

**What was added:** A full rooms grid section in the admin dashboard with floor grouping, status filtering (all/vacant/occupied/maintenance), and room cards showing resident names. Backed by `GET /api/rooms`.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Can Remove | Rooms appear in the requirements only as a detail of application acceptance (room assignment). A dedicated room management grid is not required. However, `GET /api/rooms/vacant` is needed for the acceptance dropdown, so the endpoint must remain. The full grid UI can be removed if simplification is needed. |

---

### PDFKit Contract with Formal Legal Clauses

**What was added:** `generateContractPdf()` produces a multi-page formal contract with header, tenant/dorm info block, rental terms, payment schedule, due-day clause, and termination clause.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Can Remove | R09 asks only for "digital contract creation" and R11 for downloadability. The spec does not define what the contract content must contain. The PDFKit dependency is necessary for R14/R17 anyway, but the full legal-clause template is beyond the requirement. A simpler summary page would satisfy R09/R11. |

---

### Overdue Tracking and Collection Rate Stats

**What was added:** `GET /api/payments/overdue` calculates overdue months based on contract `start_date`, `monthly_rent`, and `due_day`. `GET /api/stats` returns `paidThisMonth`, `totalOutstanding`, `overdueResidentCount`, and `collectionRate`. Student dashboard overview shows next payment info and overdue warnings.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Can Remove | No requirement specifies overdue tracking, collection rate calculation, or next-payment notifications. These are useful business features but exceed the stated scope. The overdue endpoint (`/api/payments/overdue`) and the related stats fields can be removed if scope needs to be reduced. |

---

### Student Dashboard: "Important Contacts" Card

**What was added:** A card in the student overview section showing dorm admin phone, maintenance number, emergency contact, and office hours. Two fields (`+63 917 000 1234`, `+63 917 000 9999`) remain hardcoded in the component; only the "Dorm Admin" value is dynamic.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Can Remove | No requirement specifies a contacts card. As a partially hardcoded element it adds no real value and should either be made fully dynamic or removed. |

---

### Student Dashboard: 5-Step Contract Timeline

**What was added:** A visual milestone timeline in the student contract section showing 5 stages (Application Submitted → Accepted → Contract Signed → Contract Active → Contract Expiry/Renewal) with hardcoded sample dates.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Can Remove | Not required by the spec. The dates are still hardcoded (Dec 20, 2025 / Jan 5, 2026), so the timeline does not reflect live contract data. It is cosmetic overhead and adds template complexity without delivering dynamic value. |

---

### Termination Request Workflow (Student-Initiated)

**What was added:** A multi-phase `terminationDialog` modal in the student contract section lets students submit a termination request (reason + requested end date) via `POST /api/termination-requests`. Status of the most recent request is displayed inline. Admin sees requests in a dedicated "Termination Requests" sub-tab.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Can Remove | R16 only requires that admins can terminate contracts. Providing a formal student-initiated request flow is a UX enhancement beyond the requirement. However, since the feature is now tightly integrated with R16's full implementation (the admin reviews and approves/rejects these requests), removing it would complicate R16. Consider keeping it as it directly supports R16 fulfillment. |

---

### GET /api/users Endpoint (Admin Users List)

**What was added:** An endpoint that returns all users for the admin's dormitory.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Can Remove | No requirement asks for a user list. The endpoint exists but no frontend section uses it visibly. It is unused overhead. |

---

### Academic Info Fields in Student Profile

**What was added:** `student_id_number`, `course`, and `university` fields in `student_profiles`, with corresponding form fields in the student dashboard profile section.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Can Remove | R04 asks only for "a personal profile for students". Academic fields are extras. They add minimal complexity and are harmless, but strictly speaking are beyond the requirement. |

---

## 6. Summary Scorecard

### Achievement Summary

| Category | Fully Achieved | Partially Achieved | Not Achieved |
|----------|:-:|:-:|:-:|
| Must (R01–R25a) | 22 | 4 | 0 |
| Should (R26–R31) | 5 | 2 | 0 |
| Can (R32–R34) | 1 | 0 | 2 |
| Technical (TR01–TR05) | 1 | 1 | 2 + 1 not assessed |
| **Total** | **29** | **7** | **4 + 1 N/A** |

### Progress Since Previous Branch (`Multi-Dormitory-Support-&-Full-API-Integration`)

| Previously Not/Partially Achieved → Now Fully Achieved |
|----------------------------------------------|
| R15 — Contract extension for admins (Extension Requests sub-tab + application workflow) |
| R16 — Contract termination for admins (admin-terminate dialog + termination requests sub-tab) |
| R22 — Dialog window for student complaint confirmation (`complaintDialog` modal overlay) |
| R23 — Dialog window for admin application confirmation (`acceptDialog` + `rejectDialog` modal overlays) |

### Remaining Gaps (Must requirements Not Fully Achieved)

| ID | Status | Requirement |
|----|--------|-------------|
| R01 | Partially | No frontend registration page |
| R24 | Partially | Dashboard sections not using Angular child routes |
| R25 | Partially | No Angular route guards for students |
| R25a | Partially | No Angular route guards for admins |

### Remove Summary

| Classification | Count | Key Items |
|---------------|:-----:|-----------|
| Should Remove | 2 | Multi-dormitory support, dormitory info editing |
| Can Remove | 9 | Payment verification workflow, room grid, PDFKit contract clauses, overdue tracking, Important Contacts card, contract timeline (hardcoded dates), student termination request workflow, GET /api/users, academic profile fields |
| Shouldn't Remove | All core features | Authentication, applications, file uploads, contracts, complaints, payments, reports, profiles, dialog overlays |

---

## 7. Priority Recommendations

Based on the analysis, the following actions are recommended in priority order:

**Immediate (Mandatory gaps blocking acceptance):**
1. Add Angular child routes for dashboard sections — covers R24, TR01
2. Add Angular `CanActivate` route guards for role-based access — covers R25, R25a
3. Add student registration page in frontend — covers R01

**Short-term (Partial implementations to complete):**
4. Add client-side file size validation in upload forms — completes R30
5. Fix hardcoded dates in contract timeline (or remove the timeline entirely) — cosmetic accuracy
6. Add month filter to student payment history — covers R29

**Test Coverage (Technical requirement):**
7. Write Karma-based (or Vitest) tests targeting 60%+ coverage — covers TR03, TR04

**Clean-up (Remove scope creep):**
8. Strip multi-dormitory support back to single-dormitory model — simplifies entire codebase
9. Remove or fully dynamicize Important Contacts card (hardcoded phone numbers)
