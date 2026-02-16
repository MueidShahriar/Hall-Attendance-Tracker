// Service Worker for Hall Attendance Tracker PWA
const CACHE_NAME = 'hall-tracker-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/auth.html',
    '/styles.css',
    '/app.js',
    '/auth.js',
    '/css/base.css',
    '/css/components.css',
    '/css/layout.css',
    '/css/responsive.css',
    '/css/utilities.css',
    '/css/auth.css',
    '/images/hall.png',
    '/manifest.json'
];

// Install - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Fetch - network first, fallback to cache for app shell
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip Firebase and external API requests - always go to network
    if (
        url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('firebase') ||
        url.hostname.includes('cdn.tailwindcss.com') ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com')
    ) {
        event.respondWith(fetch(request));
        return;
    }

    // For navigation requests - network first, cache fallback
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseClone);
                    });
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // For static assets - cache first, network fallback
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // Update cache in background
                fetch(request).then((networkResponse) => {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, networkResponse);
                    });
                }).catch(() => {});
                return cachedResponse;
            }
            return fetch(request).then((response) => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseClone);
                });
                return response;
            });
        })
    );
});

// Handle push notifications from FCM
self.addEventListener('push', (event) => {
    let data = { title: 'Hall Attendance', body: 'New notification' };
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }
    const options = {
        body: data.body || data.notification?.body || 'New update',
        icon: '/images/hall.png',
        badge: '/images/hall.png',
        vibrate: [100, 50, 100],
        data: { url: data.click_action || '/' },
        actions: [
            { action: 'open', title: 'Open App' },
            { action: 'close', title: 'Dismiss' }
        ]
    };
    event.waitUntil(
        self.registration.showNotification(
            data.title || data.notification?.title || 'Hall Attendance Tracker',
            options
        )
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'close') return;
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('/index.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data?.url || '/');
            }
        })
    );
});
