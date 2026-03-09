# Dormitory Management System — Evaluation Report

**Project:** Student Dormitory Management System
**Module:** Advanced Web Development — University of Hildesheim
**Branch Evaluated:** `Multi-Dormitory-Support-&-Full-API-Integration`
**Report Date:** 2026-03-09

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
| **Achievement** | Partially Achieved | Backend endpoint `POST /api/register` exists and is functional. However, there is **no registration page in the frontend** — the Angular app only has a `/login` route. Students cannot self-register through the UI. |
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
| **Achievement** | Fully Achieved | Same login flow as R02 with role-based redirect to `/dashboard`. JWT includes `role` and `dormitory_id`. |
| **Remove** | Shouldn't Remove | Core mandatory requirement, correctly implemented. |

---

### R03 — Online Dormitory Application Form for Students

> The system must provide an online dormitory application form for students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Student dashboard `apply` section has a working application form backed by `POST /api/applications`. Application history is also displayed. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. |

---

### R04 — Student Personal Profile

> The system must provide a personal profile for students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Profile section in student dashboard with personal info (name, email, mobile) and academic info (Student ID, course, university) backed by `GET/PUT /api/profile`. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. |

---

### R05 — Admin Dashboard

> The system must provide a dashboard for dormitory administrators.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Full admin dashboard with stats cards, activity feed, rooms, residents, payments, complaints, reports, and settings sections — all fetching from live API. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. |

---

### R06 — Application Review for Admins

> The system must provide application review functionality to dormitory administrators.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Admin `residents` section lists all applications with applicant details and status badges. `GET /api/applications` is filtered per dormitory. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. |

---

### R07 — Application Acceptance for Admins

> The system must provide application acceptance functionality to dormitory administrators.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Two-step acceptance flow: click Accept → select vacant room from dropdown → confirm. Uses `PATCH /api/applications/:id/status` with a transactional room assignment. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. |

---

### R07a — Application Rejection for Admins

> The system must provide application rejection functionality to dormitory administrators.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Reject button calls same `PATCH /api/applications/:id/status` with `REJECTED` status. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. |

---

### R08 — File Upload for Student Application Documents

> The system must provide file upload functionality for students for submitting required documents.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Not Achieved | The Documents section in the student dashboard has upload UI with `simulateUpload()`, but this only updates local component state. **No API endpoint for file upload exists** (`multer` is not installed, no `POST /api/upload`). Database tables `file_metadata` and `application_files` are unused. |
| **Remove** | Shouldn't Remove | Mandatory requirement with a clear explanation in the spec. Must be implemented. |

---

### R09 — Digital Contract Creation for Accepted Students

> The system must provide digital contract creation for accepted students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | `POST /api/contracts` is called automatically during application acceptance. Contract records (start date, end date, monthly rent, status ACTIVE) are stored in DB and visible to the student. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. |

---

### R10 — File Upload: Signed Rental Contract

> The system must provide file upload functionality for students to upload signed rental contracts.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Not Achieved | "Upload Signed" button exists in the student contract section but has no handler — it is non-functional. No backend file upload endpoint. Column `signed_document_file_id` in `contracts` table exists but is never populated. |
| **Remove** | Shouldn't Remove | Explicitly stated as a mandatory file upload requirement. |

---

### R11 — File Download: Student Contract

> The system must provide file download functionality for students to download their uploaded contracts.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Not Achieved | "Download Contract" button in student dashboard has no bound action. No `GET /api/contracts/:id/download` endpoint. No actual contract document is stored or served. |
| **Remove** | Shouldn't Remove | Explicitly stated as a mandatory file download requirement. |

---

### R12 — File Upload: Monthly Rent Payment Receipts

> The system must provide file upload functionality for students for uploading monthly rent payment receipts.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Not Achieved | Payment form only records month and amount. No receipt attachment. No file upload endpoint. Column `receipt_file_id` in `rent_payments` table is never used. |
| **Remove** | Shouldn't Remove | Mandatory requirement. |

