# Real-Time Notifications Implementation Guide

This document covers the full implementation of the two-layer notification system used in this project:

1. **In-app bell** — real-time WebSocket notifications via Laravel Reverb + Laravel Echo (works while the browser tab is open)
2. **OS push notifications** — Firebase Cloud Messaging (FCM) web push (works even when the tab is closed, as long as the browser is running)

---

## Architecture Overview

```
Workflow action (submit/review/approve/etc.)
        │
        ├── Laravel Notification (database + broadcast)
        │       │
        │       ├── Saved to notifications table → shown in bell dropdown
        │       └── Broadcast via Reverb WebSocket → bell updates live (no refresh)
        │
        └── FCM Push (via Google FCM HTTP v1 API)
                │
                └── OS-level notification → appears even when tab is closed
```

---

## Part 1 — Laravel Reverb (In-App Bell)

### Step 1: Install Reverb

```bash
composer require laravel/reverb
php artisan reverb:install
```

`reverb:install` does several things automatically:
- Publishes `config/reverb.php`
- Adds `REVERB_*` keys to your `.env`
- Sets `BROADCAST_CONNECTION=reverb` in `.env`

### Step 2: Register the channels route

In `bootstrap/app.php`, add the `channels` key to `withRouting()`:

```php
->withRouting(
    web:      __DIR__.'/../routes/web.php',
    channels: __DIR__.'/../routes/channels.php',  // add this
    commands: __DIR__.'/../routes/console.php',
    health:   '/up',
)
```

> Do NOT call `->withBroadcasting()` — in Laravel 13 that method requires arguments and conflicts with the `channels:` key above.

### Step 3: Create `routes/channels.php`

```php
<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});
```

This authorizes each user to subscribe only to their own private channel.

### Step 4: Create the notifications table

```bash
php artisan make:notifications-table
php artisan migrate
```

### Step 5: Create the Notification class

```bash
php artisan make:notification JlNotification
```

```php
<?php

namespace App\Notifications;

use App\Models\JlEntry;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\BroadcastMessage;

class JlNotification extends Notification
{
    use Queueable;

    public function __construct(
        public readonly JlEntry $entry,
        public readonly string  $event,
        public readonly string  $title,
        public readonly string  $body,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'entry_id'  => $this->entry->id,
            'reference' => $this->entry->reference,
            'event'     => $this->event,
            'title'     => $this->title,
            'body'      => $this->body,
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'entry_id'  => $this->entry->id,
            'reference' => $this->entry->reference,
            'event'     => $this->event,
            'title'     => $this->title,
            'body'      => $this->body,
        ]);
    }
}
```

### Step 6: Install Laravel Echo + pusher-js

```bash
npm install laravel-echo pusher-js
```

### Step 7: Initialize Echo in `resources/js/app.tsx`

```tsx
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster:       'reverb',
    key:               import.meta.env.VITE_REVERB_APP_KEY,
    wsHost:            import.meta.env.VITE_REVERB_HOST,
    wsPort:            import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort:           import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS:          (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports: ['ws', 'wss'],
});
```

### Step 8: Add CSRF meta tag to `resources/views/app.blade.php`

Laravel Echo needs this for channel authorization:

```html
<head>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    ...
</head>
```

### Step 9: Add notification API routes to `routes/web.php`

```php
Route::middleware('auth')->group(function () {
    Route::get('/notifications',               [JlController::class, 'notifications']);
    Route::post('/notifications/read-all',     [JlController::class, 'markAllRead']);
    Route::post('/notifications/{id}/read',    [JlController::class, 'markRead']);
});
```

### Step 10: Add notification methods to the controller

```php
public function notifications(): JsonResponse
{
    $user = auth()->user();
    return response()->json([
        'notifications' => $user->notifications()->latest()->take(20)->get(),
        'unread_count'  => $user->unreadNotifications()->count(),
    ]);
}

public function markRead(string $id): JsonResponse
{
    auth()->user()->notifications()->where('id', $id)->first()?->markAsRead();
    return response()->json(['ok' => true]);
}

public function markAllRead(): JsonResponse
{
    auth()->user()->unreadNotifications()->update(['read_at' => now()]);
    return response()->json(['ok' => true]);
}
```

### Step 11: Create the NotificationBell component

The bell subscribes to the user's private channel on mount:

```tsx
useEffect(() => {
    // Load initial notifications from DB
    fetch('/notifications')
        .then(r => r.json())
        .then(data => {
            setNotifications(data.notifications);
            setUnreadCount(data.unread_count);
        });

    // Subscribe to live WebSocket updates
    const channel = window.Echo.private(`App.Models.User.${user.id}`);
    channel.notification((notif: any) => {
        // WebSocket payload is FLAT; DB notifications have nested `data` object
        // Always normalize to the nested format
        const normalized = {
            id:         notif.id ?? crypto.randomUUID(),
            read_at:    null,
            created_at: notif.created_at ?? new Date().toISOString(),
            data: {
                entry_id:  notif.data?.entry_id  ?? notif.entry_id,
                reference: notif.data?.reference ?? notif.reference,
                event:     notif.data?.event     ?? notif.event,
                title:     notif.data?.title     ?? notif.title,
                body:      notif.data?.body      ?? notif.body,
            },
        };
        setNotifications(prev => [normalized, ...prev]);
        setUnreadCount(c => c + 1);
    });

    return () => { window.Echo.leave(`App.Models.User.${user.id}`); };
}, [user.id]);
```

