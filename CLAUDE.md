# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev (runs server + queue listener + vite concurrently)
composer run dev

# Lint / format
composer run lint          # pint --parallel (PHP)
composer run lint:check    # pint --test (check only, no changes)
npm run lint                # eslint --fix
npm run lint:check
npm run format               # prettier --write resources/
npm run format:check

# Type checking
npm run types:check         # tsc --noEmit (frontend)
composer run types:check    # phpstan analyse (backend)

# Tests (Pest)
php artisan test
php artisan test --filter=TestName     # single test
php artisan test tests/Feature/SomeTest.php

# Full CI gate (lint + format + types + tests, all langs)
composer run ci:check

# Build
npm run build
npm run build:ssr
```

No real test suite exists yet — `tests/` only has the Pest/PHPUnit starter stubs. Don't assume coverage exists for any workflow described below.

## Architecture

Laravel 13 + Inertia.js v3 + React 19 (Tailwind v4). Inertia means there is no separate API layer — controllers return `Inertia::render()` with props typed by hand-written interfaces in `resources/js/types/`; keep those in sync manually when a controller's returned shape changes.

**Domain model is a single-table workflow.** `JlEntry` (`jl_entries`) is one row per Justification Letter request, driven entirely by a `status` enum (`Pending → Reviewed → Approved → On Process`, with `Rejected`/`VP Rejected`/`On Hold`/`Cancelled` as branches). There is no separate state machine package — `JlController` methods (`review`, `approve`, `reject`, `hold`, `process`, `cancel`, `resubmit`) each do their own `abort_if` guard against the *current* status (accounting for `On Hold`'s `held_at` field, which remembers what status to return to) before transitioning. Every transition also writes a row to `JlAuditLog` (free-text `event` string, not an enum — extend by just using a new string and adding a label in the frontend `EVENT_META`/`AuditTrail.tsx`).

**Two identifiers, generated completely differently, easy to conflate:**
- `reference` (`JL-{id}-{year}`) is a computed Eloquent accessor, not a column — it's just the row's own auto-increment `id`, zero-padded, permanent from creation.
- `serial` (`{FarmCode}-JL-{n}-{year}`) is written once, at `approve()`, by `JlController::generateSerial()` — a live `COUNT(*)` of already-serialed entries for that company this year, **not** a persisted sequence. Serial order reflects approval order; reference order reflects submission order. These diverge whenever approvals happen out of submission order — this is expected, not a bug.

**Roles are enforced by `role:` middleware** (`CheckRole`) reading `auth()->user()->role`, checked per-route in `routes/web.php`. `requestor` is the public-facing role (submit + track own requests); `reviewer`/`vp`/`purchasing` are the approval pipeline; `admin` can do everything. A requestor's `company`/`dept` live on the `users` table — `dept` is always forced server-side to the account's value on submit/resubmit regardless of what the client sends (the field is disabled client-side, but that's UX only, not a security boundary); `company` is user-editable.

**Auth is fully external.** `LoginController` validates credentials against the org's external Auth API, then resolves a local `User` row by the ID that API returns — there is no local password check and no local registration. If a `users` row with that ID doesn't exist, login fails with "not authorized," even with correct org credentials. Granting access happens through the User Management page, which writes that row using the *external* system's ID as the local primary key.

**CSV import/export (`MaintenanceController`) exists for redeploying to a new environment** — Companies, Departments, and historical `JlEntry` rows can be exported and reimported elsewhere. The importer is defensive by design (skips/report bad rows rather than throwing, dedupes on `serial` collisions) because it was built after several real historical-data migrations turned up messy source data.

## Gotchas

- **PHP does not parse `multipart/form-data` bodies on PATCH/PUT/DELETE, only POST.** Any Inertia `form.patch()`/`form.put()` carrying a file arrives with a completely empty request. Fix: `form.transform(data => ({ ...data, _method: 'patch' }))` and call `form.post()` instead — Laravel's method-parameter-override (enabled by default) routes it correctly while the transport stays POST so PHP parses it. See `Submit.tsx`'s resubmit path.
- **InnoDB will not let you lower `AUTO_INCREMENT` once rows have used a higher value** — `ALTER TABLE ... AUTO_INCREMENT = N` silently no-ops if `N` is below the engine's internal counter, even on an empty table. The only reliable reset is `TRUNCATE` (disable `FOREIGN_KEY_CHECKS` first if `jl_audit_logs` has rows, since it has a real FK to `jl_entries`). This matters a lot here because `reference` is id-derived — a stray test INSERT that gets deleted still leaves a permanent gap.
- **Local and production databases are not guaranteed to be in sync**, and row `id` is not portable between them — the same conceptual record can have a different `id` on each side if they were seeded/imported in different orders. Never write an `UPDATE ... WHERE id = N` derived from one environment against another without re-querying that specific environment first.
- **`Company`/`Department` are plain strings on `jl_entries.company`/`.dept`, not foreign keys.** Renaming a company in the `companies` table does nothing to existing `jl_entries` rows — they keep the old string and silently stop matching, which breaks `generateSerial()`'s per-company lookup and continuation counting. Any company/department rename must be paired with an `UPDATE jl_entries SET company = ...` for affected rows.
- `JlController::export()`'s CSV is ordered newest-first (`submitted_at DESC`). Reimporting it as-is (via `MaintenanceController::importJlEntries()`) will not preserve the original id/reference order — re-sort ascending by `Submitted` first if id alignment with a source system matters.
- A number of components (`JlTable`, `JlModal`, `HoldModal`, `RejectModal`, `ExportModal`, `Login.tsx`, `Submit.tsx`) use `class=` instead of `className=` on a few FontAwesome `<i>`/icon elements — this is pre-existing throughout the codebase (not something to "fix" reflexively) and accounts for the ~21 recurring `tsc --noEmit` errors that have nothing to do with whatever you just changed.
