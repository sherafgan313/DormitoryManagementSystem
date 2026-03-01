# Architectural Patterns

Patterns confirmed across multiple files in this codebase.

---

## 1. Angular Standalone Components (No NgModule)

Every component declares its own `imports` array rather than belonging to a shared module.

- `src/app/app.ts:4-10` — root App uses `imports: [RouterOutlet]`
- `src/app/pages/login/login.ts:6-11` — LoginComponent imports `[FormsModule, CommonModule]`
- `src/app/pages/dashboard/dashboard.ts:21-26` — DashboardComponent imports `[CommonModule]`

**Convention**: Add only what the component directly uses to `imports`. Never create shared NgModules.

---

## 2. Functional Bootstrap + Centralized Provider Config

The app bootstraps without a root module. All framework providers are registered in one place.

- `src/main.ts:5` — `bootstrapApplication(App, appConfig)`
- `src/app/app.config.ts:6-11` — `appConfig` object holds all `providers[]`

**Convention**: Add new Angular providers (HttpClient, signals, etc.) to `app.config.ts`, not to individual components.

---

## 3. Router Injection for Navigation

Components navigate programmatically by injecting `Router` via the constructor. There are no `[routerLink]` directives in component TypeScript files.

- `src/app/pages/login/login.ts:19,36,44` — `constructor(private router: Router)`
- `src/app/pages/home/home.ts:43,46` — `constructor(private router: Router)`
- `src/app/pages/dashboard/dashboard.ts:59,70` — `constructor(private router: Router)`

**Convention**: Use `this.router.navigate(['/path'])` for programmatic navigation.

---

## 4. CSS Custom Properties for Design Tokens

All design values (colors, spacing, shadows, radii, transitions) are defined once as CSS variables in the global stylesheet and consumed by component SCSS files.

- `src/styles.scss:8-30` — `:root {}` block defines `--primary`, `--accent`, `--bg`, `--shadow`, `--radius`, `--sidebar-width`, `--header-height`, `--transition`, etc.

**Convention**: Never hardcode colors or shadow values in component SCSS. Always reference a `var(--token-name)`.

---

## 5. Component-Colocated SCSS

Each component's styles live in a `.scss` file alongside its `.ts` and `.html` files. The `styleUrl` property links them.

- `src/app/pages/home/home.ts:8` — `styleUrl: './home.scss'`
- `src/app/pages/login/login.ts:10` — `styleUrl: './login.scss'`
- `src/app/pages/dashboard/dashboard.ts:25` — `styleUrl: './dashboard.scss'`

**Convention**: Keep component-specific styles in the co-located `.scss` file. Global/shared styles go in `src/styles.scss`.

---

## 6. TypeScript Interfaces for Component Data Shapes

Components define local interfaces to type their in-component data arrays before the `@Component` decorator.

- `src/app/pages/dashboard/dashboard.ts:5-18` — `StatCard` and `RecentActivity` interfaces defined at file scope.

**Convention**: Define interfaces at the top of the component file, above the `@Component` decorator. Keep them local unless reused across multiple components.

---

## 7. JWT Authentication Middleware (Backend)

All protected API routes share a single `authMiddleware` function. The middleware reads the raw token from `req.headers.authorization`, verifies it, and attaches decoded payload to `req.user`.

- `server.js:78-88` — `authMiddleware` definition
- `server.js:93,105,115,130,142,152,167` — applied to every protected route

**Convention**: Every route that reads `req.user.id` or `req.user.role` must be wrapped with `authMiddleware`. Public routes (`/api/register`, `/api/login`) do not use it.

---

## 8. REST API Route Grouping by Domain

Backend routes are organized into logical sections within `server.js`, separated by comments.

- `server.js:30` — `// ===== AUTH =====`
- `server.js:91` — `// ===== APPLICATION =====`
- `server.js:113` — `// ===== CONTRACT =====`
- `server.js:128` — `// ===== COMPLAINT =====`
- `server.js:150` — `// ===== RENT PAYMENT =====`
- `server.js:165` — `// ===== REPORT =====`

**Convention**: Add new route groups with a matching section comment. All endpoints use `/api/` prefix.

---

## 9. DB Status Columns as MySQL ENUMs

State transitions for key entities are enforced at the database level using `ENUM` types, not application-level strings.

- `dorm_management.sql:58` — `complaints.status ENUM('SUBMITTED','IN_PROGRESS','RESOLVED')`
- `dorm_management.sql:83` — `contracts.status ENUM('ACTIVE','EXTENDED','TERMINATED')`
- `dorm_management.sql:107` — `dorm_applications.status ENUM('PENDING','ACCEPTED','REJECTED')`
- `dorm_management.sql:253` — `users.role ENUM('STUDENT','ADMIN')`

**Convention**: Match these exact ENUM string values in API payloads and Angular display logic.

---

## 10. File Metadata Indirection

File attachments (contract documents, receipt scans) are not stored directly on parent records. Instead, a `file_metadata` table holds `file_path` and `file_type`, and parent tables reference it via `*_file_id` foreign keys.

- `dorm_management.sql:127-134` — `file_metadata` table definition
- `dorm_management.sql:85` — `contracts.signed_document_file_id → file_metadata`
- `dorm_management.sql:182` — `rent_payments.receipt_file_id → file_metadata`
- `dorm_management.sql:34-36` — `application_files` join table linking applications to files

**Convention**: Never store a raw file path directly on a domain table. Create a `file_metadata` row first and reference its `file_id`.
