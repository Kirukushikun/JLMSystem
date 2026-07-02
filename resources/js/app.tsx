import { createInertiaApp } from '@inertiajs/react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// @ts-expect-error — Pusher must be on window for Laravel Echo
window.Pusher = Pusher;

window.Echo = new Echo({
    broadcaster:        'reverb',
    key:                import.meta.env.VITE_REVERB_APP_KEY,
    wsHost:             import.meta.env.VITE_REVERB_HOST,
    wsPort:             import.meta.env.VITE_REVERB_PORT ?? 80,
    wssPort:            import.meta.env.VITE_REVERB_PORT ?? 443,
    forceTLS:           (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
    enabledTransports:  ['ws', 'wss'],
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    progress: {
        color: '#4B5563',
    },
});