> **Important:** WebSocket notifications arrive with fields at the top level (flat). DB notifications wrap them inside a `data` object. Always normalize incoming WebSocket payloads or the component will crash trying to access `notif.data.title` on a flat object.

### Step 12: Add `notifyRoles()` helper to the controller

```php
private function notifyRoles(array $roles, JlEntry $entry, string $event, string $title, string $body): void
{
    $users = User::whereIn('role', $roles)->get();
    if ($users->isNotEmpty()) {
        Notification::send($users, new JlNotification($entry, $event, $title, $body));
    }
}
```

Call this at every workflow transition:

```php
// On submit
$this->notifyRoles(['reviewer', 'admin'], $entry, 'submitted', 'New JL Form Submitted', '...');

// On review
$this->notifyRoles(['vp', 'admin'], $entry, 'reviewed', 'JL Form Ready for VP Approval', '...');

// etc.
```

### Step 13: Running Reverb locally

```bash
php artisan reverb:start
```

Reverb must be running as a separate process alongside `php artisan serve` and `npm run dev`.

### Local `.env` values

```env
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=your_id
REVERB_APP_KEY=your_key
REVERB_APP_SECRET=your_secret
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http

VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"
```

---

## Part 2 — Firebase Cloud Messaging (OS Push Notifications)

### Why FCM on top of Reverb?

Reverb WebSocket only works while the browser tab is open. FCM delivers OS-level push notifications via Google's servers — the notification appears even when the tab is closed, as long as the browser is running in the background.

> **HTTPS requirement:** FCM web push and service workers require HTTPS. You cannot test FCM on `http://yourcustomdomain.test`. It only works on `localhost` (the literal hostname) or any HTTPS domain. Test on production or enable SSL in your local dev environment.

### Step 1: Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → give it a name → Continue
3. Disable Google Analytics (optional) → Create project

### Step 2: Get backend credentials (Service Account)

1. In Firebase Console → **Project Settings** (gear icon) → **Service Accounts** tab
2. Click **Generate new private key** → Download the JSON file
3. Open the JSON and copy these three values into your `.env`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

> The private key uses literal `\n` in the JSON. Paste it as-is inside double quotes in `.env`. The app replaces `\n` → actual newlines via `str_replace('\\n', "\n", env('FIREBASE_PRIVATE_KEY'))` in `config/services.php`.

### Step 3: Get frontend credentials (Web App)

1. Firebase Console → **Project Settings** → **General** tab
2. Scroll down to **Your apps** → click **Add app** → choose **Web** (`</>`)
3. Register the app → copy the config object values:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Step 4: Get the VAPID key

1. Firebase Console → **Project Settings** → **Cloud Messaging** tab
2. Scroll to **Web Push certificates** → click **Generate key pair**
3. Copy the key:

```env
VITE_FIREBASE_VAPID_KEY=
```

### Step 5: Install the Firebase npm package

```bash
npm install firebase
```

### Step 6: Create `resources/js/firebase.ts`

```typescript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const app = initializeApp({
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
});

export const messaging = getMessaging(app);

export async function registerFcmToken(): Promise<void> {
    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        const token = await getToken(messaging, {
            vapidKey:                  import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: swReg,
        });

        if (!token) return;

        await fetch('/fcm-token', {
            method:  'POST',
            headers: {
                'Content-Type':     'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN':     document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
            },
            body: JSON.stringify({ token }),
        });
    } catch {
        // Silently ignore: permission denied or unsupported browser
    }
}

export function listenForeground(callback: (title: string, body: string) => void): void {
    onMessage(messaging, (payload) => {
        const title = payload.notification?.title ?? payload.data?.['title'] ?? 'Notification';
        const body  = payload.notification?.body  ?? payload.data?.['body']  ?? '';
        callback(title, body);
    });
}
```

### Step 7: Create `public/firebase-messaging-sw.js`

This file **must be at the web root** (`/firebase-messaging-sw.js`) and uses hardcoded credentials because service workers cannot access Vite env variables.

```javascript
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey:            'YOUR_API_KEY',
    authDomain:        'YOUR_PROJECT.firebaseapp.com',
    projectId:         'YOUR_PROJECT_ID',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId:             'YOUR_APP_ID',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title ?? payload.data?.title ?? 'Notification';
    const body  = payload.notification?.body  ?? payload.data?.body  ?? '';

    self.registration.showNotification(title, {
        body,
        icon:  '/favicon.ico',
        badge: '/favicon.ico',
        tag:   payload.data?.entry_id ?? 'notification',
        data:  payload.data ?? {},
    });
});
```

### Step 8: Create the FCM tokens migration

```bash
php artisan make:migration create_fcm_tokens_table
```

```php
Schema::create('fcm_tokens', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('token')->unique();
    $table->timestamps();
});
```

