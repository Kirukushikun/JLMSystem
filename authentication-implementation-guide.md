# Authentication Implementation Guide

A reusable reference for implementing the organization's standard login system in any Laravel application. The core authentication flow is identical across all systems; the only decision point is the **authorization strategy** you choose for that system.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Login Flow Diagram](#2-login-flow-diagram)
3. [Step 1 — Environment Variables](#3-step-1--environment-variables)
4. [Step 2 — Database Tables](#4-step-2--database-tables)
5. [Step 3 — Models](#5-step-3--models)
6. [Step 4 — Login View](#6-step-4--login-view)
7. [Step 5 — Routes](#7-step-5--routes)
8. [Step 6 — LoginController](#8-step-6--logincontroller)
9. [Step 7 — AuthenticationController (App-to-App Login)](#9-step-7--authenticationcontroller-app-to-app-login)
10. [Step 8 — Authorization Strategy](#10-step-8--authorization-strategy)
    - [Option A — Role-Based (1:1)](#option-a--role-based-11)
    - [Option B — Module-Based (1:many)](#option-b--module-based-1many)
11. [Step 9 — Register Middleware](#11-step-9--register-middleware)
12. [Step 10 — Config: External Auth API](#12-step-10--config-external-auth-api)
13. [Security Behaviors Summary](#13-security-behaviors-summary)
14. [Part 2 — User Access Management](#14-part-2--user-access-management)
15. [Checklist for New System](#15-checklist-for-new-system)

---

## 1. Architecture Overview

```
[Browser]
    │
    │  POST /login (email + password)
    ▼
[LoginController]
    │
    ├──► [Cache] Check lockout (3 strikes → 15-min ban)
    │
    ├──► [External Auth API] POST /api/v1/auth/login
    │         └── Returns: token, expires_at, email
    │
    ├──► [External User API] GET /api/v1/users/get-user-id?email=...
    │         └── Returns: local user ID
    │
    ├──► [Local DB: users table] User::find(id)
    │         └── Must exist → Auth::loginUsingId()
    │
    ├──► [Cache] Clear or increment attempts
    │
    └──► [DB: access_logs] Record attempt (success/fail, IP, UA)
```

There is a secondary login path (`/app-login/{id}`) used for internal system-to-system redirects, where a trusted encrypted user ID is passed directly to bypass the password flow.

---

## 2. Login Flow Diagram

```
User submits form
        │
        ▼
Is account locked? ──Yes──► Return error with remaining lock time
        │ No
        ▼
Call external auth API
        │
  Successful? ──No──► Increment attempts → maybe lock → return error
        │ Yes
        ▼
Store token + email in session
        │
        ▼
Call user-id API with email
        │
  Successful? ──No──► Return "Failed to retrieve user info"
        │ Yes
        ▼
Find user in local DB
        │
  Found? ──No──► Increment attempts → Log fail → "Not authorized"
        │ Yes
        ▼
Clear attempts → Log success → Auth::loginUsingId() → redirect
```

---

## 3. Step 1 — Environment Variables

```env
# External Auth API
AUTH_API_BASE_URI=https://your-auth-server.com
AUTH_API_KEY=your_bearer_token_here
AUTH_USER_API_KEY=your_user_lookup_api_key_here

# External User Listing API (for User Management panel)
USER_API_ENDPOINT=https://your-auth-server.com/api/v1/users
USER_API_KEY=your_user_listing_api_key_here
```

---

## 4. Step 2 — Database Tables

### access_logs

```php
Schema::create('access_logs', function (Blueprint $table) {
    $table->id();
    $table->string('email');
    $table->boolean('success');
    $table->string('ip_address');
    $table->string('user_agent')->nullable();
    $table->timestamps();
});
```

### users

The `users` table structure depends on which authorization strategy you choose. The core columns are always the same; the access column differs.

**Core columns (always required):**

| Column     | Type    | Notes                                       |
|------------|---------|---------------------------------------------|
| `id`       | bigint  | Must match the ID returned by the user API  |
| `name`     | string  |                                             |
| `email`    | string  | unique                                      |
| `password` | string  | Placeholder only — auth is external         |
| timestamps |         |                                             |

**Authorization column — pick one:**

| Strategy        | Column   | Type                          |
|-----------------|----------|-------------------------------|
| Role-based (1:1)   | `role` | `enum('roleA','roleB',...)` |
| Module-based (1:many) | `access` | `json`                  |

**Example migration (role-based):**
```php
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('email')->unique();
    $table->string('password');
    $table->enum('role', ['reviewer', 'vp', 'admin'])->default('reviewer');
    $table->timestamps();
});
```

**Example migration (module-based):**
```php
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('email')->unique();
    $table->string('password');
    $table->json('access')->nullable();
    $table->timestamps();
});
```

---

## 5. Step 3 — Models

### `app/Models/AccessLog.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccessLog extends Model
{
    protected $fillable = ['email', 'success', 'ip_address', 'user_agent'];

    protected function casts(): array
    {
        return ['success' => 'boolean'];
    }
}
```

### `app/Models/User.php`

**Role-based:**
```php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    protected $fillable = ['name', 'email', 'password', 'role'];
    protected $hidden   = ['password'];

    protected function casts(): array
    {
        return ['password' => 'hashed'];
    }
}
```

**Module-based:**
```php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    protected $fillable = ['name', 'email', 'password', 'access'];
    protected $hidden   = ['password'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'access'   => 'array',
        ];
    }
}
```

---

## 6. Step 4 — Login View

The login view is a simple form — email, password (with show/hide toggle), and a submit button. The implementation depends on your stack:

- **Blade** — standard `<form action="{{ route('login.post') }}" method="POST">` with `@csrf`
- **Inertia/React** — use `useForm` from `@inertiajs/react`, call `form.post('/login')`

Display errors under the `email` key (our controller uses `withErrors(['email' => '...'])`).

**Inertia/React example:**
```tsx
const form = useForm({ email: '', password: '' });

form.post('/login'); // on submit

{form.errors.email && <p className="text-red-500">{form.errors.email}</p>}
```

**Blade example:**
```blade
@if ($errors->has('email'))
    <p class="text-red-500">{{ $errors->first('email') }}</p>
@endif

<form action="{{ route('login.post') }}" method="POST">
    @csrf
    <input name="email" type="email" value="{{ old('email') }}" required>
    <input name="password" type="password" required>
    <button type="submit">Login</button>
</form>
```

---

## 7. Step 5 — Routes

```php
// Public
Route::get('/login', [LoginController::class, 'showLogin'])->name('login');
Route::post('/login', [LoginController::class, 'postLogin'])->name('login.post');
Route::get('/app-login/{id}', [AuthenticationController::class, 'app_login'])->name('app.login');

// Protected
Route::middleware('auth')->group(function () {
    Route::post('/logout', [LoginController::class, 'logout'])->name('logout');

    // Role-based example:
    Route::get('/dashboard', fn() => ...)->middleware('role:admin,reviewer');

    // Module-based example:
    Route::get('/dashboard', fn() => ...)->middleware('module:MODULE_CODE');
});
```

---

## 8. Step 6 — LoginController

This controller is identical regardless of which authorization strategy you use. The only part that varies is the **redirect after successful login** — route to wherever makes sense for your system.

```php
<?php

namespace App\Http\Controllers;

use App\Models\AccessLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class LoginController extends Controller
{
    private const MAX_ATTEMPTS    = 3;
    private const LOCKOUT_SECONDS = 900; // 15 minutes

    public function showLogin(): Response
    {
        return Inertia::render('auth/Login');
        // Blade: return view('auth.login');
    }

    public function postLogin(Request $request): RedirectResponse
    {
        $email = $request->input('email');

        if ($this->isLocked($email)) {
            return back()->withErrors([
                'email' => 'Account temporarily locked. Please try again in 15 minutes.',
            ])->withInput();
        }

        try {
            $base_uri          = config('services.auth_api.base_uri');
            $api_key           = config('services.auth_api.api_key');
            $auth_user_api_key = config('services.auth_api.auth_user_api_key');

            // Step 1 — validate credentials against the external Auth API
            $authResponse = Http::withHeaders([
                'Authorization' => 'Bearer ' . $api_key,
                'Accept'        => 'application/json',
                'Content-Type'  => 'application/json',
            ])->withOptions(['verify' => storage_path('cacert.pem')])
              ->post($base_uri . '/api/v1/auth/login', [
                  'email'    => $email,
                  'password' => $request->input('password'),
              ]);

            if (! $authResponse->successful()) {
                $this->incrementAttempts($email);
                $this->logAccess($email, false, $request);

                $left    = self::MAX_ATTEMPTS - $this->getAttempts($email);
                $message = $authResponse->json()['message'] ?? 'Incorrect email or password.';

                if ($left > 0) {
                    $message .= " {$left} attempt(s) remaining.";
                }

                return back()->withErrors(['email' => $message])->withInput();
            }

            $data  = $authResponse->json();
            $email = $data['email'] ?? $email;

            session([
                'auth_token'    => $data['token'] ?? null,
                'token_expires' => $data['expires_at'] ?? null,
                'email'         => $email,
            ]);

            // Step 2 — resolve the local user ID from the external User API
            $userResponse = Http::withHeaders([
                'x-api-key'    => $auth_user_api_key,
                'Accept'       => 'application/json',
                'Content-Type' => 'application/json',
            ])->withOptions(['verify' => storage_path('cacert.pem')])
              ->get($base_uri . '/api/v1/users/get-user-id', ['email' => $email]);

            if (! $userResponse->successful()) {
                return back()->withErrors([
                    'email' => 'Failed to retrieve user information from the system.',
                ])->withInput();
            }

            $user = User::find($userResponse->json()['id'] ?? null);

            if (! $user) {
                $this->incrementAttempts($email);
                $this->logAccess($email, false, $request);

                return back()->withErrors([
                    'email' => 'You are not authorized to access this system.',
                ])->withInput();
            }

            $this->clearAttempts($email);
            $this->logAccess($email, true, $request);
            Auth::loginUsingId($user->id);

            // ↓ Customize this redirect for your system
            return redirect()->intended('/');

        } catch (\Exception $e) {
            $this->incrementAttempts($email);
            $this->logAccess($email, false, $request);

            return back()->withErrors([
                'email' => 'Authentication service error. Please try again.',
            ])->withInput();
        }
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    private function isLocked(string $email): bool
    {
        return Cache::has('login_lockout_' . sha1($email));
    }

    private function getAttempts(string $email): int
    {
        return Cache::get('login_attempts_' . sha1($email), 0);
    }

    private function incrementAttempts(string $email): void
    {
        $key      = 'login_attempts_' . sha1($email);
        $attempts = $this->getAttempts($email) + 1;

        Cache::put($key, $attempts, now()->addMinutes(15));

        if ($attempts >= self::MAX_ATTEMPTS) {
            Cache::put('login_lockout_' . sha1($email), true, self::LOCKOUT_SECONDS);
        }
    }

    private function clearAttempts(string $email): void
    {
        Cache::forget('login_attempts_' . sha1($email));
        Cache::forget('login_lockout_' . sha1($email));
    }

    private function logAccess(string $email, bool $success, Request $request): void
    {
        AccessLog::create([
            'email'      => $email,
            'success'    => $success,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}
```

---

## 9. Step 7 — AuthenticationController (App-to-App Login)

Used when another trusted internal system redirects a user here via an encrypted ID in the URL. No password is required.

```php
<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;

class AuthenticationController extends Controller
{
    public function app_login(string $id = null)
    {
        if (Auth::check()) {
            return redirect()->intended('/');
        }

        try {
            $decryptedId = Crypt::decryptString($id);
        } catch (\Exception $e) {
            return 'Login Error [0]. Invalid or tampered ID.';
        }

        $user = User::find($decryptedId);

        if (! $user) {
            return 'Login Error [2]. No access to this system.';
        }

        if (Auth::loginUsingId($user->id)) {
            return redirect()->intended('/');
        }

        return 'Login Error [1]. System login error.';
    }
}
```

> **Usage from the sending system:**
> ```php
> $url = route('app.login', ['id' => Crypt::encryptString($userId)]);
> ```
> Both systems must share the same `APP_KEY`.

---

## 10. Step 8 — Authorization Strategy

Choose **one** of the two strategies below. The login flow is identical for both — this only affects what happens after the user is found in the local DB.

---

### Option A — Role-Based (1:1)

Each user has exactly one role. A route is accessible if the user's role matches any of the allowed roles.

**Middleware:**

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (! $request->user() || ! in_array($request->user()->role, $roles)) {
            abort(403, 'You do not have permission to access this page.');
        }

        return $next($request);
    }
}
```

**Route usage:**
```php
// Single role
Route::get('/reviewer', ...)->middleware('role:reviewer');

// Multiple allowed roles (user needs ANY one)
Route::get('/reviewer', ...)->middleware('role:reviewer,admin');
```

**Users table — `role` column:**
```php
$table->enum('role', ['roleA', 'roleB', 'admin'])->default('roleA');
// Define your own role values per system
```

**Login redirect — customize per system:**
```php
// In LoginController after Auth::loginUsingId():
return match ($user->role) {
    'roleA'  => redirect()->route('routeA'),
    'roleB'  => redirect()->route('routeB'),
    default  => redirect('/'),
};
```

---

### Option B — Module-Based (1:many)

Each user can have access to multiple modules simultaneously, controlled by a JSON column. A user is admitted if they have access to **any** of the listed modules on the route.

**Middleware:**

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckModuleAccess
{
    public function handle(Request $request, Closure $next, string ...$modules): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(403, 'Unauthorized access.');
        }

        foreach ($modules as $module) {
            $key = strtoupper($module) . '_Module';
            if (! empty($user->access[$key]) && $user->access[$key] === true) {
                return $next($request);
            }
        }

        abort(403, 'Unauthorized access to this module.');
    }
}
```

**Route usage:**
```php
// Single module
Route::get('/payroll', ...)->middleware('module:HRP');

// Multiple allowed modules (user needs ANY one)
Route::get('/approvals', ...)->middleware('module:HRA,FA');
```

**`access` JSON structure in the DB:**
```json
{
  "MODULE_A_Module": true,
  "MODULE_B_Module": false,
  "MODULE_C_Module": true
}
```

> **Module key convention:** `{MODULE_CODE}_Module` — define your own codes per system.

---

## 11. Step 9 — Register Middleware

**Laravel 11+ (`bootstrap/app.php`):**
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'role'   => \App\Http\Middleware\CheckRole::class,        // Option A
        'module' => \App\Http\Middleware\CheckModuleAccess::class, // Option B
    ]);
})
```

**Laravel 10 and below (`app/Http/Kernel.php`):**
```php
protected $routeMiddleware = [
    'role'   => \App\Http\Middleware\CheckRole::class,
    'module' => \App\Http\Middleware\CheckModuleAccess::class,
];
```

---

## 12. Step 10 — Config: External Auth API

**`config/services.php`:**
```php
'auth_api' => [
    'base_uri'          => env('AUTH_API_BASE_URI', ''),
    'api_key'           => env('AUTH_API_KEY', ''),
    'auth_user_api_key' => env('AUTH_USER_API_KEY', ''),
],

'user_api' => [
    'endpoint' => env('USER_API_ENDPOINT', ''),
    'key'      => env('USER_API_KEY', ''),
],
```

---

## 13. Security Behaviors Summary

| Behavior | Detail |
|---|---|
| **Brute-force protection** | 3 failed attempts → 15-minute lockout via Laravel Cache |
| **Cache keys** | `login_attempts_{sha1(email)}` and `login_lockout_{sha1(email)}` |
| **Attempt reset** | Cleared on successful login |
| **Access logging** | Every attempt (success or fail) written to `access_logs` with IP and User-Agent |
| **External auth** | Credentials never validated locally — always delegated to the Auth API |
| **Session data** | `auth_token`, `token_expires`, `email` stored after successful external auth |
| **Local authorization** | Valid external auth is still rejected if no matching record exists in local `users` table |
| **SSL verification** | All HTTP calls use `->withOptions(['verify' => storage_path('cacert.pem')])` — copy `cacert.pem` from any existing system's `storage/` folder |
| **App-to-app login** | `Crypt::encryptString` / `Crypt::decryptString`; both systems must share `APP_KEY` |
| **CSRF** | All POST forms protected by Laravel's CSRF middleware |

---

---

## 14. Part 2 — User Access Management

### Overview

An admin-only panel that lets you grant or revoke access for any user registered in the external user directory, without needing to touch the database manually.

**Flow:**
1. Fetch **all organization users** from the external API (name, email, encrypted ID).
2. Load **local DB users** — only those who have been granted access to this system.
3. Merge both sources into a table — one row per organization user.
4. Grant/Revoke actions write to the local `users` table.

### Dual Data Source Pattern

| Source | Contents | When populated |
|---|---|---|
| External API | All org users (id, name, email) | On page load |
| Local DB | Only users with system access | On page load |

The table loops over API users and looks up the local record by ID to show current access state.

> **Important:** The external API returns **encrypted** user IDs. Decrypt with `Crypt::decryptString()` before any DB operation.

### Controller

```php
<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class UserManagementController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/Users', [
            'apiUsers'   => $this->fetchApiUsers(),
            'localUsers' => User::all()->keyBy('id'),
        ]);
        // Blade: return view('admin.users', [...]);
    }

    /**
     * Grant or update access for a user.
     * Adjust the validated fields to match your authorization strategy:
     *   - Role-based:   validate 'role' (string enum)
     *   - Module-based: validate 'access' (array of module flags)
     */
    public function assign(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'id'    => 'required|integer',
            'name'  => 'required|string|max:255',
            'email' => 'required|email|max:255',
            // Role-based:   'role' => 'required|in:roleA,roleB,admin',
            // Module-based: 'access' => 'required|array',
        ]);

        $user = User::find($data['id']);

        if ($user) {
            $user->update($data);
        } else {
            DB::table('users')->insert([
                'id'         => $data['id'],
                'name'       => $data['name'],
                'email'      => $data['email'],
                'password'   => Hash::make(Str::random(32)),
                // 'role'    => $data['role'],      // Role-based
                // 'access'  => json_encode($data['access']), // Module-based
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return back()->with('success', "{$data['name']}'s access has been updated.");
    }

    public function revoke(int $id): RedirectResponse
    {
        $user = User::find($id);

        if (! $user) {
            return back()->with('error', 'User not found.');
        }

        $name = $user->name;
        $user->delete();

        return back()->with('success', "{$name}'s access has been revoked.");
    }

    private function fetchApiUsers(): array
    {
        try {
            $response = Http::withHeaders(['x-api-key' => config('services.user_api.key')])
                ->withOptions(['verify' => storage_path('cacert.pem')])
                ->post(config('services.user_api.endpoint'));

            if (! $response->successful()) {
                return [];
            }

            $raw   = $response->json();
            $users = $raw['data'] ?? $raw;

            $decrypted = [];
            foreach ($users as $user) {
                try {
                    $user['id'] = (int) Crypt::decryptString($user['id']);
                    $decrypted[] = $user;
                } catch (\Exception $e) {
                    // skip users whose ID can't be decrypted
                }
            }

            return $decrypted;
        } catch (\Exception $e) {
            return [];
        }
    }
}
```

### Access Management Logic

| Scenario | Result |
|---|---|
| Assign on user with no local record | Creates a new `users` row with the given role/access |
| Assign on existing user | Updates their role/access column |
| Revoke | Deletes the local `users` row entirely |

---

## 15. Checklist for New System

**Core authentication (always required):**
- [ ] Add `auth_api` + `user_api` blocks to `config/services.php`
- [ ] Set all `AUTH_API_*` and `USER_API_*` values in `.env`
- [ ] Copy `cacert.pem` to `storage/` (get it from any existing system)
- [ ] Create `access_logs` migration
- [ ] Create `AccessLog` model
- [ ] Create `users` migration with core columns + your chosen authorization column
- [ ] Create `User` model with appropriate `fillable` and `casts`
- [ ] Create `LoginController` → update the post-login redirect
- [ ] Create `AuthenticationController` → update redirect target
- [ ] Create login view (Blade or Inertia/React)
- [ ] Add login routes (`GET /login`, `POST /login`, `GET /app-login/{id}`)
- [ ] Wrap protected routes in `Route::middleware('auth')->group(...)`
- [ ] Run `php artisan migrate`
- [ ] Ensure `APP_KEY` is set (required for app-to-app encrypted login)

**Authorization — pick one:**

*Role-based (1:1):*
- [ ] Add `role` enum column to `users` migration
- [ ] Create `CheckRole` middleware
- [ ] Register as `role` alias in middleware config
- [ ] Apply `->middleware('role:roleA,roleB')` to protected routes
- [ ] Customize post-login redirect by role in `LoginController`

*Module-based (1:many):*
- [ ] Add `access` JSON column to `users` migration
- [ ] Create `CheckModuleAccess` middleware
- [ ] Register as `module` alias in middleware config
- [ ] Apply `->middleware('module:MODULE_CODE')` to protected routes
- [ ] Define module codes and keys (`MODULE_Module` convention)

**User Management panel (optional but recommended):**
- [ ] Create `UserManagementController` → adapt `assign()` for your authorization column
- [ ] Add admin-only route for the management panel
- [ ] Create the management view (Blade or Inertia/React)
- [ ] Add `USER_API_ENDPOINT` and `USER_API_KEY` to `.env`
- [ ] Seed at least one admin user manually for first login