---

### R13 — Storage of Rent Payment Records

> The system must provide storage of rent payment records for students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | `POST /api/payments` stores payment in DB. `GET /api/payments` retrieves history. Student payment history table is displayed in student dashboard. |
| **Remove** | Shouldn't Remove | Core mandatory requirement. |

---

### R14 — File Download: Rent Payment Records as PDF

> The system must provide file download functionality for students to download rent payment records as a PDF document.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Not Achieved | No PDF library in the project (no `pdfkit`, `puppeteer`, `html2pdf`). `POST /api/reports` only inserts a hardcoded stub path `"reports/sample.pdf"`. No actual file is generated or downloadable. |
| **Remove** | Shouldn't Remove | Mandatory requirement. |

---

### R15 — Contract Extension for Admins

> The system must provide contract extension functionality to dormitory administrators.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Partially Achieved | `PATCH /api/contracts/:id/status` can set status to `EXTENDED`, and the DB enum supports it. However, **there is no UI in the admin dashboard** to trigger this action. Contracts are not shown in any admin section. |
| **Remove** | Shouldn't Remove | Mandatory requirement; the backend half exists. |

---

### R16 — Contract Termination for Admins

> The system must provide contract termination functionality to dormitory administrators.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Partially Achieved | Same as R15 — `TERMINATED` status supported in the API and DB, but **no admin UI** exposes this action. |
| **Remove** | Shouldn't Remove | Mandatory requirement; the backend half exists. |

---

### R17 — Backend Long-Running Report Generation

> The system must provide a backend process to generate a rent payment history report (mandatory long-running task).

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Not Achieved | `POST /api/reports` is a single synchronous INSERT that stores the string `"reports/sample.pdf"`. No actual report is computed, no job queue, no async processing, no delay simulation. The `progress` table exists in the DB schema but is never written to or read from. |
| **Remove** | Shouldn't Remove | This is one of the three explicitly highlighted mandatory technical patterns. |

---

### R18 — Progress Status Information During Report Generation

> The system must provide progress status information to students during the generation of rent payment reports.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Not Achieved | No progress polling endpoint (`GET /api/progress/:taskId`), no progress state in the backend. The `progress` table is schema-only and completely unused in the application logic. |
| **Remove** | Shouldn't Remove | Explicitly marked as a mandatory progress display requirement. |

---

### R19 — Visual Progress Indicator During Backend Processing

> The system must provide a visual progress indicator to students while backend processing is running.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Not Achieved | The student dashboard documents section has a cosmetic progress bar, but it tracks how many documents are uploaded (local state) — not backend task progress. No component polls a progress endpoint or renders a task-linked progress bar. |
| **Remove** | Shouldn't Remove | Companion to R17 and R18; all three must be implemented together. |

---

### R20 — Complaint Submission for Students

> The system must provide complaint submission functionality for students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Student dashboard complaints section has a form (title + description) backed by `POST /api/complaints`. Submitted complaints appear in the history list. |
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
| **Achievement** | Not Achieved | No dialog or modal exists anywhere in the application. All confirmations are done inline within the page template using Angular `@if` boolean flags. No `@angular/cdk/dialog`, no custom modal service, no browser `confirm()`. |
| **Remove** | Shouldn't Remove | Explicitly flagged as fulfilling the mandatory dialog window requirement. |

---

### R23 — Dialog Window: Admin Application Confirmation

> The system must provide a dialog window for dormitory administrators to confirm application acceptance or rejection.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Not Achieved | Same gap as R22. Application acceptance uses an inline two-step UI (boolean `showRoomSelect`), not a modal dialog. |
| **Remove** | Shouldn't Remove | Companion to R22; both must be implemented as proper dialog windows. |

---

### R24 — Menu-Based Navigation Using Angular Routing

