# JL Monitoring System — Development Plan

**Stack:** Laravel 13 · PHP 8.3+ · MySQL 8.0 · React 19 + Inertia.js v3 · Tailwind v4 · Laravel Reverb (WebSockets) · Firebase Cloud Messaging
**Status:** Live / Maintenance
**Last updated:** 2026-08-05
**Repo:** — *(fill in)* · **Prod URL:** — *(fill in)*

---

## Objectives

*What this project aims to accomplish and provide. These are descriptive goals, not tasks — 3 milestones max.*

1. **Digitize the JL approval chain** — Eliminate ad-hoc/paper-and-email routing of Justification Letter cost requests by replacing it with a single-table digital workflow (Pending → Reviewed → Approved → On Process) that auto-generates a serial number at approval and keeps a permanent audit trail.
2. **One dashboard per role, notified in real time** — Give requestors, reviewers, VP approvers, and purchasing their own dashboard with in-app + WebSocket + push notifications, so nothing depends on someone remembering to forward an email.
3. **Admin-maintainable without a developer** — Let an admin manage companies, departments, and user access, and move historical data between environments via CSV import/export, without needing code changes for routine upkeep.

---

## 1. Planning

| Status | Task | Notes |
|---|---|---|
| ✅ | Analyze requirements / problem statement | Captured directly in `README.md` ("About"/"Workflow") and `CLAUDE.md` (domain model, gotchas) rather than a separate requirements doc |
| ✅ | Set up Git repo & local dev environment | Laravel scaffold, `composer run dev` (server + queue + Vite concurrently); 60+ commits since initial scaffold |
| ✅ | Define scope — what's in, what's explicitly out | In: full workflow, notifications, CSV import/export, user management. Explicitly out: PDF/print generation — never built, not requested |

---

## 2. Design

| Status | Task | Notes |
|---|---|---|
| ✅ | Build static HTML/UI mockup | `index.html` at project root — every role as a tab (Login, Submit, My Requests, Reviewer, VP, Purchasing, Audit Trail) with an in-memory mock data store and the full status workflow |
| ✅ | Settle domain naming / glossary | `reference` vs `serial`, status enum, roles — defined in `CLAUDE.md`, consistent with the mockup's `generateSerial()` / `effectiveStatus()` logic |
| ✅ | Data model / database design | `database/migrations/` — 20 migrations, iterated from the mockup's data shape through to the real schema (see §3c) |

---

## 3. Build

*This is the working spec — the actual instruction set your coding agent follows.*

### 3a. Recommended tech per function

| Function | Default | Alternative / notes |
|---|---|---|
| Auth | External org Auth API (`LoginController`) | No local password validation, no self-registration — a `users` row must already exist locally by the external system's ID |
| Roles & permissions | `role` column on `users` + `CheckRole` middleware | Route-level `role:reviewer,admin` middleware in `routes/web.php`, not policies/gates |
| Core status flow | `JlEntry` status enum + per-action `abort_if` guards in `JlController` | No dedicated state-machine package; `On Hold` uses a `held_at` field to remember what status to resume into |
| Notifications | Laravel Reverb (WebSocket) + Firebase Cloud Messaging (push) + DB notifications | `JlNotification` class; VP-approval webhook also fires to an external system (e.g. Power Automate) |
| File attachments | Laravel local filesystem, one optional attachment per `JlEntry` | Upload/view/download routes; multipart PATCH gotcha — see `CLAUDE.md` |
| Backups + health check | `spatie/laravel-backup` ^10.3 → Google Drive | Scheduled: `backup:run` daily 19:00, `backup:clean` daily 05:00, `backup:monitor` daily |
| Audit trail | `JlAuditLog` — free-text `event` string, not an enum | Extend by adding a new string + a label in `EVENT_META`/`AuditTrail.tsx` |
| Testing | Pest | Only starter stubs exist (`tests/Feature/ExampleTest.php`, `tests/Unit/ExampleTest.php`) — no real coverage |

### 3b. Folder structure

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── JlController.php             # Submit, cancel/resubmit, workflow actions, VP webhook, notifications API, export
│   │   ├── LoginController.php          # External API auth + brute-force protection
│   │   ├── UserManagementController.php # Grant/revoke user access (admin)
│   │   └── MaintenanceController.php    # Companies/departments/JL entries CRUD + CSV import/export (admin)
│   ├── Middleware/
│   │   ├── CheckRole.php
│   │   └── HandleInertiaRequests.php
│   └── Requests/
│       └── StoreJlRequest.php
├── Models/
│   ├── User.php, JlEntry.php, JlAuditLog.php, AccessLog.php, Company.php, Department.php, FcmToken.php
└── Notifications/
    └── JlNotification.php

resources/js/
├── components/jl/       # JlTable, JlModal, StatusBadge, HoldModal, RejectModal, CancelModal, SubmitSummaryModal, AttachmentUploadModal, ExportModal
├── layouts/AppLayout.tsx
├── pages/
│   ├── auth/Login.tsx
│   ├── jl/{Submit,MyRequests,Reviewer,Vp,Purchasing,AuditTrail}.tsx
│   └── admin/{Users,Maintenance}.tsx
└── types/{auth,jl}.ts

routes/
├── web.php, channels.php, console.php

database/
├── migrations/   (20 files — see §3c)
└── seeders/      UserSeeder, CompanySeeder, DepartmentSeeder
```

### 3c. Data model — migrations & relationships

```
1. users              (id = external Auth API id, role enum: requestor|reviewer|vp|purchasing|admin, company, dept)
2. jl_entries          (title, date, company, manager, dept, amount, status enum, held_at, hold_reason,
                        approve_remarks, attachment, user_id, submitted_at/reviewed_at/approved_at, serial)
