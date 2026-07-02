importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey:            'AIzaSyDpjD4t2rQwMYW1jhYJ_7kdub7p6-8PRJI',
    authDomain:        'brookside-projects-2026.firebaseapp.com',
    projectId:         'brookside-projects-2026',
    messagingSenderId: '234013375326',
    appId:             '1:234013375326:web:87f45828518e9fda516dcf',
});

const messaging = firebase.messaging();

// Handle background push notifications (browser minimized / tab closed)
messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title ?? payload.data?.title ?? 'JL Monitoring';
    const body  = payload.notification?.body  ?? payload.data?.body  ?? '';

    self.registration.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: payload.data?.entry_id ?? 'jlm',
        data: payload.data ?? {},
    });
});