```bash
php artisan migrate
```

### Step 9: Create `app/Models/FcmToken.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FcmToken extends Model
{
    protected $fillable = ['user_id', 'token'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

### Step 10: Add FCM token storage route and controller method

`routes/web.php`:
```php
Route::middleware('auth')->group(function () {
    Route::post('/fcm-token', [JlController::class, 'storeFcmToken']);
});
```

`JlController.php`:
```php
public function storeFcmToken(Request $request): JsonResponse
{
    $request->validate(['token' => 'required|string']);

    FcmToken::updateOrCreate(
        ['token'   => $request->token],
        ['user_id' => auth()->id()],
    );

    return response()->json(['ok' => true]);
}
```

### Step 11: Add FCM config to `config/services.php`

```php
'firebase' => [
    'project_id'   => env('FIREBASE_PROJECT_ID'),
    'client_email' => env('FIREBASE_CLIENT_EMAIL'),
    'private_key'  => str_replace('\\n', "\n", env('FIREBASE_PRIVATE_KEY', '')),
],
```

### Step 12: Add `sendFcmToRoles()` to the controller

This uses a raw JWT + Google OAuth token to call the FCM v1 HTTP API — no extra PHP package needed:

```php
private function sendFcmToRoles(array $roles, string $title, string $body): void
{
    $userIds = User::whereIn('role', $roles)->pluck('id');
    $tokens  = FcmToken::whereIn('user_id', $userIds)->pluck('token')->toArray();

    if (empty($tokens)) return;

    $projectId   = config('services.firebase.project_id');
    $clientEmail = config('services.firebase.client_email');
    $privateKey  = config('services.firebase.private_key');

    if (! $projectId || ! $clientEmail || ! $privateKey) return;

    try {
        $accessToken = $this->getFcmAccessToken($clientEmail, $privateKey);

        // FCM v1 API only accepts ONE token per request — 'token' is singular
        // Using 'tokens' (plural) silently returns 400 and no push is delivered
        foreach ($tokens as $token) {
            Http::withToken($accessToken)
                ->post("https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send", [
                    'message' => [
                        'token'        => $token,
                        'notification' => ['title' => $title, 'body' => $body],
                    ],
                ]);
        }
    } catch (\Throwable) {
        // FCM is best-effort — never block the main workflow
    }
}

private function getFcmAccessToken(string $clientEmail, string $privateKey): string
{
    $now    = time();
    $header = base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $claim  = base64_encode(json_encode([
        'iss'   => $clientEmail,
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        'aud'   => 'https://oauth2.googleapis.com/token',
        'iat'   => $now,
        'exp'   => $now + 3600,
    ]));

    $unsigned = $header . '.' . $claim;
    openssl_sign($unsigned, $signature, $privateKey, OPENSSL_ALGO_SHA256);
    $jwt = $unsigned . '.' . base64_encode($signature);

    $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion'  => $jwt,
    ]);

    return $response->json('access_token');
}
```

Then call it inside `notifyRoles()`:

```php
private function notifyRoles(array $roles, JlEntry $entry, string $event, string $title, string $body): void
{
    $users = User::whereIn('role', $roles)->get();
    if ($users->isNotEmpty()) {
        Notification::send($users, new JlNotification($entry, $event, $title, $body));
    }

    $this->sendFcmToRoles($roles, $title, $body);
}
```

### Step 13: Register FCM token and handle foreground messages in `AppLayout.tsx`

```tsx
import { useEffect, useRef, useState } from 'react';
import { registerFcmToken, listenForeground } from '@/firebase';

// Inside the component:
const [toast, setToast] = useState<{ title: string; body: string } | null>(null);
const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
    if (!user) return;

    registerFcmToken(); // requests permission + saves token to backend

    listenForeground((title, body) => {
        setToast({ title, body });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 5000);
    });
}, [user?.id]);

// In the JSX, render the toast:
{toast && (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg bg-[#1e3a5f] px-5 py-3.5 shadow-xl text-white">
        <p className="text-sm font-semibold">{toast.title}</p>
        <p className="mt-0.5 text-xs text-white/80">{toast.body}</p>
    </div>
)}
```

---

## Testing Checklist

| Test | Expected result |
|------|----------------|
| Submit a form while logged in as reviewer in another tab | Bell red dot increments live |
| Click the bell | Dropdown shows the notification |
| Click a notification | Marked as read |
| Click Mark all read | All cleared |
| Submit a form with browser tab closed (Chrome still open) | OS desktop notification appears |
| Submit a form on Android Chrome (HTTPS site) | Android status bar notification appears |

---

## Known Limitations

- FCM web push **requires HTTPS**. Testing on `http://yourcustomdomain.test` will silently fail — no tokens are registered, no push is sent. Use `localhost` (exempt from HTTPS requirement) or deploy to production.
- If Chrome is completely quit (no background process), no push is delivered until the browser is reopened.
- iOS Safari requires the site to be installed as a PWA (Add to Home Screen) before web push works.
- Chrome may block the notification permission prompt after a user dismisses it multiple times. Reset via the tune icon (⊕) in the URL bar → Site settings → Notifications → Reset.