3. jl_audit_logs       (jl_entry_id FK, event string, actor, notes, timestamps)
4. companies           (name, code)
5. departments         (name)
6. access_logs         (login attempt / lockout tracking)
7. notifications        (Laravel's built-in DB notifications table)
8. fcm_tokens          (user_id FK, device token — for push)
```

**Relationship map:**
```
User  1─*  JlEntry  1─*  JlAuditLog
User  1─*  FcmToken
JlEntry  *─1  Company (string match, not FK)
JlEntry  *─1  Department (string match, not FK)
```

**Modeling decisions worth locking in:**
- One `status` enum column + a `held_at` side-field to remember the pre-hold status — not a separate boolean per stage. Keeps illegal states unrepresentable without a full state-machine package.
- `reference` (`JL-{id}-{year}`) is a computed accessor off the auto-increment `id` — permanent from creation. `serial` (`{FarmCode}-JL-{n}-{year}`) is written once at `approve()` via a live `COUNT(*)`, not a persisted sequence — the two are allowed to diverge in order; this is expected, not a bug.
- `company`/`dept` are plain strings on `jl_entries`, not foreign keys to `companies`/`departments` — renaming a company requires a manual backfill `UPDATE jl_entries` or `generateSerial()`'s per-company count silently breaks.

### 3d. Module ↔ mockup mapping

| Mockup tab (static, `index.html`) | Real route | Component |
|---|---|---|
| Login | `/login` | `pages/auth/Login.tsx` |
| Submit Form | `/` | `pages/jl/Submit.tsx` |
| My Requests | `/my-requests` | `pages/jl/MyRequests.tsx` |
| Reviewer | `/reviewer` | `pages/jl/Reviewer.tsx` |
| VP Approver | `/vp` | `pages/jl/Vp.tsx` |
| Purchasing | `/purchasing` | `pages/jl/Purchasing.tsx` |
| Audit Trail | `/admin/audit-trail` | `pages/jl/AuditTrail.tsx` |
| *(not in mockup)* | `/admin/users` | `pages/admin/Users.tsx` — added after the mockup, no static tab exists for it |
| *(not in mockup)* | `/admin/maintenance` | `pages/admin/Maintenance.tsx` — added after the mockup, no static tab exists for it |

### 3e. Build order

Each phase ends runnable and demoable. Don't start a phase before the previous one's tests pass.

#### Phase 0 — Foundation
- ✅ External Auth API login, brute-force lockout, Cloudflare Turnstile
- ✅ `CheckRole` middleware + role-aware `AppLayout` nav

#### Phase 1 — Reference data
- ✅ Company/Department seeders + admin Maintenance CRUD + CSV import/export

#### Phase 2 — Core + state machine
- ✅ `JlEntry` status enum, `JlController` per-action guards, `JlAuditLog` on every transition
- ⚠️ Built without automated tests locking the transition guards in place — see §4

#### Phase 3 — Workflow modules
- ✅ Submit → Reviewer → VP → Purchasing dashboards; cancel/resubmit; On Hold/On Process; attachments; VP re-approval + reject-after-approval window

#### Phase 4 — Notifications & admin
- ✅ Reverb WebSocket + FCM push + DB notifications; VP-approval webhook; User Management page

#### Phase N — Hardening *(carry lessons from prior projects forward as a checklist)*
- [ ] Automated test suite covering status-transition guards and `generateSerial()`
- [ ] Formal authorization pass on role guards + VP re-approval/reject-window edge cases
- [x] Config-level go-live checklist (in `README.md`) — followed operationally, not yet formalized as a repeatable gate

---

## 4. Testing & Hardening

| Status | Task | Notes |
|---|---|---|
| ⬜ | Automated test suite green | `tests/` only has the Pest starter stubs (`ExampleTest.php`) — zero coverage of the state machine, role guards, or serial generation |
| 🟡 | Hardening checklist | Config/security checklist exists in `README.md` ("Important checklist before going live") and is followed operationally; no formal authorization/pen-test pass on role guards or the VP re-approval/reject-window logic |
| ❓ | UAT / stakeholder acceptance | System is already live (§5), implying informal acceptance happened, but no tracked/documented UAT step exists |

---

## 5. Deployment

| Status | Task | Notes |
|---|---|---|
| ✅ | Production environment/config ready | Production Docker deployment exists and is reachable |
| ✅ | Data & auth cutover | External Auth API integration live; no local password path |
| ✅ | Scheduler running | `backup:run` (19:00 daily), `backup:clean` (05:00 daily), `backup:monitor` (daily) — backups pushed to Google Drive |
| ✅ | Go Live | System is live and taking real submissions |

---

## 6. Post-Launch

| Status | Task | Notes |
|---|---|---|
| 🔵 | Post-launch check-in | Ongoing — steady stream of feature/fix commits since go-live (latest: approval remarks functionality) |
| ⬜ | System turnover / sign-off | No formal handoff/turnover document exists yet |

---

## Known Gaps / Deferred

*Things intentionally not done yet — the honest list, not a to-do list.*

- No automated test suite — the biggest real risk; the status-transition guards and `generateSerial()` have no regression protection.
- No formal authorization/pen-test pass on role guards or the VP re-approval/reject-after-approval window logic.
- No PDF/print generation for JL forms — never built, not currently requested.
- No formal UAT or system-turnover documentation — the system went live without a tracked acceptance artifact.

---

**Status legend:** ✅ Done · 🟡 In Progress · ⬜ Not Started · ❓ Unknown · 🔵 Ongoing
