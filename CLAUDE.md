# Dormitory Management System (DMS)

Web-based system for managing student dormitories — rooms, residents, payments, complaints, and reports.
Roles: `ADMIN` (full access) and `STUDENT` (self-service).

---

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Frontend | Angular 21, TypeScript 5.9, SCSS        |
| Backend  | Node.js + Express.js (`server.js`)      |
| Database | MySQL 8.0 (`dorm_management`)           |
| Auth     | JWT (`jsonwebtoken`) + bcrypt           |
| Testing  | Vitest (frontend)                       |

> Node.js v22.12+ required for Angular 21 CLI.

---

## Key Directories

```
/                        — project root (backend entry + Angular workspace)
  server.js              — Express API server (all backend logic, single file)
  src/                   — Angular frontend source
    main.ts              — bootstrapApplication entry point
    styles.scss          — global CSS custom properties (design tokens)
    app/
      app.ts             — root AppComponent (RouterOutlet shell)
      app.config.ts      — Angular providers (router, etc.)
      app.routes.ts      — route definitions
      pages/
        home/            — public landing page
        login/           — credential form + simulated auth
        dashboard/       — admin dashboard (stats, sidebar, activity feed)
  Documentation/
    Final Design.pdf     — system design (ERD, class diagram, use cases)
    dorm_management.sql  — full DB schema + seed data
```

---

## Essential Commands

### Frontend

```bash
# Install dependencies
npm install

# Dev server (http://localhost:4200)
npm start

# Production build
npm run build

# Run tests (Vitest)
npm test

# Watch build
npm run watch
```

### Backend

```bash
# Start API server (http://localhost:3000)
node server.js
```

### Database

```bash
# Import schema and seed data
mysql -u root dorm_management < Documentation/dorm_management.sql
```

---

## REST API Endpoints (`server.js`)

| Method | Path                | Auth | Description            |
|--------|---------------------|------|------------------------|
| POST   | /api/register       | —    | Register user          |
| POST   | /api/login          | —    | Login → JWT token      |
| POST   | /api/applications   | JWT  | Submit dorm application|
| GET    | /api/applications   | JWT  | List all applications  |
| POST   | /api/contracts      | JWT  | Create contract        |
| POST   | /api/complaints     | JWT  | Submit complaint       |
| GET    | /api/complaints     | JWT  | List all complaints    |
| POST   | /api/payments       | JWT  | Record rent payment    |
| POST   | /api/reports        | JWT  | Generate report entry  |

Token must be passed as `Authorization` header (raw token, no Bearer prefix — `server.js:79`).

---

## Database Tables (`dorm_management.sql`)

`users` · `student_profiles` · `dorm_applications` · `application_files` ·
`contracts` · `complaints` · `rent_payments` · `reports` · `file_metadata` · `progress`

Status columns use MySQL ENUMs (e.g. `PENDING|ACCEPTED|REJECTED`, `ACTIVE|EXTENDED|TERMINATED`).

---

## Frontend Routes (`src/app/app.routes.ts`)

| Path         | Component          |
|--------------|--------------------|
| `/`          | HomeComponent      |
| `/login`     | LoginComponent     |
| `/dashboard` | DashboardComponent |
| `**`         | redirects to `/`   |

**Demo credentials** (hardcoded in `login.ts:35`): `admin@dms.com` / `admin123`

---

## Additional Documentation

Check these before making changes in the relevant domain:

| File                                    | When to read                                               |
|-----------------------------------------|------------------------------------------------------------|
| `.claude/docs/architectural_patterns.md`| Before adding components, API routes, or DB tables         |
| `Documentation/Final Design.pdf`        | For ERD, class diagrams, and use-case requirements         |
| `Documentation/dorm_management.sql`     | For exact column names, types, and FK relationships        |