> The system must provide menu-based navigation for all users using Angular routing (mandatory router requirement).

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Partially Achieved | Top-level Angular routing is correctly implemented (`/`, `/login`, `/dashboard`, `/student-dashboard`). However, **all section navigation within dashboards uses component-level `activeNav` state** (not Angular router `RouterLink` or `navigate()`). The sidebar menu items toggle a string variable, so sections have no unique URLs and cannot be bookmarked. |
| **Remove** | Shouldn't Remove | Explicitly highlighted as fulfilling the mandatory router-based menu requirement. Child routes should be used. |

---

### R25 — Role-Based Access Control: Students

> The system must provide role-based access control for students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Partially Achieved | Server-side: `requireRole('STUDENT')` guards student-only endpoints (profile, applications). Client-side: **no Angular route guards**. Any unauthenticated user can navigate to `/student-dashboard` in the browser directly. |
| **Remove** | Shouldn't Remove | Mandatory requirement; frontend route guards are missing. |

---

### R25a — Role-Based Access Control: Admins

> The system must provide role-based access control for dormitory administrators.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Partially Achieved | Server-side: `requireRole('ADMIN')` guards admin endpoints. Same frontend gap as R25 — `/dashboard` is accessible without authentication. |
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
| **Achievement** | Fully Achieved | Student overview shows "Contract" stat card and a dedicated `contract` section displaying status badge, dates, rent, and a 5-step timeline. |
| **Remove** | Shouldn't Remove | Useful feature correctly matching the requirement. |

---

### R27 — Admin Dashboard: Pending Applications Overview

> The system shall provide an overview dashboard for dormitory administrators showing pending applications.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Admin overview shows "Pending Applications" count card and the activity feed highlights recent applications. Quick action button navigates directly to residents section. |
| **Remove** | Shouldn't Remove | Correctly implemented. |

---

### R28 — Complaint Status Visibility for Students

> The system shall provide the ability to view complaint status for students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Student dashboard complaints section shows each complaint with status badge (SUBMITTED / IN_PROGRESS / RESOLVED). |
| **Remove** | Shouldn't Remove | Correctly implemented. |

---

### R29 — Filter Rent Payments by Month for Students

> The system shall provide the ability to filter rent payments by month for students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Partially Achieved | Payment form has a month input, and payment records show the month column. However, no UI filter or search exists to filter the payment history list by a selected month. |
| **Remove** | Can Remove | A "Should" requirement. If time is constrained, a simple client-side filter would suffice; it is not critical. |

---

### R30 — Basic Validation of Uploaded Documents

> The system shall provide basic validation of uploaded documents (file type and size).

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Not Achieved | No file upload is implemented at all (see R08), so there is no validation either. |
| **Remove** | Can Remove | A "Should" requirement dependent on R08. Once R08 is implemented, this should be added alongside it, but it is not a blocker on its own. |

---

### R31 — Notification Messages After Successful Actions

> The system shall provide notification messages for students after successful actions.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Both dashboards show inline success/error alert boxes (e.g., "Complaint submitted successfully!", "Payment recorded successfully!") after API operations. |
| **Remove** | Shouldn't Remove | Good UX and a "Should" requirement that is met. |

---

## 3. Functional Requirements — Can

---

### R32 — Search Functionality for Admins (Tenant Records)

> The system can provide search functionality for dormitory administrators for tenant records.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Not Achieved | No search box or filtering input exists in the admin dashboard for tenants, applications, or payments. |
| **Remove** | Can Remove | Optional "Can" requirement. Not implemented; not a priority. |

---

### R33 — Data Export for Admins

> The system can provide data export functionality for dormitory administrators.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Not Achieved | No CSV/Excel export. The reports feature only stores a stub path with no actual data export. |
| **Remove** | Can Remove | Optional "Can" requirement. Given that even the mandatory report generation is incomplete, this should not be prioritized. |

---

### R34 — Profile Update for Students

