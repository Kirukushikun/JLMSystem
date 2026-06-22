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
    private const MAX_ATTEMPTS = 3;
    private const LOCKOUT_SECONDS = 900; // 15 minutes

    public function showLogin(): Response
    {
        return Inertia::render('auth/Login');
    }

    public function postLogin(Request $request): RedirectResponse
    {
        $email = $request->input('email');

        // Brute-force guard
        if ($this->isLocked($email)) {
            return back()->withErrors([
                'email' => 'Account temporarily locked due to multiple failed attempts. Please try again in 15 minutes.',
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

            // Store auth token in session
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

            // Step 3 — log in and redirect based on role
            $this->clearAttempts($email);
            $this->logAccess($email, true, $request);
            Auth::loginUsingId($user->id);

            return match ($user->role) {
                'vp'    => redirect()->route('jl.vp'),
                default => redirect()->route('jl.reviewer'), // reviewer + admin
            };

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

    // ── Helpers ──────────────────────────────────────────────────────────────

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
