# JL Monitoring System

> A Justification Letter form approval workflow for tracking and approving JL (Justification Letter) requests across company farms and departments.

![Laravel](https://img.shields.io/badge/Laravel-13.x-red?logo=laravel)
![PHP](https://img.shields.io/badge/PHP-8.3+-blue?logo=php)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![Inertia](https://img.shields.io/badge/Inertia.js-v3-purple)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Table of Contents

- [About](#about)
- [Tech Stack](#tech-stack)
- [User Roles](#user-roles)
- [Workflow](#workflow)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Folder Structure](#folder-structure)
- [Deployment](#deployment)

---

## About

The JL Monitoring System is an internal web application for submitting, reviewing, and approving Justification Letter (JL) cost forms across the organization's farms and departments. Requestors log in to submit a JL form and track its status, which is then routed through a multi-step approval workflow before a system-generated serial number is assigned.

**Key features:**

- Login required end-to-end — no public/anonymous submissions; every role (including `requestor`) must authenticate
- My Requests — requestors can track every JL form they've submitted, cancel a still-Pending request, or edit-and-resubmit a Rejected one under the same reference number
- Pre-submit confirmation step — requestors review a full summary before a form is actually submitted
- Reviewer dashboard — mark submitted forms as Reviewed and forward to VP Approver, reject, or hold
- VP Approver dashboard — final approval with auto-generated serial number (e.g. `BFC-JL-001-2026`); can **re-approve** an entry it previously VP-rejected, and can **reject an already-Approved entry** for as long as Purchasing hasn't acted on it yet — the modal shows an inline notice once that window has closed
- Purchasing dashboard — mark approved forms On Process or place them On Hold
- On Hold / On Process actions are available directly inside the shared approval-preview modal (role- and status-aware), not just the table's action menu
- Paginated list tables with a page-size selector across all dashboards
- CSV import/export — role-scoped export with status and date range filtering, plus admin-only import for companies, departments, and historical JL entries (used for redeploying to a new environment)
- Real-time in-app notifications via Laravel Reverb (WebSocket) — bell icon with unread count
- OS-level web push notifications via Firebase Cloud Messaging (FCM) — alerts even when the tab is closed
- Outbound VP-approval webhook — notifies an external system (email + platform name + approval link) the moment an entry reaches the VP's queue
- Role-based access control — requestor, reviewer, VP, purchasing, and admin roles with route-level guards
- User Management — grant or revoke system access for any organization user via external API lookup
- Maintenance — admin can dynamically manage companies and departments, and import/export CSV data for redeployment
- Authentication via the organization's centralized external auth API (no local password validation)
- Brute-force protection — 3 failed attempts triggers a 15-minute lockout
- Cloudflare Turnstile bot protection on login

---

## Tech Stack

| Layer         | Technology                          |
|---------------|-------------------------------------|
| Framework     | Laravel 13.x                        |
| Language      | PHP 8.3+                            |
| Database      | MySQL 8.0                           |
| Cache         | Database (Laravel Cache)            |
| Frontend      | React 19 + Inertia.js v3            |
| CSS           | Tailwind CSS v4                     |
| WebSockets    | Laravel Reverb (self-hosted)        |
| Push (FCM)    | Firebase Cloud Messaging            |
| Bot protection| Cloudflare Turnstile                |
| Auth          | External organization Auth API      |

---

## User Roles

| Role         | Access                                                                                          |
|--------------|---------------------------------------------------------------------------------------------------|
| `requestor`  | Submit Form, My Requests (view own status, cancel while Pending, edit-and-resubmit if Rejected)  |
| `reviewer`   | Reviewer Dashboard (review, reject, hold), CSV export                                            |
| `vp`         | VP Approver Dashboard (approve, re-approve, reject, hold), CSV export                            |
| `purchasing` | Purchasing Dashboard (process, hold), CSV export                                                 |
| `admin`      | All pages including User Management, Maintenance, and Audit Trail                                |

Roles are assigned by an admin through the User Management page. Authentication is handled by the organization's external API — no local passwords are validated.

---

## Workflow

```
  Pending  ──── Reviewer ────► Reviewed ──── VP ────► Approved ──── Purchasing ────► On Process
      │              │               │          │            │               │
      │           Reject          VP Reject   Hold         Hold            Hold
      │              │               │          │            │               │
      ▼              ▼               ▼          ▼            ▼               ▼
  Cancelled      Rejected        VP Rejected  On Hold      On Hold         On Hold
```

`On Hold` remembers the status it was held from (`held_at`) and resumes back into it. A form's `reference` (`JL-{id}-{year}`) is permanent from submission; its `serial` (`{FarmCode}-JL-{n}-{year}`) is assigned only at approval, so the two can fall out of order if approvals happen out of submission order — this is expected.

**VP re-approval / reject-after-approval rules:**

- An entry the VP previously **VP-rejected** can be **re-approved**, generating a fresh serial number.
- The VP can **reject an already-Approved entry**, but only while it's still literally `Approved` — the instant Purchasing marks it On Process (or holds it at that stage), the window closes and the modal shows an inline notice explaining why rejection is no longer available.

**Notification triggers:**

| Event                        | Notifies (in-app + FCM)   | External webhook                |
|------------------------------|---------------------------|----------------------------------|
| New form submitted           | Reviewers + Admin         | —                                |
| Reviewer marks Reviewed      | VP + Admin                | VP approval webhook (see below) |
| VP approves                  | Purchasing + Admin        | —                                |
| Reviewer rejects             | —                         | —                                |
| VP rejects                   | Reviewers + Admin         | —                                |
| Any role puts on hold        | Reviewers / VP / Admin    | —                                |
| Purchasing marks On Process  | Reviewers + VP + Admin    | —                                |

**VP approval webhook** — when an entry reaches the VP's queue (`Pending → Reviewed`), the app POSTs to an external URL (e.g. a Power Automate flow) so a separate tool can notify the VP outside the app. Silently disabled if `VP_APPROVAL_WEBHOOK_URL` is blank, and failures never block the actual review action.

```json
POST {VP_APPROVAL_WEBHOOK_URL}
Headers: x-api-key: {VP_APPROVAL_WEBHOOK_API_KEY}, Accept: application/json

{
  "email": "<pulled live from the users table, role=vp>",
  "platform": "JL Monitoring",
  "url": "<link to the VP dashboard>"
}
```

---

## Prerequisites

- **PHP** >= 8.3 with extensions: `mbstring`, `xml`, `pdo_mysql`, `curl`, `zip`, `openssl` (openssl required for FCM JWT signing)
- **Composer** >= 2.x
- **Node.js** >= 20.x and **npm** >= 10.x
- **MySQL** >= 8.0
- `cacert.pem` — SSL certificate bundle used for external API calls (obtain from any existing system's `storage/` folder)

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/jlm-system.git
cd jlm-system

# 2. Install PHP dependencies
composer install

# 3. Copy environment file and fill in values
cp .env.example .env

# 4. Generate application key
php artisan key:generate

# 5. Configure your database in .env, then run migrations
php artisan migrate

# 6. Seed the database (admin user + default companies + departments)
php artisan db:seed

# 7. Copy cacert.pem to the storage directory
cp /path/to/cacert.pem storage/cacert.pem

# 8. Install Node dependencies and build assets
npm install
npm run build
```

> **First login:** The seeder creates an admin user with `id=61` (`admin_it@bfcgroup.org`). Use the organization credentials to log in. Additional users are granted access through the User Management page.

---

## Environment Variables

Copy `.env.example` to `.env` and update the values below.

```env
# Application
APP_NAME="JL Monitoring System"
APP_ENV=production       # local | staging | production
APP_DEBUG=false          # Set to false in production
APP_URL=https://your-domain.com

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=jlms_database
DB_USERNAME=root
DB_PASSWORD=your_password

# External Auth API — credentials against the organization's auth server
AUTH_API_BASE_URI=https://your-auth-server.com
AUTH_API_KEY=            # Bearer token for /api/v1/auth/login
AUTH_USER_API_KEY=       # API key for /api/v1/users/get-user-id

# User Listing API — used in the User Management page to fetch all org users
USER_API_ENDPOINT=https://your-auth-server.com/api/v1/users
USER_API_KEY=            # API key for the user listing endpoint

# Cloudflare Turnstile — bot protection on the login form
# Get keys from dash.cloudflare.com → Turnstile
# Set TURNSTILE_VERIFY=false in local dev (Cloudflare blocks localhost)
TURNSTILE_VERIFY=true
TURNSTILE_SITE_KEY=      # Public site key (shown in the widget)
TURNSTILE_SECRET_KEY=    # Secret key (used for server-side verification)

# VP approval webhook — fires when an entry reaches "Reviewed" (VP's queue)
# Leave VP_APPROVAL_WEBHOOK_URL blank to disable entirely. Email is pulled live
# from the users table (role=vp), never set here.
VP_APPROVAL_WEBHOOK_URL=
VP_APPROVAL_WEBHOOK_API_KEY=

# Laravel Reverb — WebSocket server for real-time in-app notifications
# Auto-generated by: php artisan reverb:install
REVERB_APP_ID=
REVERB_APP_KEY=
REVERB_APP_SECRET=
REVERB_HOST=your-domain.com   # Use 'localhost' for local dev
REVERB_PORT=8080
REVERB_SCHEME=https           # Use 'http' for local dev

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"

# Firebase Cloud Messaging — OS-level web push notifications
# Requires HTTPS. Cannot be tested on plain HTTP local domains.
# Backend: Firebase Console → Project Settings → Service Accounts → Generate new private key
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=    # Full PEM key with literal \n line breaks

# Frontend: Firebase Console → Project Settings → General → Your apps → Web app
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# VAPID key: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
VITE_FIREBASE_VAPID_KEY=
```

> **SSL:** All external API calls use `storage/cacert.pem` for SSL verification. Make sure this file exists before deploying.

> **Never commit your `.env` file.** It is already listed in `.gitignore`.

---

## Running Locally

Three processes need to run simultaneously — each in its own terminal:

```bash
# Terminal 1 — Laravel dev server
php artisan serve

# Terminal 2 — Vite frontend hot reload
npm run dev

# Terminal 3 — Reverb WebSocket server (required for real-time notifications)
php artisan reverb:start
```

The app will be available at `http://localhost:8000`. Every page, including the submit form at `/`, requires login.

---

## Folder Structure

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── JlController.php             # Submit, cancel/resubmit, all workflow actions, VP webhook, notifications API, export
│   │   ├── LoginController.php          # External API auth + brute-force protection
│   │   ├── UserManagementController.php # Grant/revoke user access (admin)
│   │   └── MaintenanceController.php    # Companies/departments/JL entries CRUD + CSV import/export (admin)
│   ├── Middleware/
│   │   ├── CheckRole.php                # Role guard (role:reviewer,admin etc.)
│   │   └── HandleInertiaRequests.php    # Shares auth + flash data to all pages
│   └── Requests/
│       └── StoreJlRequest.php           # JL form validation
├── Models/
│   ├── User.php
│   ├── JlEntry.php
│   ├── JlAuditLog.php
│   ├── AccessLog.php
│   ├── Company.php
│   ├── Department.php
│   └── FcmToken.php                     # Stores per-device FCM push tokens
└── Notifications/
    └── JlNotification.php               # Database + broadcast notification class

database/
├── migrations/
│   ├── 0001_01_01_000000_create_users_table.php
│   ├── 2026_06_22_000000_create_jl_entries_table.php
│   ├── 2026_06_22_000002_create_access_logs_table.php
│   ├── 2026_06_23_000001_create_companies_table.php
│   ├── 2026_06_23_000002_create_departments_table.php
│   ├── 2026_06_30_000001_add_on_hold_on_process_to_jl_entries.php
│   ├── 2026_07_01_070922_create_notifications_table.php
│   ├── 2026_07_02_040804_create_fcm_tokens_table.php
│   ├── 2026_07_03_000001_add_hold_reason_to_jl_entries.php
│   └── 2026_07_07_000001_add_purchasing_to_users_role_enum.php
└── seeders/
    ├── UserSeeder.php          # Seeds the initial admin user (id=61)
    ├── CompanySeeder.php       # Seeds default companies
    └── DepartmentSeeder.php    # Seeds default departments

routes/
├── web.php                     # All HTTP routes
├── channels.php                # Reverb private channel authorization
└── console.php

resources/js/
├── components/
│   ├── jl/
│   │   ├── JlTable.tsx              # Shared table with kebab action menu
│   │   ├── JlModal.tsx              # Entry detail modal — approve/reject/hold/process actions, role- and status-aware
│   │   ├── StatusBadge.tsx          # Color-coded status pill
│   │   ├── HoldModal.tsx            # On Hold confirmation modal with optional reason
│   │   ├── RejectModal.tsx          # Reject confirmation modal with optional reason
│   │   ├── CancelModal.tsx          # Requestor cancel-submission confirmation
│   │   ├── SubmitSummaryModal.tsx   # Pre-submit review/summary confirmation step
│   │   ├── AttachmentUploadModal.tsx# Attachment-only upload for entries missing one
│   │   └── ExportModal.tsx          # CSV export modal with status + date filters
│   ├── Pagination.tsx          # Page-size selector + page nav, shared across list tables
│   └── NotificationBell.tsx    # Real-time notification bell (navbar, WebSocket)
├── hooks/
│   └── usePagination.ts        # Client-side pagination state hook
├── layouts/
│   └── AppLayout.tsx           # Nav bar with role-aware tabs, notification bell, FCM registration + foreground toast
├── pages/
│   ├── auth/Login.tsx
│   ├── jl/
│   │   ├── Submit.tsx          # JL submission form (requestor login required)
│   │   ├── MyRequests.tsx      # Requestor's own submissions — cancel, edit & resubmit, upload attachment
│   │   ├── Reviewer.tsx        # Reviewer dashboard
│   │   ├── Vp.tsx              # VP Approver dashboard
│   │   ├── Purchasing.tsx      # Purchasing dashboard
│   │   └── AuditTrail.tsx      # Full audit log (admin)
│   └── admin/
│       ├── Users.tsx           # User Management page
│       └── Maintenance.tsx     # Companies/departments management + CSV import/export
├── firebase.ts                 # FCM token registration + foreground message listener
└── types/
    ├── auth.ts
    └── jl.ts

public/
└── firebase-messaging-sw.js    # Service worker for background FCM push notifications

storage/
└── cacert.pem                  # SSL cert bundle for external API calls (not committed)
```

---

## Deployment

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install dependencies
composer install --no-dev --optimize-autoloader
npm install && npm run build

# 3. Run any new migrations
php artisan migrate --force

# 4. Clear and re-cache config
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

**Reverb in production** — use a process manager to keep Reverb running:

```ini
# /etc/supervisor/conf.d/reverb.conf
[program:reverb]
command=php /var/www/jlm-system/artisan reverb:start --host=0.0.0.0 --port=8080
autostart=true
autorestart=true
user=www-data
redirect_stderr=true
stdout_logfile=/var/log/reverb.log
```

```bash
supervisorctl reread && supervisorctl update && supervisorctl start reverb
```

**Important checklist before going live:**

- [ ] `APP_DEBUG=false` in `.env`
- [ ] `APP_ENV=production` in `.env`
- [ ] All `AUTH_API_*` and `USER_API_*` values set
- [ ] `TURNSTILE_VERIFY=true`, `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` set (from dash.cloudflare.com)
- [ ] `REVERB_*` values set and Reverb running under a process manager
- [ ] `VITE_REVERB_*` values set before running `npm run build`
- [ ] `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` set (backend FCM)
- [ ] All `VITE_FIREBASE_*` values set before running `npm run build` (frontend FCM)
- [ ] `VITE_FIREBASE_VAPID_KEY` set (required for push permission in browser)
- [ ] `storage/cacert.pem` is present on the server
- [ ] `VP_APPROVAL_WEBHOOK_URL` and `VP_APPROVAL_WEBHOOK_API_KEY` set if the external VP-notification webhook is in use
- [ ] `php artisan db:seed` has been run (admin user + companies + departments)
- [ ] File permissions: `storage/` and `bootstrap/cache/` are writable
- [ ] Reverse proxy (nginx/Apache) configured to forward WebSocket traffic on port 8080
- [ ] Site served over **HTTPS** — FCM web push and service workers require it