> The system can provide profile update functionality for students.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | `GET/PUT /api/profile` is implemented. Student dashboard profile section allows editing personal and academic info, saving to DB. |
| **Remove** | Shouldn't Remove | Already implemented and adds value; no reason to remove. |

---

## 4. Technical Requirements (Not Counted for Grading)

---

### TR01 — Angular Frontend with Router-Based Navigation

> The system must be implemented using an Angular frontend with router-based navigation.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Partially Achieved | Angular 21 is used correctly. Top-level routing (`app.routes.ts`) is implemented. However, in-dashboard section navigation uses component state (`activeNav`) instead of Angular child routes, meaning the router is not used for menu navigation within the app — which is the spirit of this requirement. |
| **Remove** | N/A | Technical requirement. |

---

### TR02 — Backend Technology

> The system must utilize backend technology to support the frontend.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Fully Achieved | Express.js + Node.js backend (`server.js`) with MySQL2 and JWT, serving 20+ REST endpoints. |
| **Remove** | N/A | Technical requirement. |

---

### TR03 — Automated Tests with Karma

> The system must provide automated tests executed with Karma.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Achievement** | Not Achieved | The project uses **Vitest** (not Karma). Only one test file exists (`app.spec.ts`) with two trivial tests referencing an outdated template string. No service, component, or integration tests exist. |
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
| **Achievement** | Not Assessed | Deadline not yet reached at time of this report (2026-03-09). VM preparation and documentation packaging have not been started. |
| **Remove** | N/A | Technical requirement. |

---

## 5. Over-Engineering Analysis (Beyond Requirements)

The following features were implemented beyond what the requirements specify. Each is evaluated for whether it should be removed to simplify the codebase.

---

### Multi-Dormitory Support

**What was added:** `dormitory_id` foreign key added to `users`, `rooms`, `applications`, `contracts`, `complaints`, `payments`, `reports`, and `admin_profiles`. All admin API queries filter by `req.user.dormitory_id`. JWT payload includes `dormitory_id`. Two dormitories seeded with separate admins.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Should Remove | The requirements describe a system for *one* dormitory with two roles. Multi-dormitory support is substantial scope creep — it complicates every API query, the data model, JWT, and seeding. None of the requirements mention multiple dormitories. This should be stripped back to a single-dormitory model. |

---

### Admin Settings: Dormitory Info Editing

**What was added:** A full dormitory info form in the settings section (name, address, contact email/phone, max capacity) backed by `PUT /api/admin/profile`.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Should Remove | No requirement asks for dormitory metadata management. This exists only as a consequence of the multi-dormitory over-engineering above. |

---

### Admin Settings: Non-Functional Notification Toggles

**What was added:** Toggle switches for "Email Notifications", "Payment Reminders", and "Maintenance Alerts" in the settings section. These are local-only (not persisted to DB, no backend email service).

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Should Remove | These controls are entirely non-functional — they reset on page reload. They create a misleading impression of functionality. No requirement asks for email notification settings. |

---

### Room Management Grid (Admin)

**What was added:** A full rooms grid section in the admin dashboard with floor grouping, status filtering (all/vacant/occupied/maintenance), and room cards showing resident names. Backed by `GET /api/rooms`.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Can Remove | Rooms only appear in the requirements as a detail of application acceptance (room assignment). A dedicated room management grid is not required. However, it is useful context for admins and the API endpoint is needed for room assignment anyway. |

---

### Hardcoded Stats in Payments and Reports Sections

**What was added:** The admin payments section shows a summary card with hardcoded values (Paid ₱22,500, Outstanding ₱45,200, Overdue 13, Collection rate 67%). The reports section has a hardcoded info card (81% occupancy, 13 pending, 7 open).

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Should Remove | Hardcoded stats are misleading — they show false data regardless of the actual database state. Either compute these from real API data or remove the cards. Leaving fake numbers in a submitted product is worse than having no stats. |

---

### Student Dashboard: "Important Contacts" Card

