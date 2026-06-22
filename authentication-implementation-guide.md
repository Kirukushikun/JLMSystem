# Authentication Implementation Guide

This document is a step-by-step reference for replicating the login authentication system used in PandaSystem. The system is built on **Laravel** and authenticates users against an **external API**, with brute-force protection, access logging, and module-level authorization. It also covers the **User Access Management** panel — a Livewire component that lets an admin grant or revoke per-module access for any user registered in the external user directory.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Login Flow Diagram](#2-login-flow-diagram)
3. [Step 1 — Environment Variables](#3-step-1--environment-variables)
4. [Step 2 — Database: Access Logs Table](#4-step-2--database-access-logs-table)
5. [Step 3 — Models](#5-step-3--models)
6. [Step 4 — Login View (Blade)](#6-step-4--login-view-blade)
7. [Step 5 — Routes](#7-step-5--routes)
8. [Step 6 — LoginController](#8-step-6--logincontroller)
9. [Step 7 — AuthenticationController (App-to-App Login)](#9-step-7--authenticationcontroller-app-to-app-login)
10. [Step 8 — Middleware: Auth Guard](#10-step-8--middleware-auth-guard)
11. [Step 9 — Middleware: Module Access Control](#11-step-9--middleware-module-access-control)
12. [Step 10 — Register Middleware in Kernel](#12-step-10--register-middleware-in-kernel)
13. [Step 11 — Config: External Auth API](#13-step-11--config-external-auth-api)
14. [Security Behaviors Summary](#14-security-behaviors-summary)
15. [Part 2 — User Access Management](#15-part-2--user-access-management)
    - [Overview](#overview)
    - [Dual Data Source Pattern](#dual-data-source-pattern)
    - [Step 12 — Livewire Component: UseraccessTable](#step-12--livewire-component-useraccesstable)
    - [Step 13 — Livewire View: useraccess-table.blade.php](#step-13--livewire-view-useraccess-tablebladephp)
    - [Step 14 — E-Signature Upload](#step-14--e-signature-upload)
    - [Step 15 — Edit User Info Modal](#step-15--edit-user-info-modal)
    - [Access Management Logic Summary](#access-management-logic-summary)
16. [Checklist for New System](#16-checklist-for-new-system)

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
Clear attempts → Log success → Auth::loginUsingId() → redirect /home
```

---

## 3. Step 1 — Environment Variables

Add these to your `.env` file:

```env
AUTH_API_BASE_URI=https://your-auth-server.com
AUTH_API_KEY=your_bearer_token_here
AUTH_USER_API_KEY=your_user_lookup_api_key_here
```

---

## 4. Step 2 — Database: Access Logs Table

Create the migration:

```bash
php artisan make:migration create_access_logs_table
```

Migration content:

```php
Schema::create('access_logs', function (Blueprint $table) {
    $table->id();
    $table->string('email');
    $table->string('success');
    $table->string('ip_address');
    $table->string('user_agent');
    $table->timestamps();
});
```

Run it:

```bash
php artisan migrate
```

### Users Table Requirements

Your `users` table must have at minimum:

| Column     | Type    | Notes                                        |
|------------|---------|----------------------------------------------|
| `id`       | any     | Must match the ID returned by the user API   |
| `name`     | string  |                                              |
| `role`     | string  | e.g. `admin`, `hrhead`                       |
| `access`   | json    | Module permission flags (see Model section)  |

---

## 5. Step 3 — Models

### `app/Models/AccessLog.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccessLog extends Model
{
    protected $table = "access_logs";

    protected $fillable = [
        'email',
        'success',
        'ip_address',
        'user_agent'
    ];
}
```

### `app/Models/User.php`

The `access` column stores a JSON object controlling which modules the user can enter. Cast it to an array.

```php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    public $incrementing = false; // Only if your ID is not auto-increment

    protected $fillable = [
        'id',
        'name',
        'role',
        'access',
        // add your own columns here
    ];

    protected $casts = [
        'access' => 'array',
    ];

    // Default access — override per user in DB
    protected $attributes = [
        'access' => '{"RQ_Module":true,"DH_Module":true,"HRP_Module":true,"HRA_Module":true,"FA_Module":true}',
    ];
}
```

> **Module key convention:** `{MODULE_CODE}_Module` → e.g. `RQ_Module`, `DH_Module`

---

## 6. Step 4 — Login View (Blade)

**Dependencies:**
- [Tailwind CSS](https://tailwindcss.com/) — utility styling
- [Alpine.js](https://alpinejs.dev/) — password show/hide toggle
- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) — CAPTCHA bot protection

**File:** `resources/views/auth/login.blade.php`

```blade
@extends('layouts.app')

@section('content')
<main class="h-screen flex flex-col items-center justify-center">
    <div class="min-w-md mx-auto bg-white p-10 rounded-md shadow">

        {{-- Logo / Branding --}}
        <div class="logo flex flex-col text-center items-center justify-center mb-8">
            <img class="border-b-2 pb-3 mb-3" style="width: 190px;" src="{{ asset('your-logo.png') }}" alt="">
            <h1 class="font-bold text-lg">Your System Name</h1>
        </div>

        {{-- Validation Error --}}
        @if ($errors->any())
            <p class="text-red-500 text-center">
                {{ $errors->first('login') }}
            </p>
        @endif

        {{-- Login Form --}}
        <form id="loginForm" action="{{ route('login.post') }}" method="POST" class="mt-3">
            @csrf

            <input name="email" type="email" placeholder="Email"
                class="w-full mb-3 rounded-md border-2 border-solid px-3 py-2 @error('email') border-red-500 @enderror"
                value="{{ old('email') }}" required>

            {{-- Password with show/hide toggle (Alpine.js) --}}
            <div class="relative mb-3" x-data="{ showPassword: false }">
                <input name="password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Password"
                    class="w-full rounded-md border-2 border-solid px-3 py-2 pr-10 @error('password') border-red-500 @enderror"
                    required>

                <button type="button"
                    class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                    @click="showPassword = !showPassword">

                    {{-- Eye Icon (Show Password) --}}
                    <svg x-show="!showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>

                    {{-- Eye Slash Icon (Hide Password) --}}
                    <svg x-show="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                </button>
            </div>

            <button type="submit"
                class="w-full bg-blue-500 text-white p-2 rounded cursor-pointer hover:bg-blue-600">
                Login
            </button>
        </form>

        {{-- Cloudflare Turnstile CAPTCHA --}}
        <div class="cf-turnstile text-center mt-3 mb-3"
            data-sitekey="YOUR_TURNSTILE_SITE_KEY"
            data-callback="javascriptCallback">
        </div>
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback" defer></script>

        <div class="mt-4 text-center">
            <div class="text-sm text-gray-500">
                Forgot your password? Please contact <span class="text-blue-600 font-medium">IT Department</span>.
            </div>
        </div>
    </div>
</main>
@endsection
```

> **Turnstile:** Replace `YOUR_TURNSTILE_SITE_KEY` with the site key from your Cloudflare dashboard. The widget is display-only in this implementation — it renders as a UI trust signal. If you want it to block form submission, add server-side token validation inside `postLogin`.

---

## 7. Step 5 — Routes

**File:** `routes/web.php`

```php
use App\Http\Controllers\AuthenticationController;
use App\Http\Controllers\LoginController;

// Show the login page
Route::get('/login', function () {
    return view('auth.login');
})->name('login');

// Handle login form submission
Route::post('/login', [LoginController::class, 'postLogin'])->name('login.post');

// App-to-app login (encrypted user ID in URL)
Route::get('/app-login/{id}', [AuthenticationController::class, 'app_login'])->name('app.login');

// Protected routes — require authentication
Route::middleware('auth')->group(function () {

    Route::get('/logout', [LoginController::class, 'logout'])->name('logout');

    Route::get('/home', function () {
        return view('home');
    })->name('home');

    // Module-gated route example
    // Route::get('/your-module', fn() => view('your.view'))->middleware('module.access:MODULE_CODE');
});
```

---

## 8. Step 6 — LoginController

**File:** `app/Http/Controllers/LoginController.php`

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use App\Models\User;
use App\Models\AccessLog;

class LoginController extends Controller
{
    const MAX_ATTEMPTS = 3;
    const LOCKOUT_TIME = 900; // 15 minutes in seconds

    public function postLogin(Request $request)
    {
        $email = $request->input('email');

        // Step 1: Check if account is locked
        if ($this->isLocked($email)) {
            $remainingTime = $this->getRemainingLockoutTime($email);
            return back()->withErrors([
                'login' => "Account temporarily locked due to multiple failed attempts. Please try again in {$remainingTime} minutes."
            ])->withInput();
        }

        try {
            $base_uri = config('services.auth_api.base_uri');
            $api_key = config('services.auth_api.api_key');
            $auth_user_api_key = config('services.auth_api.auth_user_api_key');

            // Step 2: Authenticate against external API
            $authResponse = Http::withHeaders([
                'Authorization' => 'Bearer ' . $api_key,
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])->post($base_uri . '/api/v1/auth/login', [
                'email' => $email,
                'password' => $request->input('password'),
            ]);

            if ($authResponse->successful()) {
                $data = $authResponse->json();

                // Step 3: Store auth token in session
                session([
                    'auth_token'    => $data['token'] ?? null,
                    'token_expires' => $data['expires_at'] ?? null,
                    'email'         => $data['email'] ?? null,
                ]);

                $email = $data['email'] ?? $email;

                // Step 4: Get local user ID by email
                $userResponse = Http::withHeaders([
                    'x-api-key'    => $auth_user_api_key,
                    'Accept'       => 'application/json',
                    'Content-Type' => 'application/json',
                ])->get($base_uri . "/api/v1/users/get-user-id?email=" . $email);

                if (!$userResponse->successful()) {
                    return back()->withErrors([
                        'login' => 'Failed to retrieve user information from the system.'
                    ])->withInput();
                }

                $userData = $userResponse->json();
                $user = User::find($userData['id'] ?? null);

                // Step 5: Log in if found locally
                if ($user) {
                    $this->clearAttempts($email);
                    $this->logAccess($email, true, $request);
                    Auth::loginUsingId($user->id);
                    return redirect()->route('home');
                }

                // User authenticated externally but not registered in this system
                $this->incrementAttempts($email);
                $this->logAccess($email, false, $request);
                return back()->withErrors([
                    'login' => 'You are not authorized to access this system.'
                ])->withInput();
            }

            // External auth rejected credentials
            $this->incrementAttempts($email);
            $this->logAccess($email, false, $request);

            $attemptsLeft = self::MAX_ATTEMPTS - $this->getAttempts($email);
            $errorMessage = $authResponse->json()['message'] ?? 'Incorrect username or password.';

            if ($attemptsLeft > 0) {
                $errorMessage .= " You have {$attemptsLeft} attempt(s) remaining.";
            }

            return back()->withErrors(['login' => $errorMessage])->withInput();

        } catch (\Exception $e) {
            $this->incrementAttempts($email);
            $this->logAccess($email, false, $request);
            return back()->withErrors([
                'login' => 'Authentication failed: ' . $e->getMessage()
            ])->withInput();
        }
    }

    public function logout()
    {
        Auth::logout();
        return redirect('/login');
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    private function isLocked($email): bool
    {
        return Cache::has($this->getLockoutKey($email));
    }

    private function getAttempts($email): int
    {
        return Cache::get($this->getAttemptsKey($email), 0);
    }

    private function incrementAttempts($email): void
    {
        $key = $this->getAttemptsKey($email);
        $attempts = $this->getAttempts($email) + 1;

        Cache::put($key, $attempts, now()->addMinutes(15));

        if ($attempts >= self::MAX_ATTEMPTS) {
            Cache::put($this->getLockoutKey($email), true, self::LOCKOUT_TIME);
        }
    }

    private function clearAttempts($email): void
    {
        Cache::forget($this->getAttemptsKey($email));
        Cache::forget($this->getLockoutKey($email));
    }

    private function getRemainingLockoutTime($email): int
    {
        return (int) ceil(self::LOCKOUT_TIME / 60);
    }

    private function getAttemptsKey($email): string
    {
        return 'login_attempts_' . sha1($email);
    }

    private function getLockoutKey($email): string
    {
        return 'login_lockout_' . sha1($email);
    }

    private function logAccess($email, bool $success, Request $request): void
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

This controller handles a separate login path where another trusted system passes an **encrypted user ID** via URL (e.g. after SSO or a shared dashboard redirect). No password is required.

**File:** `app/Http/Controllers/AuthenticationController.php`

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;

class AuthenticationController extends Controller
{
    public function app_login($id = null)
    {
        // Already logged in — go home
        if (Auth::check()) {
            return redirect()->route('home');
        }

        // Decrypt the ID passed in the URL
        try {
            $decryptedId = Crypt::decryptString($id);
        } catch (\Exception $e) {
            return "Login Error [0]. Invalid or tampered ID.";
        }

        $user = User::find($decryptedId);

        if (!$user) {
            return "Login Error [2]. No Access to the System.";
        }

        if (Auth::loginUsingId($user->id)) {
            return redirect()->route('home');
        }

        return "Login Error [1]. System Login Error.";
    }
}
```

> **Usage:** The sending system generates the URL as:
> ```php
> $encryptedId = Crypt::encryptString($userId);
> $url = route('app.login', ['id' => $encryptedId]);
> ```
> Both systems must share the same `APP_KEY` in `.env`, or the decryption will fail.

---

## 10. Step 8 — Middleware: Auth Guard

This redirects unauthenticated users to the login page.

**File:** `app/Http/Middleware/Authenticate.php`

```php
<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    protected function redirectTo($request): ?string
    {
        if (!$request->expectsJson()) {
            return route('login');
        }
        return null;
    }
}
```

---

## 11. Step 9 — Middleware: Module Access Control

Controls which users can enter a specific module based on the `access` JSON column on the `users` table.

**File:** `app/Http/Middleware/CheckModuleAccess.php`

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckModuleAccess
{
    public function handle(Request $request, Closure $next, ...$modules): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(403, 'Unauthorized access.');
        }

        foreach ($modules as $module) {
            if ($this->hasAccess($user, $module)) {
                return $next($request); // Grant if ANY listed module matches
            }
        }

        abort(403, 'Unauthorized access to this module.');
    }

    protected function hasAccess($user, string $module): bool
    {
        $key = strtoupper($module) . '_Module';
        return !empty($user->access[$key]) && $user->access[$key] === true;
    }
}
```

**Route usage:**
```php
Route::get('/your-route', fn() => view('your.view'))
    ->middleware('module.access:MODULE_CODE');

// Multiple allowed modules (user needs ANY one of them):
Route::get('/shared-route', fn() => view('your.view'))
    ->middleware('module.access:HRA,HRP');
```

**`access` JSON structure in the `users` table:**
```json
{
  "RQ_Module":  true,
  "DH_Module":  true,
  "HRP_Module": false,
  "HRA_Module": false,
  "FA_Module":  true
}
```

---

## 12. Step 10 — Register Middleware in Kernel

**File:** `app/Http/Kernel.php`

Add to `$routeMiddleware`:

```php
protected $routeMiddleware = [
    // ... existing middleware ...
    'auth'          => \App\Http\Middleware\Authenticate::class,
    'module.access' => \App\Http\Middleware\CheckModuleAccess::class,
];
```

---

## 13. Step 11 — Config: External Auth API

**File:** `config/services.php`

```php
'auth_api' => [
    'base_uri'          => env('AUTH_API_BASE_URI', 'https://example.com'),
    'api_key'           => env('AUTH_API_KEY', ''),
    'auth_user_api_key' => env('AUTH_USER_API_KEY', ''),
],
```

Access in code via:
```php
config('services.auth_api.base_uri')
config('services.auth_api.api_key')
config('services.auth_api.auth_user_api_key')
```

---

## 14. Security Behaviors Summary

| Behavior | Detail |
|---|---|
| **Brute-force protection** | 3 failed attempts → 15-minute account lockout via Laravel Cache |
| **Cache keys** | `login_attempts_{sha1(email)}` and `login_lockout_{sha1(email)}` |
| **Attempt counter reset** | Cleared on successful login |
| **Access logging** | Every login attempt (success or fail) is written to `access_logs` with IP and User-Agent |
| **External auth** | Credentials are never validated locally — always delegated to the Auth API |
| **Session data** | `auth_token`, `token_expires`, and `email` stored in session after successful external auth |
| **Local authorization** | Even a valid external auth is rejected if the user's email has no matching record in the local `users` table |
| **Module gating** | Per-route middleware checks `access` JSON column; multiple modules can be passed as OR conditions |
| **App-to-app login** | Uses `Crypt::encryptString` / `Crypt::decryptString`; both systems must share `APP_KEY` |
| **CAPTCHA** | Cloudflare Turnstile widget rendered on login form (UI-level only in this implementation) |
| **CSRF** | All POST forms include `@csrf`; enforced by Laravel's `VerifyCsrfToken` middleware |

---

---

## 15. Part 2 — User Access Management

### Overview

The User Access Management panel is an admin-only screen that lets you grant or revoke per-module access for any user in the organization. It is powered by a **Livewire component** and works as follows:

1. On load, fetch **all organization users** from the external API (name, email, encrypted ID).
2. Separately, load **local DB users** (those who have ever been granted any access).
3. Render a table merging both sources — one row per organization user, with module toggle buttons.
4. Grant/Revoke actions write to the local `users` table (create, update, or delete the row depending on resulting access state).

### Dual Data Source Pattern

This is the most important concept in this panel:

| Source | Variable | Contents | When populated |
|---|---|---|---|
| External API | `$users` | All org users (id, first_name, last_name, email) | `mount()` → `fetchUsers()` |
| Local DB | `$dbUsers` | Only users with ≥1 access grant; keyed by ID | `mount()` → `User::all()->keyBy('id')` |

The table loops over `$users` (external — everyone) and looks up `$dbUsers[$user['id']]` to read the current access state. If no local record exists, all module buttons show "Grant".

> **Important:** User IDs from the external API are **Crypt-encrypted**. They must be decrypted with `Crypt::decryptString()` before being used to look up or write to the local DB.

---

### Step 12 — Livewire Component: UseraccessTable

**Install Livewire** if not already present:

```bash
composer require livewire/livewire
```

**File:** `app/Http/Livewire/UseraccessTable.php`

```php
<?php

namespace App\Http\Livewire;

use Livewire\Component;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Crypt;
use Livewire\WithFileUploads;
use App\Models\User;

class UseraccessTable extends Component
{
    use WithFileUploads;

    public $users = [];       // All users from external API
    public $dbUsers = [];     // Local DB users, keyed by ID
    public $esignUpload;      // Holds the selected file for e-sign
    public $currentUserId;    // Tracks which user's e-sign is being uploaded

    protected $listeners = ['accessUpdated' => '$refresh'];

    public function mount()
    {
        // Step 1: Fetch all org users from external API
        $this->fetchUsers();

        // Step 2: Load local DB users keyed by ID
        $this->dbUsers = User::all()->keyBy('id');
    }

    public function fetchUsers()
    {
        $response = Http::withHeaders([
            'x-api-key' => config('services.user_api.key'), // move to config/env
        ])
        ->withOptions([
            'verify' => storage_path('cacert.pem'), // SSL cert; use true in production if CA is valid
        ])
        ->post(config('services.user_api.endpoint')); // e.g. https://your-auth-server.com/api/v1/users

        if ($response->successful()) {
            $json = $response->json();
            $users = $json['data'] ?? $json;

            // Decrypt each user's ID (external API returns encrypted IDs)
            $this->users = array_map(function ($user) {
                try {
                    $user['id'] = Crypt::decryptString($user['id']);
                } catch (\Exception $e) {
                    Log::error('Failed to decrypt user ID for: ' . $user['first_name'] . ' ' . $user['last_name']);
                }
                return $user;
            }, $users);
        } else {
            $this->users = [];
            session()->flash('error', 'Failed to fetch users. Status: ' . $response->status());
        }
    }

    public function manageAccess($userId, $action, $role, $name = null)
    {
        // Maps display role name → JSON access key
        $roleMap = [
            'Requestor'      => 'RQ_Module',
            'Division Head'  => 'DH_Module',
            'HR Preparer'    => 'HRP_Module',
            'HR Approver'    => 'HRA_Module',
            'Final Approver' => 'FA_Module',
        ];

        if (!isset($roleMap[$role])) {
            $this->noreloadNotif('error', 'Invalid Role', 'The selected role is not recognized.');
            return;
        }

        $key = $roleMap[$role];

        $defaultAccess = [
            'RQ_Module'  => false,
            'DH_Module'  => false,
            'HRP_Module' => false,
            'HRA_Module' => false,
            'FA_Module'  => false,
        ];

        $user = User::find($userId);

        if (!$user) {
            if ($action === 'grant') {
                // Create local user record with this one module enabled
                $defaultAccess[$key] = true;
                $newUser = User::create([
                    'id'     => $userId,
                    'name'   => $name,
                    'access' => $defaultAccess,
                ]);
                $this->dbUsers->put($userId, $newUser);
                $this->noreloadNotif('success', 'User Created', "New user created with {$role} access granted.");
            } else {
                $this->noreloadNotif('error', 'User Not Found', 'Cannot revoke access from a user that does not exist.');
            }
            return;
        }

        // Toggle the requested module
        $access = $user->access ?? $defaultAccess;
        $access[$key] = $action === 'grant';

        // If all modules become false, delete the local user record entirely
        if (!in_array(true, $access, true)) {
            if ($user->esign && \Storage::disk('public')->exists($user->esign)) {
                \Storage::disk('public')->delete($user->esign);
            }
            $user->delete();
            $this->dbUsers->forget($userId);
            $this->noreloadNotif('success', 'User Removed', "User removed — no active module access remains.");
            return;
        }

        // Save updated access
        $user->access = $access;
        $user->save();
        $this->dbUsers->put($userId, $user);

        $this->dispatch('$refresh');
        $this->noreloadNotif('success', ucfirst($action) . ' Successful', "Access for {$role} has been {$action}ed.");
    }

    public function uploadEsign($userId)
    {
        $this->validate([
            'esignUpload' => 'required|image|max:2048',
        ]);

        $user = User::find($userId);

        if (!$user) {
            session()->flash('error', 'User not found.');
            return;
        }

        // Delete old e-sign file if it exists
        if ($user->esign && \Storage::disk('public')->exists($user->esign)) {
            \Storage::disk('public')->delete($user->esign);
        }

        $path = $this->esignUpload->store('esignatures', 'public');
        $user->esign = $path;
        $user->save();

        $this->dbUsers->put($userId, $user);
        $this->reset('esignUpload', 'currentUserId');

        $this->dispatch('notif', type: 'success', header: 'E-sign Updated', message: 'Signature uploaded successfully.');
    }

    public function updatedEsignUpload()
    {
        if ($this->currentUserId) {
            $this->uploadEsign($this->currentUserId);
        }
    }

    public function updateUser($data)
    {
        try {
            $user = User::find($data['id']);

            if (!$user) {
                $this->noreloadNotif('failed', 'User Not Found', 'This user does not exist in the system.');
                return;
            }

            if ($user->hasPending) {
                $this->noreloadNotif('failed', 'Action Blocked', "Changes to {$user->name} are blocked — they have an ongoing PAN process.");
                return;
            }

            $user->farm     = $data['farm'] ?? null;
            $user->position = $data['position'] ?? null;
            $user->role     = $data['role'] ?? null;
            $user->save();

            $this->dbUsers->put($user->id, $user);
            $this->noreloadNotif('success', 'User Updated', 'Farm, position, and role updated.');
        } catch (\Exception $e) {
            Log::error('Failed to update user: ' . $e->getMessage());
            $this->noreloadNotif('failed', 'Update Failed', 'Something went wrong while updating the user.');
        }
    }

    public function render()
    {
        return view('livewire.useraccess-table');
    }

    private function noreloadNotif($type, $header, $message): void
    {
        $this->dispatch('notif', type: $type, header: $header, message: $message);
    }
}
```

**ENV / config additions** for the user listing API:

`.env`:
```env
USER_API_ENDPOINT=https://your-auth-server.com/api/v1/users
USER_API_KEY=your_user_listing_api_key
```

`config/services.php`:
```php
'user_api' => [
    'endpoint' => env('USER_API_ENDPOINT'),
    'key'      => env('USER_API_KEY'),
],
```

---

### Step 13 — Livewire View: useraccess-table.blade.php

**File:** `resources/views/livewire/useraccess-table.blade.php`

The view has two responsibilities:
1. **Render the table** — merges API users with local DB access state.
2. **Drive two modals** — a confirm modal (grant/revoke) and an edit modal (farm, position, role).

All modal state is managed in Alpine.js (`x-data`) on the wrapping `div`, keeping it client-side only until the user hits Confirm/Save, which then calls the Livewire method.

```blade
<div class="flex flex-col gap-5 h-full">
    <div class="table-header flex w-full gap-3 items-center">
        <h1 class="text-[22px] flex-none">User Access</h1>
    </div>

    <div class="table-container"
        x-data="{
            modalOpen: false,
            modalType: 'confirm', // 'confirm' | 'edit'
            modalData: {},

            openConfirm(id, action, role, name = null) {
                this.modalType = 'confirm';
                this.modalData = {
                    id, action, role, name,
                    header: action === 'grant' ? 'Grant Access' : 'Revoke Access',
                    message: `Are you sure you want to ${action} this user's access to ${role} Module?`
                };
                this.modalOpen = true;
            },

            openEdit(user) {
                this.modalType = 'edit';
                this.modalData = {
                    id:       user.id,
                    farm:     user.farm ?? '',
                    position: user.position ?? '',
                    role:     user.role ?? ''
                };
                this.modalOpen = true;
            }
        }"
    >
        <table>
            <thead>
                <tr>
                    <th>User ID</th>
                    <th>User Name</th>
                    <th>User Email</th>
                    <th>Farm</th>
                    <th>Position</th>
                    <th>RQ Module</th>
                    <th>DH Module</th>
                    <th>HRP Module</th>
                    <th>HRA Module</th>
                    <th>FA Module</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                @foreach($users as $user)
                    @php
                        $dbUser  = $dbUsers[$user['id']] ?? null;
                        $access  = $dbUser->access ?? [
                            'RQ_Module' => false, 'DH_Module' => false,
                            'HRP_Module' => false, 'HRA_Module' => false, 'FA_Module' => false
                        ];
                        $fullname = $user['first_name'] . ' ' . $user['last_name'];
                    @endphp
                    <tr>
                        <td>{{ $user['id'] }}</td>
                        <td>{{ $fullname }}</td>
                        <td>{{ $user['email'] }}</td>
                        <td>{{ $dbUser->farm ?? '--' }}</td>
                        <td>{{ $dbUser->position ?? '--' }}</td>

                        {{-- ── Module columns (repeat per module) ── --}}
                        @foreach([
                            'RQ_Module'  => 'Requestor',
                            'DH_Module'  => 'Division Head',
                            'HRP_Module' => 'HR Preparer',
                            'HRA_Module' => 'HR Approver',
                            'FA_Module'  => 'Final Approver',
                        ] as $moduleKey => $moduleLabel)
                        <td class="table-actions">
                            @if($access[$moduleKey])
                                <button @click="openConfirm({{ $user['id'] }}, 'revoke', '{{ $moduleLabel }}')"
                                    class="border-solid border-3 border-red-600 text-red-600 hover:bg-red-600 hover:text-white">
                                    Revoke
                                </button>
                            @else
                                <button @click="openConfirm({{ $user['id'] }}, 'grant', '{{ $moduleLabel }}', '{{ $fullname }}')"
                                    class="border-solid border-3 border-green-600 text-green-600 hover:bg-green-600 hover:text-white">
                                    Grant
                                </button>
                            @endif
                        </td>
                        @endforeach

                        {{-- ── Actions column: E-sign + Edit ── --}}
                        <td class="table-actions">
                            <div x-data>
                                @if($dbUser)
                                    <input type="file" x-ref="fileInput" accept="image/*" class="hidden"
                                        wire:model="esignUpload"
                                        @change="$wire.currentUserId = '{{ $user['id'] }}'; $wire.uploadEsign('{{ $user['id'] }}')">

                                    <button type="button" @click="$refs.fileInput.click()"
                                        class="border-3 border-blue-600 bg-blue-600 text-white px-3 py-1 rounded">
                                        {{ $dbUser->esign ? 'Re-upload' : 'Upload' }}
                                    </button>

                                    @if($dbUser->esign)
                                        <i class="fa-solid fa-eye text-gray-500"
                                            onclick="window.open('{{ asset('storage/' . $dbUser->esign) }}', '_blank')"></i>
                                    @endif

                                    <i @click="openEdit({ id: {{ $user['id'] }}, farm: '{{ $dbUser->farm ?? '' }}', position: '{{ $dbUser->position ?? '' }}', role: '{{ $dbUser->role ?? '' }}' })"
                                        class="fa-solid fa-pen-to-square text-gray-500 cursor-pointer"></i>
                                @else
                                    <button type="button" disabled
                                        class="border-3 border-gray-500 bg-gray-500 text-white px-3 py-1 rounded opacity-50">
                                        Upload
                                    </button>
                                    <i class="fa-solid fa-pen-to-square text-gray-300"></i>
                                @endif
                            </div>
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>

        <!-- Overlay -->
        <div x-show="modalOpen" class="fixed inset-0 bg-black/50 z-40"></div>

        <!-- Modal Container -->
        <div x-show="modalOpen"
            x-transition:enter="transition ease-out duration-200"
            x-transition:enter-start="opacity-0 scale-90"
            x-transition:enter-end="opacity-100 scale-100"
            x-transition:leave="transition ease-in duration-150"
            x-transition:leave-start="opacity-100 scale-100"
            x-transition:leave-end="opacity-0 scale-90"
            class="fixed inset-0 flex items-center justify-center z-50">

            <div class="bg-white p-6 rounded-lg shadow-lg w-md z-10">

                <!-- Confirm Modal (Grant / Revoke) -->
                <template x-if="modalType === 'confirm'">
                    <div>
                        <h2 class="text-xl font-semibold mb-4" x-text="modalData.header"></h2>
                        <p class="mb-6" x-text="modalData.message"></p>
                        <div class="flex justify-end gap-3">
                            <button type="button" @click="modalOpen = false"
                                class="px-4 py-2 border rounded-md hover:bg-gray-100 cursor-pointer">Cancel</button>
                            <button type="button"
                                @click="modalOpen = false; $wire.manageAccess(modalData.id, modalData.action, modalData.role, modalData.name)"
                                class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-800 cursor-pointer">
                                Confirm
                            </button>
                        </div>
                    </div>
                </template>

                <!-- Edit Modal (Farm / Position / Role) -->
                <template x-if="modalType === 'edit'">
                    <div>
                        <h2 class="text-xl font-semibold mb-4">Edit User Info</h2>

                        <div class="mb-4">
                            <label class="block mb-1 font-medium">Farm</label>
                            <select class="border w-full rounded-md px-2 py-1" x-model="modalData.farm">
                                <option value="">Select Farm</option>
                                <option value="BFC">BFC</option>
                                <option value="BDL">BDL</option>
                                <option value="PFC">PFC</option>
                                <option value="RH">RH</option>
                            </select>
                        </div>

                        <div class="mb-4">
                            <label class="block mb-1 font-medium">Position</label>
                            <input type="text" class="border w-full rounded-md px-2 py-1" x-model="modalData.position">
                        </div>

                        <div class="mb-4">
                            <label class="block mb-1 font-medium">Role</label>
                            <select class="border w-full rounded-md px-2 py-1" x-model="modalData.role">
                                <option value="">Unset</option>
                                <option value="hrhead">HR Head</option>
                                <option value="admin">ADMIN</option>
                            </select>
                        </div>

                        <div class="flex justify-end gap-3">
                            <button type="button" @click="modalOpen = false"
                                class="px-4 py-2 border rounded-md hover:bg-gray-100 cursor-pointer">Cancel</button>
                            <button type="button"
                                @click="modalOpen = false; $wire.updateUser(modalData)"
                                class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-800 cursor-pointer">
                                Save
                            </button>
                        </div>
                    </div>
                </template>

            </div>
        </div>
    </div>
</div>
```

---

### Step 14 — E-Signature Upload

E-signs are uploaded via **Livewire's `WithFileUploads` trait**. Each row's upload button triggers a hidden `<input type="file">` via Alpine's `$refs`. The change event sets `currentUserId` on the Livewire component and then calls `uploadEsign`.

**Storage setup** — run once:
```bash
php artisan storage:link
```

This creates a `public/storage` symlink so files stored in `storage/app/public/esignatures/` are accessible via `asset('storage/...')`.

**User model** — add `esign` to `$fillable`:
```php
protected $fillable = [
    'id', 'name', 'farm', 'position', 'role', 'access', 'esign'
];
```

**Users table** — add the column via migration:
```php
$table->string('esign')->nullable();
```

---

### Step 15 — Edit User Info Modal

The edit modal is opened by calling `openEdit(user)` from Alpine, passing the current user's `farm`, `position`, and `role`. On Save, `$wire.updateUser(modalData)` is called, which passes the entire `modalData` object to Livewire.

Guard in `updateUser`: if `$user->hasPending === true`, the edit is blocked. This prevents modifying a user while they are mid-workflow in the PAN process.

**Users table columns required:**

| Column      | Type     | Notes                             |
|-------------|----------|-----------------------------------|
| `farm`      | string   | Nullable; values: BFC, BDL, PFC, RH |
| `position`  | string   | Nullable; free text               |
| `role`      | string   | Nullable; `hrhead` or `admin`     |
| `hasPending`| boolean  | Blocks editing when `true`        |

---

### Access Management Logic Summary

| Scenario | Result |
|---|---|
| Grant on user with no local record | Creates a new `users` row with that one module set to `true` |
| Grant on existing user | Updates their `access` JSON, sets module to `true` |
| Revoke on existing user, other modules still active | Updates `access` JSON, sets module to `false` |
| Revoke on existing user, last active module revoked | Deletes the local `users` row + e-sign file |
| Revoke on user with no local record | Shows error — nothing to revoke |
| `$dbUsers` after any change | Always updated in-memory via `->put()` or `->forget()` to avoid a full page reload |

---

## 16. Checklist for New System

Use this when applying this auth pattern to a new Laravel application:

**Authentication:**
- [ ] Copy `LoginController.php` → update route names and redirect targets
- [ ] Copy `AuthenticationController.php` → update redirect target
- [ ] Copy `CheckModuleAccess.php` middleware → define your own module codes
- [ ] Copy `Authenticate.php` middleware
- [ ] Register both middleware in `Kernel.php` under `$routeMiddleware`
- [ ] Create `access_logs` migration and run `php artisan migrate`
- [ ] Create or update `User` model with `access` column cast to `array`
- [ ] Create `AccessLog` model
- [ ] Add `auth_api` block to `config/services.php`
- [ ] Set `AUTH_API_BASE_URI`, `AUTH_API_KEY`, `AUTH_USER_API_KEY` in `.env`
- [ ] Create login Blade view extending your `layouts.app`
- [ ] Replace Turnstile `data-sitekey` with your system's key
- [ ] Add login routes (`GET /login`, `POST /login`, `GET /app-login/{id}`)
- [ ] Wrap protected routes in `Route::middleware('auth')->group(...)`
- [ ] Set per-route `module.access` middleware where needed
- [ ] Ensure `APP_KEY` is shared if using the app-to-app encrypted login

**User Access Management panel:**
- [ ] Install Livewire: `composer require livewire/livewire`
- [ ] Copy `UseraccessTable.php` Livewire component → update module map and API endpoint
- [ ] Copy `useraccess-table.blade.php` view → update Farm dropdown options and Role options
- [ ] Add `user_api` block to `config/services.php`
- [ ] Set `USER_API_ENDPOINT` and `USER_API_KEY` in `.env`
- [ ] Add `esign`, `farm`, `position`, `role`, `hasPending` columns to the `users` table
- [ ] Add those columns to `$fillable` in `User` model
- [ ] Run `php artisan storage:link` for e-sign file serving
- [ ] Add CA certificate (`cacert.pem`) to `storage/` if the external API uses a custom SSL cert
- [ ] Restrict the admin route that renders this component to admin users only
