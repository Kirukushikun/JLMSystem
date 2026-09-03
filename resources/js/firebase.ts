import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import type { Messaging } from 'firebase/messaging';

// No project ID means Firebase isn't set up yet (e.g. a fresh staging box) —
// skip initializing the SDK entirely rather than let it throw on every page
// load. Both exported functions become safe no-ops when this is null.
let messaging: Messaging | null = null;

if (import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    const app = initializeApp({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
    messaging = getMessaging(app);
}

export async function registerFcmToken(): Promise<void> {
    if (!messaging) {
        return;
    }

    try {
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            return;
        }

        const token = await getToken(messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: await navigator.serviceWorker.register(
                '/firebase-messaging-sw.js',
            ),
        });

        if (!token) {
            return;
        }

        await fetch('/fcm-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN':
                    document.querySelector<HTMLMetaElement>(
                        'meta[name="csrf-token"]',
                    )?.content ?? '',
            },
            body: JSON.stringify({ token }),
        });
    } catch {
        // Notification permission denied or browser unsupported — silently ignore
    }
}

// Handle foreground messages (tab is open and focused)
export function listenForeground(
    callback: (title: string, body: string) => void,
): void {
    if (!messaging) {
        return;
    }

    onMessage(messaging, (payload) => {
        const title =
            payload.notification?.title ??
            payload.data?.['title'] ??
            'JL Monitoring';
        const body = payload.notification?.body ?? payload.data?.['body'] ?? '';
        callback(title, body);
    });
}