**What was added:** A static card in the student overview section showing dorm admin phone, maintenance number, emergency contact, and office hours — all hardcoded strings.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Can Remove | No requirement specifies a contacts card. It is a UI nicety with hardcoded data. Either make it dynamic or remove it; as a hardcoded element it adds no real value. |

---

### Student Dashboard: 5-Step Contract Timeline

**What was added:** A visual milestone timeline in the student contract section showing 5 stages (Application Submitted → Accepted → Contract Signed → Contract Active → Contract Expiry/Renewal) with icons.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Can Remove | Not required by the spec. It is a cosmetic enhancement. Given that the underlying contract upload/download features are not implemented, this timeline is partially decorative. |

---

### GET /api/users Endpoint (Admin Users List)

**What was added:** An endpoint that returns all users for the admin's dormitory.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Can Remove | No requirement asks for a user list. The endpoint exists but no frontend section uses it visibly. It is unused overhead. |

---

### Academic Info Fields in Student Profile

**What was added:** `student_id_number`, `course`, and `university` fields in `student_profiles` table, with corresponding form fields in the student dashboard profile section.

| Metric | Classification | Justification |
|--------|---------------|---------------|
| **Remove** | Can Remove | R04 asks only for "a personal profile for students". Academic fields are extras. They add minimal complexity and are harmless, but strictly speaking are beyond the requirement. |

---

## 6. Summary Scorecard

### Achievement Summary

| Category | Fully Achieved | Partially Achieved | Not Achieved |
|----------|:-:|:-:|:-:|
| Must (R01–R25a) | 11 | 7 | 10 |
| Should (R26–R31) | 4 | 1 | 1 |
| Can (R32–R34) | 1 | 0 | 2 |
| Technical (TR01–TR05) | 1 | 1 | 2 + 1 not assessed |
| **Total** | **17** | **9** | **15 + 1 N/A** |

### Critical Gaps (Must requirements Not Achieved)

| ID | Requirement |
|----|-------------|
| R08 | File upload — application documents |
| R10 | File upload — signed contracts |
| R11 | File download — contracts |
| R12 | File upload — payment receipts |
| R14 | File download — payment records as PDF |
| R17 | Long-running backend report generation |
| R18 | Progress status information during report |
| R19 | Visual progress indicator |
| R22 | Dialog window for complaint confirmation |
| R23 | Dialog window for application confirmation |

### Remove Summary

| Classification | Count | Key Items |
|---------------|:-----:|-----------|
| Should Remove | 4 | Multi-dormitory support, dormitory info editing, non-functional notification toggles, hardcoded stats |
| Can Remove | 5 | Room grid, Important Contacts card, contract timeline, GET /api/users, academic profile fields |
| Shouldn't Remove | All core features | Authentication, applications, contracts, complaints, payments, profiles |

---

## 7. Priority Recommendations

Based on the analysis, the following actions are recommended in priority order:

**Immediate (Mandatory gaps blocking acceptance):**
1. Implement file upload/download using `multer` — covers R08, R10, R11, R12, R14
2. Implement actual PDF generation for rent history reports — covers R14, R17
3. Add async/progress tracking for report generation — covers R17, R18, R19
4. Add Angular modal/dialog components — covers R22, R23
5. Add Angular route guards for role-based access — covers R25, R25a
6. Add Angular child routes for dashboard sections — covers R24, TR01

**Short-term (Partial implementations to complete):**
7. Add student registration page in frontend — covers R01
8. Add contract management UI in admin dashboard — covers R15, R16
9. Replace hardcoded stats with real API data — correctness issue

**Clean-up (Remove scope creep):**
10. Strip multi-dormitory support back to single-dormitory model
11. Remove non-functional notification toggles from settings
12. Remove or fix hardcoded payment/report summary stats

**Test Coverage (Technical requirement):**
13. Write Karma-based (or Vitest) tests targeting 60%+ coverage — covers TR03, TR04
